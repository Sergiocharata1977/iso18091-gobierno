import { getAdminFirestore } from '@/lib/firebase/admin';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';
import type {
  CapabilityAuditEntry,
  InstalledCapability,
  PlatformCapability,
} from '@/types/plugins';
import type {
  SystemActivityActionType,
  SystemActivitySeverity,
  SystemActivityStatus,
} from '@/types/system-activity-log';
import { Timestamp } from 'firebase-admin/firestore';

const PLATFORM_CAPABILITIES_COLLECTION = 'platform_capabilities';
const INSTALLED_CAPABILITIES_COLLECTION = 'installed_capabilities';
const CAPABILITY_AUDIT_LOG_COLLECTION = 'capability_audit_log';

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

function normalizePlatformCapability(
  id: string,
  data: Record<string, unknown>
): PlatformCapability {
  const manifest =
    data.manifest && typeof data.manifest === 'object'
      ? (data.manifest as PlatformCapability['manifest'])
      : {
          capability_id: id,
          version: String(data.version || '1.0.0'),
          system_id: 'iso9001',
          navigation: [],
        };

  return {
    id,
    name: String(data.name || id),
    description: String(data.description || ''),
    version: String(data.version || '1.0.0'),
    system_ids: Array.isArray(data.system_ids)
      ? (data.system_ids as string[])
      : ['iso9001'],
    scope: (data.scope || 'system') as PlatformCapability['scope'],
    status: (data.status || 'active') as PlatformCapability['status'],
    tier: (data.tier || 'opcional') as PlatformCapability['tier'],
    icon: String(data.icon || 'Package'),
    color: typeof data.color === 'string' ? data.color : undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    industries: Array.isArray(data.industries)
      ? (data.industries as PlatformCapability['industries'])
      : undefined,
    industry_required: Boolean(data.industry_required),
    manifest,
    dependencies: Array.isArray(data.dependencies)
      ? (data.dependencies as string[])
      : [],
    long_description:
      typeof data.long_description === 'string'
        ? data.long_description
        : undefined,
    target_audience:
      typeof data.target_audience === 'string'
        ? data.target_audience
        : undefined,
    features: Array.isArray(data.features) ? (data.features as string[]) : [],
    benefits: Array.isArray(data.benefits) ? (data.benefits as string[]) : [],
    how_it_works:
      typeof data.how_it_works === 'string' ? data.how_it_works : undefined,
    screenshots: Array.isArray(data.screenshots)
      ? (data.screenshots as string[])
      : [],
    created_at: data.created_at ? timestampToDate(data.created_at) : undefined,
    updated_at: data.updated_at ? timestampToDate(data.updated_at) : undefined,
  };
}

function normalizeInstalledCapability(
  id: string,
  data: Record<string, unknown>
): InstalledCapability {
  return {
    id,
    capability_id: String(data.capability_id || id),
    system_id: String(data.system_id || 'iso9001'),
    version_installed: String(data.version_installed || '1.0.0'),
    industry_type:
      typeof data.industry_type === 'string' ? data.industry_type : null,
    submodules_enabled: Array.isArray(data.submodules_enabled)
      ? (data.submodules_enabled as string[])
      : [],
    status: (data.status || 'enabled') as InstalledCapability['status'],
    enabled: Boolean(data.enabled),
    settings:
      data.settings && typeof data.settings === 'object'
        ? (data.settings as Record<string, unknown>)
        : {},
    installed_by: String(data.installed_by || ''),
    installed_at: timestampToDate(data.installed_at),
    enabled_at: data.enabled_at ? timestampToDate(data.enabled_at) : null,
    disabled_at: data.disabled_at ? timestampToDate(data.disabled_at) : null,
    updated_at: timestampToDate(data.updated_at),
  };
}

function toTitleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function mapCapabilityAuditAction(
  action: CapabilityAuditEntry['action']
): SystemActivityActionType {
  switch (action) {
    case 'installed':
      return 'capability_installed';
    case 'enabled':
      return 'capability_enabled';
    case 'disabled':
      return 'capability_disabled';
    case 'uninstalled':
      return 'capability_uninstalled';
    case 'export_requested':
    case 'export_generated':
      return 'read';
    default:
      return 'update';
  }
}

function mapCapabilityAuditStatus(
  action: CapabilityAuditEntry['action']
): SystemActivityStatus {
  switch (action) {
    case 'restore_conflict':
      return 'failure';
    default:
      return 'success';
  }
}

