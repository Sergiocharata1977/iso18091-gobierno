import type { InstalledCapability } from '@/types/plugins';

type UnknownRecord = Record<string, unknown>;
const MOBILE_OPERACIONES_REQUIRED_CAPABILITY = 'dealer_solicitudes';

export interface MobileOperationalProfile {
  key: string;
  label: string;
  can_convert_to_crm: boolean;
  can_manage_assignments: boolean;
  can_manage_purchases: boolean;
}

export interface MobileBootstrapFeatureFlags {
  solicitudes: boolean;
  evidencias: boolean;
  compras: boolean;
  catalogo: boolean;
  mapa_clientes: boolean;
  crm_handoff: boolean;
  offline_sync: boolean;
}

export interface MobileBootstrapIntegrations {
  crm: {
    active: boolean;
    installed: boolean;
    namespace: string;
    can_convert_from_operaciones: boolean;
    shared_events: string[];
    source: 'capability' | 'tenant_config';
  };
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  return null;
}

function getNestedBoolean(
  source: UnknownRecord,
  path: readonly string[]
): boolean | null {
  let current: unknown = source;
  for (const segment of path) {
    const record = asRecord(current);
    if (!record) return null;
    current = record[segment];
  }
  return asBoolean(current);
}

function pickFirstBoolean(
  source: UnknownRecord,
  paths: readonly (readonly string[])[]
): boolean | null {
  for (const path of paths) {
    const value = getNestedBoolean(source, path);
    if (value !== null) return value;
  }
  return null;
}

function sortStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function isCapabilityActive(capability: InstalledCapability): boolean {
  return capability.enabled && capability.status === 'enabled';
}

function resolveFeatureFlagOverride(
  organizationData: UnknownRecord,
  capabilitySettings: UnknownRecord[],
  key: keyof MobileBootstrapFeatureFlags
): boolean | null {
  const candidatePaths: (readonly string[])[] = [
    ['mobile_operaciones', 'feature_flags', key],
    ['mobile_operaciones', 'featureFlags', key],
    ['operaciones_android', 'feature_flags', key],
    ['operaciones_android', 'featureFlags', key],
    ['mobile', 'operaciones', 'feature_flags', key],
    ['mobile', 'operaciones', 'featureFlags', key],
    ['feature_flags', 'operaciones_android', key],
    ['featureFlags', 'operacionesAndroid', key],
  ];

  const orgOverride = pickFirstBoolean(organizationData, candidatePaths);
  if (orgOverride !== null) {
    return orgOverride;
  }

  for (const settings of capabilitySettings) {
    const capabilityOverride = pickFirstBoolean(settings, candidatePaths);
    if (capabilityOverride !== null) {
      return capabilityOverride;
    }
  }

  return null;
}

function resolveCrmIntegrationEnabled(
  organizationData: UnknownRecord,
  capabilitySettings: UnknownRecord[],
  hasCrmCapability: boolean
): { enabled: boolean; source: 'capability' | 'tenant_config' } {
  const candidatePaths: (readonly string[])[] = [
    ['mobile_operaciones', 'integrations', 'crm', 'enabled'],
    ['mobile_operaciones', 'integrations', 'crm_android', 'enabled'],
    ['operaciones_android', 'integrations', 'crm', 'enabled'],
    ['operaciones_android', 'integrations', 'crm_android', 'enabled'],
    ['integrations', 'crm', 'enabled'],
    ['integrations', 'crm_android', 'enabled'],
  ];

  const orgOverride = pickFirstBoolean(organizationData, candidatePaths);
  if (orgOverride !== null) {
    return { enabled: orgOverride && hasCrmCapability, source: 'tenant_config' };
  }

  for (const settings of capabilitySettings) {
    const capabilityOverride = pickFirstBoolean(settings, candidatePaths);
    if (capabilityOverride !== null) {
      return {
        enabled: capabilityOverride && hasCrmCapability,
        source: 'tenant_config',
      };
    }
  }

  return { enabled: hasCrmCapability, source: 'capability' };
}

export function getActiveInstalledCapabilities(
  installedCapabilities: InstalledCapability[]
): InstalledCapability[] {
  const active = installedCapabilities.filter(isCapabilityActive);
  if (
    active.some(
      capability =>
        capability.capability_id === MOBILE_OPERACIONES_REQUIRED_CAPABILITY
    )
  ) {
    return active;
  }

  return [
    ...active,
    {
      id: MOBILE_OPERACIONES_REQUIRED_CAPABILITY,
      capability_id: MOBILE_OPERACIONES_REQUIRED_CAPABILITY,
      system_id: 'mobile_operaciones',
      version_installed: 'server-enforced',
      industry_type: null,
      submodules_enabled: [],
      status: 'enabled',
      enabled: true,
      settings: {},
      installed_by: 'system',
      installed_at: new Date(0),
      enabled_at: new Date(0),
      disabled_at: null,
      updated_at: new Date(0),
    },
  ];
}

