import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { PluginLifecycleService } from '@/lib/plugins/PluginLifecycleService';
import type { InstalledPlugin, PluginCapabilityId } from '@/types/plugins';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const INSTALLED_PLUGINS_COLLECTION = 'installed_plugins';
const MIGRATION_LOG_COLLECTION = 'migration_log';
const SOURCE_PLUGIN_ID = 'pack_hse';
const TARGET_PLUGIN_IDS: PluginCapabilityId[] = [
  'iso_environment_14001',
  'iso_sst_45001',
  'ptw_seguridad',
];
const MIGRATION_KEY = 'hse_bundle_backfill_from_pack_hse_v1';

type PluginChange = {
  plugin_id: PluginCapabilityId;
  installed: boolean;
  enabled: boolean;
};

function isPluginActive(plugin: InstalledPlugin | null): boolean {
  return Boolean(plugin && plugin.lifecycle !== 'removed');
}

function shouldEnableFromBundle(plugin: InstalledPlugin): boolean {
  return plugin.enabled && plugin.lifecycle === 'enabled';
}

async function ensurePluginBackfill(params: {
  organizationId: string;
  pluginId: PluginCapabilityId;
  userId: string;
  enableAfterInstall: boolean;
}): Promise<PluginChange | null> {
  const current = await PluginLifecycleService.getInstalledPlugin(
    params.organizationId,
    params.pluginId
  );

  let installed = false;
  let enabled = false;

  if (!isPluginActive(current)) {
    await PluginLifecycleService.installPlugin({
      organizationId: params.organizationId,
      pluginId: params.pluginId,
      userId: params.userId,
    });
    installed = true;
  }

  const latest = installed
    ? await PluginLifecycleService.getInstalledPlugin(
        params.organizationId,
        params.pluginId
      )
    : current;

  if (
    params.enableAfterInstall &&
    latest &&
    (!latest.enabled || latest.lifecycle !== 'enabled')
  ) {
    await PluginLifecycleService.enablePlugin({
      organizationId: params.organizationId,
      pluginId: params.pluginId,
      userId: params.userId,
    });
    enabled = true;
  }

  if (!installed && !enabled) {
    return null;
  }

  return {
    plugin_id: params.pluginId,
    installed,
    enabled,
  };
}

export const POST = withAuth(async (_request, _context, auth) => {
  try {
    const db = getAdminFirestore();
    const packHseSnapshot = await db
      .collectionGroup(INSTALLED_PLUGINS_COLLECTION)
      .where('plugin_id', '==', SOURCE_PLUGIN_ID)
      .get();

    const organizations = packHseSnapshot.docs
      .map(doc => {
        const organizationId = doc.ref.parent.parent?.id;
        if (!organizationId) return null;

        const data = doc.data();
        const lifecycle =
          typeof data.lifecycle === 'string' ? data.lifecycle : 'installed';

        if (lifecycle === 'removed') {
          return null;
        }

        return organizationId;
      })
      .filter((organizationId): organizationId is string => Boolean(organizationId));

    const uniqueOrganizationIds = [...new Set(organizations)];
    const results: Array<{
      organization_id: string;
      outcome: 'migrated' | 'already_compliant' | 'failed';
      changes: PluginChange[];
      error?: string;
    }> = [];

    for (const organizationId of uniqueOrganizationIds) {
      try {
        const sourcePlugin = await PluginLifecycleService.getInstalledPlugin(
          organizationId,
          SOURCE_PLUGIN_ID
        );

        if (!sourcePlugin || sourcePlugin.lifecycle === 'removed') {
          results.push({
            organization_id: organizationId,
            outcome: 'already_compliant',
            changes: [],
          });
          continue;
        }

        const enableAfterInstall = shouldEnableFromBundle(sourcePlugin);
        const changes: PluginChange[] = [];

        for (const pluginId of TARGET_PLUGIN_IDS) {
          const change = await ensurePluginBackfill({
            organizationId,
            pluginId,
            userId: auth.uid,
            enableAfterInstall,
          });

          if (change) {
            changes.push(change);
          }
        }

        if (changes.length > 0) {
          await db
            .collection('organizations')
            .doc(organizationId)
            .collection(MIGRATION_LOG_COLLECTION)
            .add({
              migration_key: MIGRATION_KEY,
              organization_id: organizationId,
              source_plugin_id: SOURCE_PLUGIN_ID,
              source_plugin_enabled: sourcePlugin.enabled,
              source_plugin_lifecycle: sourcePlugin.lifecycle,
              plugins_added: changes
                .filter(change => change.installed)
                .map(change => change.plugin_id),
              plugins_enabled: changes
                .filter(change => change.enabled)
                .map(change => change.plugin_id),
              changes,
              migrated_by: auth.uid,
              migrated_at: Timestamp.now(),
            });
        }

        results.push({
          organization_id: organizationId,
          outcome: changes.length > 0 ? 'migrated' : 'already_compliant',
          changes,
        });
      } catch (error) {
        results.push({
          organization_id: organizationId,
          outcome: 'failed',
          changes: [],
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        migration_key: MIGRATION_KEY,
        source_plugin_id: SOURCE_PLUGIN_ID,
        target_plugin_ids: TARGET_PLUGIN_IDS,
        totals: {
          scanned: uniqueOrganizationIds.length,
          migrated: results.filter(result => result.outcome === 'migrated').length,
          already_compliant: results.filter(
            result => result.outcome === 'already_compliant'
          ).length,
          failed: results.filter(result => result.outcome === 'failed').length,
        },
        results,
      },
    });
  } catch (error) {
    console.error('[super-admin/migrations/hse-bundle][POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo ejecutar la migracion de pack_hse',
      },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