function mapCapabilityAuditSeverity(
  action: CapabilityAuditEntry['action']
): SystemActivitySeverity {
  switch (action) {
    case 'disabled':
      return 'medium';
    case 'restore_conflict':
      return 'high';
    default:
      return 'info';
  }
}

function buildCapabilityActionLabel(
  action: CapabilityAuditEntry['action']
): string {
  switch (action) {
    case 'installed':
      return 'Capability Installed';
    case 'enabled':
      return 'Capability Enabled';
    case 'disabled':
      return 'Capability Disabled';
    case 'uninstalled':
      return 'Capability Uninstalled';
    default:
      return toTitleCase(action);
  }
}

function buildCapabilityDescription(params: {
  entry: CapabilityAuditEntry;
  capabilityName?: string;
}): string {
  const capabilityLabel = params.capabilityName || params.entry.capability_id;
  const actorLabel = params.entry.performed_by || 'system';

  switch (params.entry.action) {
    case 'installed':
      return `${actorLabel} installed capability ${capabilityLabel}.`;
    case 'enabled':
      return `${actorLabel} enabled capability ${capabilityLabel}.`;
    case 'disabled':
      return `${actorLabel} disabled capability ${capabilityLabel}.`;
    case 'uninstalled':
      return `${actorLabel} uninstalled capability ${capabilityLabel}.`;
    case 'settings_changed':
      return `${actorLabel} updated settings for capability ${capabilityLabel}.`;
    default:
      return `${actorLabel} executed ${toTitleCase(params.entry.action).toLowerCase()} on capability ${capabilityLabel}.`;
  }
}

function extractMetadataSystemId(
  entry: CapabilityAuditEntry,
  previousState?: Record<string, unknown> | null
): string | null {
  const detailSystemId =
    typeof entry.details?.system_id === 'string' ? entry.details.system_id : null;

  if (detailSystemId) {
    return detailSystemId;
  }

  return typeof previousState?.system_id === 'string'
    ? previousState.system_id
    : null;
}

function buildCapabilityResultingStatus(
  entry: CapabilityAuditEntry,
  previousState?: Record<string, unknown> | null
): string | null {
  switch (entry.action) {
    case 'installed':
      return entry.details?.enabled === true ? 'enabled' : 'installed';
    case 'enabled':
      return 'enabled';
    case 'disabled':
      return 'disabled';
    case 'uninstalled':
      return 'uninstalled';
    default:
      return typeof entry.details?.status === 'string'
        ? entry.details.status
        : typeof previousState?.status === 'string'
          ? previousState.status
          : null;
  }
}

export class CapabilityService {
  private static async emitSystemActivityLog(
    organizationId: string,
    entry: CapabilityAuditEntry
  ): Promise<void> {
    let platformCapability: PlatformCapability | null = null;

    try {
      platformCapability = await this.getPlatformCapability(entry.capability_id);
    } catch (error) {
      console.error(
        '[CapabilityService] Error loading capability metadata for activity log:',
        error
      );
    }

    const previousState = entry.previous_state ?? null;
    const systemId = extractMetadataSystemId(entry, previousState);
    const resultingStatus = buildCapabilityResultingStatus(entry, previousState);
    const metadata: Record<string, unknown> = {
      capability_audit_action: entry.action,
      organization_id: organizationId,
      actor_user_id: entry.performed_by,
    };

    if (entry.details) {
      metadata.details = entry.details;
    }

    if (previousState) {
      metadata.previous_state = previousState;
    }

    if (platformCapability?.dependencies?.length) {
      metadata.dependencies = platformCapability.dependencies;
    }

    if (platformCapability?.version) {
      metadata.capability_version = platformCapability.version;
    }

    if (systemId) {
      metadata.system_id = systemId;
    }

    if (resultingStatus) {
      metadata.capability_status = resultingStatus;
    }

    const enabledFlag =
      typeof entry.details?.enabled === 'boolean'
        ? entry.details.enabled
        : typeof previousState?.enabled === 'boolean'
          ? previousState.enabled
          : undefined;

    if (typeof enabledFlag === 'boolean') {
      metadata.enabled = enabledFlag;
    }

    if (typeof previousState?.status === 'string') {
      metadata.previous_status = previousState.status;
    }

    if (typeof previousState?.enabled === 'boolean') {
      metadata.previous_enabled = previousState.enabled;
    }

    if (typeof previousState?.installed_by === 'string') {
      metadata.installed_by = previousState.installed_by;
    }

    if (Array.isArray(previousState?.submodules_enabled)) {
      metadata.submodules_enabled = previousState.submodules_enabled;
    } else if (Array.isArray(entry.details?.submodules_enabled)) {
      metadata.submodules_enabled = entry.details.submodules_enabled;
    }

    const industryType =
      typeof entry.details?.industry_type === 'string'
        ? entry.details.industry_type
        : typeof previousState?.industry_type === 'string'
          ? previousState.industry_type
          : null;

    if (industryType) {
      metadata.industry_type = industryType;
    }

    await SystemActivityLogService.logUserAction({
      organization_id: organizationId,
      occurred_at: entry.performed_at,
      source_module: 'capabilities',
      source_submodule: systemId,
      channel: 'capability',
      entity_type: 'capability',
      entity_id: entry.capability_id,
      entity_code: platformCapability?.name ?? null,
      action_type: mapCapabilityAuditAction(entry.action),
      action_label: buildCapabilityActionLabel(entry.action),
      description: buildCapabilityDescription({
        entry,
        capabilityName: platformCapability?.name,
      }),
      status: mapCapabilityAuditStatus(entry.action),
      severity: mapCapabilityAuditSeverity(entry.action),
      related_entities: [],
      evidence_refs: [],
      correlation_id: null,
      metadata,
      actor_user_id: entry.performed_by,
      actor_display_name: null,
      actor_role: null,
    });
  }