export function buildBootstrapFeatureFlags(params: {
  organizationData: UnknownRecord;
  installedCapabilities: InstalledCapability[];
  operationalProfile: MobileOperationalProfile;
}): MobileBootstrapFeatureFlags {
  const activeCapabilities = getActiveInstalledCapabilities(
    params.installedCapabilities
  );
  const activeCapabilityIds = new Set(
    activeCapabilities.map(capability => capability.capability_id)
  );
  const activeCapabilitySettings = activeCapabilities.map(capability =>
    asRecord(capability.settings) ?? {}
  );
  const hasCrm = activeCapabilityIds.has('crm');

  const defaults: MobileBootstrapFeatureFlags = {
    solicitudes: activeCapabilityIds.has(MOBILE_OPERACIONES_REQUIRED_CAPABILITY),
    evidencias: activeCapabilityIds.has(MOBILE_OPERACIONES_REQUIRED_CAPABILITY),
    compras: activeCapabilityIds.has(MOBILE_OPERACIONES_REQUIRED_CAPABILITY),
    catalogo: activeCapabilityIds.has(MOBILE_OPERACIONES_REQUIRED_CAPABILITY),
    mapa_clientes:
      activeCapabilityIds.has(MOBILE_OPERACIONES_REQUIRED_CAPABILITY) || hasCrm,
    crm_handoff: hasCrm && params.operationalProfile.can_convert_to_crm,
    offline_sync: true,
  };

  return {
    solicitudes:
      resolveFeatureFlagOverride(
        params.organizationData,
        activeCapabilitySettings,
        'solicitudes'
      ) ?? defaults.solicitudes,
    evidencias:
      resolveFeatureFlagOverride(
        params.organizationData,
        activeCapabilitySettings,
        'evidencias'
      ) ?? defaults.evidencias,
    compras:
      resolveFeatureFlagOverride(
        params.organizationData,
        activeCapabilitySettings,
        'compras'
      ) ?? defaults.compras,
    catalogo:
      resolveFeatureFlagOverride(
        params.organizationData,
        activeCapabilitySettings,
        'catalogo'
      ) ?? defaults.catalogo,
    mapa_clientes:
      resolveFeatureFlagOverride(
        params.organizationData,
        activeCapabilitySettings,
        'mapa_clientes'
      ) ?? defaults.mapa_clientes,
    crm_handoff:
      (resolveFeatureFlagOverride(
        params.organizationData,
        activeCapabilitySettings,
        'crm_handoff'
      ) ?? defaults.crm_handoff) &&
      hasCrm &&
      params.operationalProfile.can_convert_to_crm,
    offline_sync:
      resolveFeatureFlagOverride(
        params.organizationData,
        activeCapabilitySettings,
        'offline_sync'
      ) ?? defaults.offline_sync,
  };
}

export function buildBootstrapIntegrations(params: {
  organizationData: UnknownRecord;
  installedCapabilities: InstalledCapability[];
  operationalProfile: MobileOperationalProfile;
}): MobileBootstrapIntegrations {
  const activeCapabilities = getActiveInstalledCapabilities(
    params.installedCapabilities
  );
  const hasCrmCapability = activeCapabilities.some(
    capability => capability.capability_id === 'crm'
  );
  const activeCapabilitySettings = activeCapabilities.map(capability =>
    asRecord(capability.settings) ?? {}
  );
  const crm = resolveCrmIntegrationEnabled(
    params.organizationData,
    activeCapabilitySettings,
    hasCrmCapability
  );

  return {
    crm: {
      active: crm.enabled,
      installed: hasCrmCapability,
      namespace: '/api/mobile/crm',
      can_convert_from_operaciones:
        crm.enabled && params.operationalProfile.can_convert_to_crm,
      shared_events: sortStrings([
        'solicitud_convertida_a_oportunidad',
        'cliente_actualizado',
        'oportunidad_actualizada',
      ]),
      source: crm.source,
    },
  };
}

export function buildEffectiveRoleSet(params: {
  role: string;
  operationalProfile: MobileOperationalProfile;
}) {
  return sortStrings([params.role, params.operationalProfile.key]);
}
