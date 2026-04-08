import {
  createPluginManifestFromCapability,
  PLATFORM_PLUGIN_MANIFESTS,
} from '@/config/plugins';
import { ensureCrmAccountingRules } from '@/lib/accounting/rules/crmRules';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';
import type { InstalledPlugin, PluginManifest } from '@/types/plugins';
import { Timestamp } from 'firebase-admin/firestore';

const PLATFORM_PLUGINS_COLLECTION = 'platform_plugins';
const INSTALLED_PLUGINS_COLLECTION = 'installed_plugins';
const LEGACY_CAPABILITIES_COLLECTION = 'capabilities';

function timestampToDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function normalizeInstalledPlugin(
  pluginId: string,
  organizationId: string,
  data: Record<string, unknown>
): InstalledPlugin {
  const billingData =
    data.billing && typeof data.billing === 'object'
      ? (data.billing as Record<string, unknown>)
      : {};
  const healthData =
    data.health && typeof data.health === 'object'
      ? (data.health as Record<string, unknown>)
      : {};
  const auditData =
    data.audit_summary && typeof data.audit_summary === 'object'
      ? (data.audit_summary as Record<string, unknown>)
      : {};

  return {
    plugin_id: pluginId,
    organization_id: organizationId,
    version_installed: String(data.version_installed || '1.0.0'),
    lifecycle: (data.lifecycle || 'installed') as InstalledPlugin['lifecycle'],
    enabled: Boolean(data.enabled),
    settings_effective:
      data.settings_effective && typeof data.settings_effective === 'object'
        ? (data.settings_effective as Record<string, unknown>)
        : {},
    approved_overrides:
      data.approved_overrides && typeof data.approved_overrides === 'object'
        ? (data.approved_overrides as Record<string, unknown>)
        : undefined,
    billing: {
      status: (billingData.status || 'active') as InstalledPlugin['billing']['status'],
      current_plan:
        typeof billingData.current_plan === 'string'
          ? billingData.current_plan
          : undefined,
      usage_snapshot:
        billingData.usage_snapshot &&
        typeof billingData.usage_snapshot === 'object'
          ? (billingData.usage_snapshot as Record<string, number>)
          : {},
      last_billed_at: billingData.last_billed_at
        ? timestampToDate(billingData.last_billed_at)
        : null,
    },
    health: {
      status: (healthData.status || 'healthy') as InstalledPlugin['health']['status'],
      checks: Array.isArray(healthData.checks)
        ? (healthData.checks as InstalledPlugin['health']['checks'])
        : [],
      last_checked_at: healthData.last_checked_at
        ? timestampToDate(healthData.last_checked_at)
        : null,
    },
    audit_summary: {
      last_event_at: auditData.last_event_at
        ? timestampToDate(auditData.last_event_at)
        : null,
      last_event_by:
        typeof auditData.last_event_by === 'string' ? auditData.last_event_by : null,
      writes_last_24h:
        typeof auditData.writes_last_24h === 'number'
          ? auditData.writes_last_24h
          : 0,
      pending_approvals:
        typeof auditData.pending_approvals === 'number'
          ? auditData.pending_approvals
          : 0,
    },
    install_blockers: Array.isArray(data.install_blockers)
      ? (data.install_blockers as string[])
      : [],
    pending_jobs: Array.isArray(data.pending_jobs)
      ? (data.pending_jobs as string[])
      : [],
    installed_by: String(data.installed_by || ''),
    installed_at: timestampToDate(data.installed_at),
    updated_at: timestampToDate(data.updated_at),
    enabled_at: data.enabled_at ? timestampToDate(data.enabled_at) : null,
    disabled_at: data.disabled_at ? timestampToDate(data.disabled_at) : null,
    removed_at: data.removed_at ? timestampToDate(data.removed_at) : null,
  };
}