  static async installTierCapabilitiesForSystem(params: {
    organizationId: string;
    systemId: string;
    userId: string;
  }): Promise<{
    installed: string[];
    alreadyInstalled: string[];
    blockedByDependencies: string[];
  }> {
    const [platformCapabilities, installedCapabilities] = await Promise.all([
      this.getPlatformCapabilities({ systemId: params.systemId }),
      this.getInstalledCapabilities(params.organizationId),
    ]);

    const autoInstallableCapabilities = platformCapabilities.filter(
      capability =>
        capability.status !== 'deprecated' && capability.tier !== 'premium'
    );

    if (autoInstallableCapabilities.length === 0) {
      return {
        installed: [],
        alreadyInstalled: [],
        blockedByDependencies: [],
      };
    }

    const installedIds = new Set(
      installedCapabilities
        .filter(capability => capability.system_id === params.systemId)
        .map(capability => capability.capability_id)
    );

    const alreadyInstalled = autoInstallableCapabilities
      .filter(capability => installedIds.has(capability.id))
      .map(capability => capability.id);

    let pending = autoInstallableCapabilities
      .filter(capability => !installedIds.has(capability.id))
      .map(capability => ({
        capabilityId: capability.id,
        enabled: capability.tier === 'base',
      }));

    const installed: string[] = [];

    while (pending.length > 0) {
      const retryQueue: typeof pending = [];
      let progress = false;

      for (const entry of pending) {
        try {
          await this.installCapability({
            organizationId: params.organizationId,
            capabilityId: entry.capabilityId,
            systemId: params.systemId,
            userId: params.userId,
            enabled: entry.enabled,
          });
          installed.push(entry.capabilityId);
          installedIds.add(entry.capabilityId);
          progress = true;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.startsWith('Missing capability dependencies:')
          ) {
            retryQueue.push(entry);
            continue;
          }

          throw error;
        }
      }

      if (!progress) {
        return {
          installed,
          alreadyInstalled,
          blockedByDependencies: retryQueue.map(entry => entry.capabilityId),
        };
      }

      pending = retryQueue;
    }