function validateSettingType(
  value: unknown,
  expectedType: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object'
): boolean {
  if (expectedType === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (expectedType === 'array') return Array.isArray(value);
  if (expectedType === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value);
  return typeof value === expectedType;
}

async function runPluginProvisioning(params: {
  organizationId: string;
  pluginId: string;
  userId: string;
}) {
  if (params.pluginId === 'crm') {
    await ensureCrmAccountingRules({
      organizationId: params.organizationId,
      userId: params.userId,
    });
  }
}

export class PluginLifecycleService {
  static async autoInstallEditionPlugins(
    orgId: string,
    edition: 'government' | 'enterprise'
  ): Promise<void> {
    if (edition === 'enterprise') {
      console.info(
        '[PluginLifecycleService] Edition enterprise has no automatic plugins',
        { orgId, edition }
      );
      return;
    }

    const db = getAdminFirestore();
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    const orgData = orgDoc.data() || {};
    const userId =
      (typeof orgData.owner_user_id === 'string' && orgData.owner_user_id) ||
      (typeof orgData.onboarding_owner_user_id === 'string' &&
        orgData.onboarding_owner_user_id) ||
      'system';

    try {
      await this.installPlugin({
        organizationId: orgId,
        pluginId: 'pack_gov',
        userId,
      });
      console.info('[PluginLifecycleService] Auto-installed edition plugins', {
        orgId,
        edition,
        pluginId: 'pack_gov',
      });
    } catch (error) {
      console.info(
        '[PluginLifecycleService] Auto-install edition plugins skipped/failed',
        {
          orgId,
          edition,
          pluginId: 'pack_gov',
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }

  private static async persistInstalledPlugin(params: {
    organizationId: string;
    pluginId: string;
    userId: string;
    manifest: PluginManifest;
    effectiveSettings: Record<string, unknown>;
    enabled: boolean;
  }): Promise<void> {
    const db = getAdminFirestore();
    const now = Timestamp.now();
    const legacyCapability = await CapabilityService.getPlatformCapability(params.pluginId);

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(INSTALLED_PLUGINS_COLLECTION)
      .doc(params.pluginId)
      .set(
        {
          plugin_id: params.pluginId,
          organization_id: params.organizationId,
          version_installed: params.manifest.versioning.plugin_version,
          lifecycle: params.enabled ? 'enabled' : 'installed',
          enabled: params.enabled,
          settings_effective: params.effectiveSettings,
          approved_overrides: {},
          billing: {
            status: 'active',
            current_plan: params.manifest.billing.price_code,
            usage_snapshot: {},
            last_billed_at: null,
          },
          health: {
            status: 'healthy',
            checks: [],
            last_checked_at: now,
          },
          audit_summary: {
            last_event_at: now,
            last_event_by: params.userId,
            writes_last_24h: 0,
            pending_approvals: 0,
          },
          install_blockers: [],
          pending_jobs: [],
          installed_by: params.userId,
          installed_at: now,
          updated_at: now,
          enabled_at: params.enabled ? now : null,
          disabled_at: params.enabled ? null : now,
          removed_at: null,
        },
        { merge: true }
      );

    if (legacyCapability) {
      await CapabilityService.installCapability({
        organizationId: params.organizationId,
        capabilityId: params.pluginId,
        systemId: legacyCapability.manifest.system_id || 'iso9001',
        userId: params.userId,
        enabled: params.enabled,
        settings: params.effectiveSettings,
      });
    }

    if (!legacyCapability && params.manifest.type === 'bundle') {
      return;
    }

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(LEGACY_CAPABILITIES_COLLECTION)
      .doc(params.pluginId)
      .set(
        {
          plugin_id: params.pluginId,
          capability_id: params.pluginId,
          organization_id: params.organizationId,
          enabled: params.enabled,
          status: params.enabled ? 'enabled' : 'installed',
          settings: params.effectiveSettings,
          settings_effective: params.effectiveSettings,
          version_installed: params.manifest.versioning.plugin_version,
          updated_at: now,
          installed_at: now,
          installed_by: params.userId,
          enabled_at: params.enabled ? now : null,
          disabled_at: params.enabled ? null : now,
        },
        { merge: true }
      );
  }

  private static async installBundle(params: {
    organizationId: string;
    pluginId: string;
    userId: string;
    manifest: PluginManifest;
    settings?: Record<string, unknown>;
  }): Promise<InstalledPlugin> {
    await this.validateCompatibility({
      organizationId: params.organizationId,
      manifest: params.manifest,
    });

    const effectiveSettings = {
      ...params.manifest.tenant_settings.defaults,
      ...(params.settings || {}),
    };
    this.validateSettings(params.manifest, effectiveSettings);

    const bundlePluginIds = params.manifest.bundle_plugins || [];
    for (const bundledPluginId of bundlePluginIds) {
      const bundledManifest = await this.getCatalogManifest(bundledPluginId);
      if (!bundledManifest) {
        throw new Error(`Plugin "${bundledPluginId}" not found`);
      }

      const installedPlugin = await this.getInstalledPlugin(
        params.organizationId,
        bundledPluginId
      );

      if (!installedPlugin || installedPlugin.lifecycle === 'removed') {
        await this.installPlugin({
          organizationId: params.organizationId,
          pluginId: bundledPluginId,
          userId: params.userId,
        });
      }

      const refreshedPlugin = await this.getInstalledPlugin(
        params.organizationId,
        bundledPluginId
      );
      if (refreshedPlugin && !refreshedPlugin.enabled) {
        await this.enablePlugin({
          organizationId: params.organizationId,
          pluginId: bundledPluginId,
          userId: params.userId,
        });
      }
    }

    await this.persistInstalledPlugin({
      organizationId: params.organizationId,
      pluginId: params.pluginId,
      userId: params.userId,
      manifest: params.manifest,
      effectiveSettings,
      enabled: true,
    });

    const installed = await this.getInstalledPlugin(params.organizationId, params.pluginId);
    if (!installed) {
      throw new Error('Failed to install plugin');
    }

    return installed;
  }

  static async listCatalogManifests(): Promise<PluginManifest[]> {
    if (PLATFORM_PLUGIN_MANIFESTS.length > 0) {
      return PLATFORM_PLUGIN_MANIFESTS;
    }

    const capabilities = await CapabilityService.getPlatformCapabilities();
    return capabilities.map(createPluginManifestFromCapability);
  }

  static async getCatalogManifest(pluginId: string): Promise<PluginManifest | null> {
    const fromConfig = PLATFORM_PLUGIN_MANIFESTS.find(
      manifest => manifest.identity.plugin_id === pluginId
    );
    if (fromConfig) return fromConfig;

    const db = getAdminFirestore();
    const stored = await db
      .collection(PLATFORM_PLUGINS_COLLECTION)
      .doc(pluginId)
      .get();

    if (stored.exists) {
      return pluginManifestSchema.parse(stored.data());
    }

    const legacy = await CapabilityService.getPlatformCapability(pluginId);
    return legacy ? createPluginManifestFromCapability(legacy) : null;
  }

  static async seedCatalog(): Promise<PluginManifest[]> {
    const db = getAdminFirestore();
    const manifests = await this.listCatalogManifests();
    const batch = db.batch();
    const now = Timestamp.now();

    for (const manifest of manifests) {
      batch.set(
        db.collection(PLATFORM_PLUGINS_COLLECTION).doc(manifest.identity.plugin_id),
        {
          ...manifest,
          created_at: now,
          updated_at: now,
        },
        { merge: true }
      );
    }

    await batch.commit();
    return manifests;
  }

  static async listInstalledPlugins(
    organizationId: string
  ): Promise<InstalledPlugin[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('organizations')
      .doc(organizationId)
      .collection(INSTALLED_PLUGINS_COLLECTION)
      .get();

    return snapshot.docs.map(doc =>
      normalizeInstalledPlugin(doc.id, organizationId, doc.data() || {})
    );
  }

  static async getInstalledPlugin(
    organizationId: string,
    pluginId: string
  ): Promise<InstalledPlugin | null> {
    const db = getAdminFirestore();
    const doc = await db
      .collection('organizations')
      .doc(organizationId)
      .collection(INSTALLED_PLUGINS_COLLECTION)
      .doc(pluginId)
      .get();

    if (!doc.exists) return null;
    return normalizeInstalledPlugin(pluginId, organizationId, doc.data() || {});
  }

  static validateSettings(
    manifest: PluginManifest,
    settings: Record<string, unknown>
  ): void {
    const schema = manifest.tenant_settings.schema || {};

    for (const [key, value] of Object.entries(settings)) {
      const field = schema[key];
      if (!field) {
        throw new Error(`Invalid plugin setting: ${key}`);
      }

      if (!validateSettingType(value, field.type)) {
        throw new Error(`Invalid type for plugin setting "${key}"`);
      }
    }
  }

  static async validateCompatibility(params: {
    organizationId: string;
    manifest: PluginManifest;
  }): Promise<void> {
    const installedPlugins = await this.listInstalledPlugins(params.organizationId);
    const installedPluginIds = new Set(
      installedPlugins
        .filter(plugin => plugin.lifecycle !== 'removed')
        .map(plugin => plugin.plugin_id)
    );

    const blocking = params.manifest.compatibility.incompatible_plugins.filter(
      pluginId => installedPluginIds.has(pluginId)
    );

    if (blocking.length > 0) {
      throw new Error(`Incompatible plugins installed: ${blocking.join(', ')}`);
    }

    const required = params.manifest.compatibility.required_capabilities;
    for (const capabilityId of required) {
      if (!installedPluginIds.has(capabilityId)) {
        throw new Error(`Missing required capabilities: ${capabilityId}`);
      }
    }
  }

  static async installPlugin(params: {
    organizationId: string;
    pluginId: string;
    userId: string;
    settings?: Record<string, unknown>;
  }): Promise<InstalledPlugin> {
    const manifest = await this.getCatalogManifest(params.pluginId);
    if (!manifest) {
      throw new Error(`Plugin "${params.pluginId}" not found`);
    }

    const current = await this.getInstalledPlugin(params.organizationId, params.pluginId);
    if (current && current.lifecycle !== 'removed') {
      throw new Error('Plugin already installed');
    }

    if (manifest.type === 'bundle') {
      return this.installBundle({
        organizationId: params.organizationId,
        pluginId: params.pluginId,
        userId: params.userId,
        manifest,
        settings: params.settings,
      });
    }

    await this.validateCompatibility({
      organizationId: params.organizationId,
      manifest,
    });

    const effectiveSettings = {
      ...manifest.tenant_settings.defaults,
      ...(params.settings || {}),
    };
    this.validateSettings(manifest, effectiveSettings);

    await this.persistInstalledPlugin({
      organizationId: params.organizationId,
      pluginId: params.pluginId,
      userId: params.userId,
      manifest,
      effectiveSettings,
      enabled: false,
    });

    await runPluginProvisioning({
      organizationId: params.organizationId,
      pluginId: params.pluginId,
      userId: params.userId,
    });

    const installed = await this.getInstalledPlugin(params.organizationId, params.pluginId);
    if (!installed) {
      throw new Error('Failed to install plugin');
    }

    return installed;
  }

  static async enablePlugin(params: {
    organizationId: string;
    pluginId: string;
    userId: string;
  }): Promise<InstalledPlugin> {
    const current = await this.getInstalledPlugin(params.organizationId, params.pluginId);
    if (!current) {
      throw new Error('Installed plugin not found');
    }

    if (current.health.status === 'unhealthy') {
      throw new Error('Plugin health is not OK');
    }

    if (current.billing.status !== 'active') {
      throw new Error('Plugin billing is not OK');
    }

    const db = getAdminFirestore();
    const now = Timestamp.now();

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(INSTALLED_PLUGINS_COLLECTION)
      .doc(params.pluginId)
      .set(
        {
          lifecycle: 'enabled',
          enabled: true,
          updated_at: now,
          enabled_at: now,
          disabled_at: null,
          audit_summary: {
            last_event_at: now,
            last_event_by: params.userId,
          },
        },
        { merge: true }
      );

    const legacyCapability = await CapabilityService.getPlatformCapability(params.pluginId);
    if (legacyCapability) {
      await CapabilityService.updateInstalledCapability({
        organizationId: params.organizationId,
        capabilityId: params.pluginId,
        userId: params.userId,
        enabled: true,
      });
    }

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(LEGACY_CAPABILITIES_COLLECTION)
      .doc(params.pluginId)
      .set(
        {
          enabled: true,
          status: 'enabled',
          updated_at: now,
          enabled_at: now,
          disabled_at: null,
        },
        { merge: true }
      );

    await runPluginProvisioning({
      organizationId: params.organizationId,
      pluginId: params.pluginId,
      userId: params.userId,
    });

    const installed = await this.getInstalledPlugin(params.organizationId, params.pluginId);
    if (!installed) {
      throw new Error('Failed to enable plugin');
    }

    return installed;
  }

  static async disablePlugin(params: {
    organizationId: string;
    pluginId: string;
    userId: string;
  }): Promise<InstalledPlugin> {
    const current = await this.getInstalledPlugin(params.organizationId, params.pluginId);
    if (!current) {
      throw new Error('Installed plugin not found');
    }

    const db = getAdminFirestore();
    const now = Timestamp.now();

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(INSTALLED_PLUGINS_COLLECTION)
      .doc(params.pluginId)
      .set(
        {
          lifecycle: 'disabled',
          enabled: false,
          updated_at: now,
          disabled_at: now,
          audit_summary: {
            last_event_at: now,
            last_event_by: params.userId,
          },
        },
        { merge: true }
      );

    const legacyCapability = await CapabilityService.getPlatformCapability(params.pluginId);
    if (legacyCapability) {
      await CapabilityService.updateInstalledCapability({
        organizationId: params.organizationId,
        capabilityId: params.pluginId,
        userId: params.userId,
        enabled: false,
      });
    }

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(LEGACY_CAPABILITIES_COLLECTION)
      .doc(params.pluginId)
      .set(
        {
          enabled: false,
          status: 'disabled',
          updated_at: now,
          disabled_at: now,
        },
        { merge: true }
      );

    const installed = await this.getInstalledPlugin(params.organizationId, params.pluginId);
    if (!installed) {
      throw new Error('Failed to disable plugin');
    }

    return installed;
  }

  static async uninstallPlugin(params: {
    organizationId: string;
    pluginId: string;
    userId: string;
  }): Promise<InstalledPlugin> {
    const current = await this.getInstalledPlugin(
      params.organizationId,
      params.pluginId
    );
    if (!current || current.lifecycle === 'removed') {
      throw new Error('Installed plugin not found');
    }

    const db = getAdminFirestore();
    const now = Timestamp.now();

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(INSTALLED_PLUGINS_COLLECTION)
      .doc(params.pluginId)
      .set(
        {
          lifecycle: 'removed',
          enabled: false,
          updated_at: now,
          disabled_at: now,
          removed_at: now,
          audit_summary: {
            last_event_at: now,
            last_event_by: params.userId,
          },
        },
        { merge: true }
      );

    const legacyCapability = await CapabilityService.getInstalledCapability(
      params.organizationId,
      params.pluginId
    );
    if (legacyCapability) {
      await CapabilityService.deleteInstalledCapability({
        organizationId: params.organizationId,
        capabilityId: params.pluginId,
        userId: params.userId,
        systemId: legacyCapability.system_id,
      });
    }

    const installed = await this.getInstalledPlugin(
      params.organizationId,
      params.pluginId
    );
    if (!installed) {
      throw new Error('Failed to uninstall plugin');
    }

    return installed;
  }
}