    return {
      installed,
      alreadyInstalled,
      blockedByDependencies: [],
    };
  }

  static async getPlatformCapability(
    capabilityId: string
  ): Promise<PlatformCapability | null> {
    const db = getAdminFirestore();
    const doc = await db
      .collection(PLATFORM_CAPABILITIES_COLLECTION)
      .doc(capabilityId)
      .get();

    if (!doc.exists) return null;

    return normalizePlatformCapability(doc.id, doc.data() || {});
  }

  static async getPlatformCapabilities(params?: {
    systemId?: string;
  }): Promise<PlatformCapability[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(PLATFORM_CAPABILITIES_COLLECTION)
      .get();

    return snapshot.docs
      .map(doc => normalizePlatformCapability(doc.id, doc.data() || {}))
      .filter(capability => {
        if (!params?.systemId) return true;
        return (
          capability.system_ids.includes('*') ||
          capability.system_ids.includes(params.systemId)
        );
      });
  }

  static async upsertPlatformCapability(
    capability: PlatformCapability
  ): Promise<void> {
    const db = getAdminFirestore();
    const now = Timestamp.now();

    await db
      .collection(PLATFORM_CAPABILITIES_COLLECTION)
      .doc(capability.id)
      .set(
        {
          ...capability,
          created_at: capability.created_at || now,
          updated_at: now,
        },
        { merge: true }
      );
  }

  static async getInstalledCapabilities(
    organizationId: string
  ): Promise<InstalledCapability[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('organizations')
      .doc(organizationId)
      .collection(INSTALLED_CAPABILITIES_COLLECTION)
      .get();

    return snapshot.docs.map(doc =>
      normalizeInstalledCapability(doc.id, doc.data() || {})
    );
  }

  static async getInstalledCapability(
    organizationId: string,
    capabilityId: string
  ): Promise<InstalledCapability | null> {
    const db = getAdminFirestore();
    const doc = await db
      .collection('organizations')
      .doc(organizationId)
      .collection(INSTALLED_CAPABILITIES_COLLECTION)
      .doc(capabilityId)
      .get();

    if (!doc.exists) return null;

    return normalizeInstalledCapability(doc.id, doc.data() || {});
  }

  static async getAvailableCapabilities(params: {
    organizationId: string;
    systemId?: string;
  }): Promise<PlatformCapability[]> {
    const [platformCapabilities, installedCapabilities] = await Promise.all([
      this.getPlatformCapabilities({ systemId: params.systemId }),
      this.getInstalledCapabilities(params.organizationId),
    ]);
    const installedIds = new Set(
      installedCapabilities
        .filter(capability => {
          if (!params.systemId) return true;
          return capability.system_id === params.systemId;
        })
        .map(capability => capability.capability_id)
    );

    return platformCapabilities.filter(
      capability => !installedIds.has(capability.id)
    );
  }

  static async validateCapabilityDependencies(params: {
    organizationId: string;
    capabilityId: string;
  }): Promise<void> {
    const capability = await this.getPlatformCapability(params.capabilityId);
    const dependencies = capability?.dependencies || [];

    if (!dependencies.length) return;

    const installedDependencies = await Promise.all(
      dependencies.map(dependencyId =>
        this.getInstalledCapability(params.organizationId, dependencyId)
      )
    );

    const missingDependencies = dependencies.filter(
      (_dependencyId, index) =>
        !installedDependencies[index] ||
        !installedDependencies[index]?.enabled ||
        installedDependencies[index]?.status !== 'enabled'
    );

    if (missingDependencies.length > 0) {
      throw new Error(
        `Missing capability dependencies: ${missingDependencies.join(', ')}`
      );
    }
  }

  static async validateCapabilityCanBeDeleted(params: {
    organizationId: string;
    capabilityId: string;
    systemId?: string;
  }): Promise<void> {
    const [platformCapabilities, installedCapabilities] = await Promise.all([
      this.getPlatformCapabilities({ systemId: params.systemId }),
      this.getInstalledCapabilities(params.organizationId),
    ]);
    const installedIds = new Set(
      installedCapabilities.map(capability => capability.capability_id)
    );

    const blockingCapabilities = platformCapabilities
      .filter(capability => installedIds.has(capability.id))
      .filter(capability =>
        (capability.dependencies || []).includes(params.capabilityId)
      )
      .map(capability => capability.id);

    if (blockingCapabilities.length > 0) {
      throw new Error(
        `Capability is required by: ${blockingCapabilities.join(', ')}`
      );
    }
  }

  static async installCapability(params: {
    organizationId: string;
    capabilityId: string;
    systemId: string;
    userId: string;
    enabled?: boolean;
    settings?: Record<string, unknown>;
    industryType?: string | null;
    submodulesEnabled?: string[];
  }): Promise<void> {
    const db = getAdminFirestore();
    const platformCapability = await this.getPlatformCapability(
      params.capabilityId
    );

    if (!platformCapability) {
      throw new Error(`Platform capability "${params.capabilityId}" not found`);
    }

    await this.validateCapabilityDependencies({
      organizationId: params.organizationId,
      capabilityId: params.capabilityId,
    });

    const now = Timestamp.now();
    const enabled = params.enabled ?? true;

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(INSTALLED_CAPABILITIES_COLLECTION)
      .doc(params.capabilityId)
      .set(
        {
          capability_id: params.capabilityId,
          system_id: params.systemId,
          version_installed: platformCapability?.version || '1.0.0',
          industry_type: params.industryType || null,
          submodules_enabled: params.submodulesEnabled || [],
          status: enabled ? 'enabled' : 'installed',
          enabled,
          settings: params.settings || {},
          installed_by: params.userId,
          installed_at: now,
          enabled_at: enabled ? now : null,
          updated_at: now,
        },
        { merge: true }
      );

    await this.logCapabilityAudit(params.organizationId, {
      capability_id: params.capabilityId,
      action: 'installed',
      performed_by: params.userId,
      performed_at: new Date(),
      details: {
        system_id: params.systemId,
        enabled,
      },
      previous_state: null,
    });
  }

  static async updateInstalledCapability(params: {
    organizationId: string;
    capabilityId: string;
    userId: string;
    enabled?: boolean;
    settings?: Record<string, unknown>;
    systemId?: string;
  }): Promise<void> {
    const db = getAdminFirestore();
    const current = await this.getInstalledCapability(
      params.organizationId,
      params.capabilityId
    );
    const now = Timestamp.now();
    const patch: Record<string, unknown> = {
      updated_at: now,
    };

    if (!current) {
      throw new Error(
        `Installed capability "${params.capabilityId}" not found for organization`
      );
    }

    if (typeof params.enabled === 'boolean') {
      if (params.enabled) {
        await this.validateCapabilityDependencies({
          organizationId: params.organizationId,
          capabilityId: params.capabilityId,
        });
      }

      patch.enabled = params.enabled;
      patch.status = params.enabled ? 'enabled' : 'disabled';
      patch.enabled_at = params.enabled ? now : current?.enabled_at || null;
      patch.disabled_at = params.enabled ? null : now;
    }

    if (params.settings) {
      patch.settings = params.settings;
    }

    if (params.systemId) {
      patch.system_id = params.systemId;
    }

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(INSTALLED_CAPABILITIES_COLLECTION)
      .doc(params.capabilityId)
      .set(patch, { merge: true });

    await this.logCapabilityAudit(params.organizationId, {
      capability_id: params.capabilityId,
      action:
        typeof params.enabled === 'boolean'
          ? params.enabled
            ? 'enabled'
            : 'disabled'
          : 'settings_changed',
      performed_by: params.userId,
      performed_at: new Date(),
      details: patch,
      previous_state: current
        ? (current as unknown as Record<string, unknown>)
        : null,
    });
  }

  static async deleteInstalledCapability(params: {
    organizationId: string;
    capabilityId: string;
    userId: string;
    systemId?: string;
  }): Promise<void> {
    const db = getAdminFirestore();
    const current = await this.getInstalledCapability(
      params.organizationId,
      params.capabilityId
    );

    if (!current) {
      throw new Error(
        `Installed capability "${params.capabilityId}" not found for organization`
      );
    }

    await this.validateCapabilityCanBeDeleted({
      organizationId: params.organizationId,
      capabilityId: params.capabilityId,
      systemId: params.systemId || current.system_id,
    });

    await db
      .collection('organizations')
      .doc(params.organizationId)
      .collection(INSTALLED_CAPABILITIES_COLLECTION)
      .doc(params.capabilityId)
      .delete();

    await this.logCapabilityAudit(params.organizationId, {
      capability_id: params.capabilityId,
      action: 'uninstalled',
      performed_by: params.userId,
      performed_at: new Date(),
      details: {
        system_id: params.systemId || current.system_id,
      },
      previous_state: current as unknown as Record<string, unknown>,
    });
  }

  static async logCapabilityAudit(
    organizationId: string,
    entry: CapabilityAuditEntry
  ): Promise<void> {
    const db = getAdminFirestore();
    await db
      .collection('organizations')
      .doc(organizationId)
      .collection(CAPABILITY_AUDIT_LOG_COLLECTION)
      .add({
        ...entry,
        performed_at: Timestamp.fromDate(entry.performed_at),
        created_at: Timestamp.now(),
      });

    try {
      await this.emitSystemActivityLog(organizationId, entry);
    } catch (error) {
      console.error(
        '[CapabilityService] Error logging capability activity to central log:',
        error
      );
    }
  }

  static async isCapabilityEnabled(
    organizationId: string,
    capabilityId: string
  ): Promise<boolean> {
    const installed = await this.getInstalledCapability(
      organizationId,
      capabilityId
    );
    return Boolean(installed?.enabled && installed.status === 'enabled');
  }
}
