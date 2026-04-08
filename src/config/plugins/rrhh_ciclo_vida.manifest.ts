import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';
import type { PluginApiMethod } from '@/types/plugins';

const READ_SCOPE = 'rrhh.ciclo_vida.read';
const WRITE_SCOPE = 'rrhh.ciclo_vida.write';

const API_ROUTES: Array<{ path: string; methods: PluginApiMethod[] }> = [
  { path: '/api/rrhh/vacantes', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/vacantes/[id]', methods: ['GET', 'PUT', 'DELETE'] },
  { path: '/api/rrhh/candidatos', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/candidatos/[id]', methods: ['GET', 'PUT', 'DELETE'] },
  { path: '/api/rrhh/onboarding', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/onboarding/[id]', methods: ['GET', 'PUT'] },
  { path: '/api/rrhh/contratos', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/contratos/[id]', methods: ['GET', 'PUT', 'DELETE'] },
  { path: '/api/rrhh/offboarding', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/offboarding/[id]', methods: ['GET', 'PUT'] },
];

function scopesForMethod(method: PluginApiMethod): string[] {
  return method === 'GET' ? [READ_SCOPE] : [WRITE_SCOPE];
}

export const rrhhCicloVidaManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'rrhh_ciclo_vida',
    slug: 'rrhh-ciclo-vida',
    display_name: 'RRHH Ciclo de Vida',
    summary:
      'Extension de RRHH para reclutamiento, onboarding, contratos y offboarding.',
    description:
      'Activa el ciclo de vida completo del colaborador dentro de RRHH, desde vacantes y candidatos hasta integracion, legajo contractual y desvinculacion.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'optional',
    category: 'hr',
    visibility: 'public_marketplace',
    maturity: 'ga',
  },
  versioning: {
    plugin_version: '1.0.0',
    release_channel: 'stable',
    runtime_api_version: '2026-04',
    data_contract_version: '1.0',
  },
  compatibility: {
    core_version_range: '^3.0.0',
    required_capabilities: [],
    optional_capabilities: ['rrhh'],
    incompatible_plugins: [],
    tenant_types_allowed: ['pyme', 'dealer', 'industria', 'iso_government'],
    regions_allowed: ['AR'],
    deployment_modes: ['shared_saas'],
  },
  dependencies: {
    services: ['firestore', 'auth', 'audit'],
    secrets: [],
    migrations: {
      install: [],
      update: [],
      uninstall: [],
    },
  },
  permissions: {
    scopes: [READ_SCOPE, WRITE_SCOPE],
    data_access: {
      pii: true,
      financial: false,
      payroll: false,
    },
    agent_access: {
      read_skills_allowed: true,
      write_skills_allowed: true,
      human_approval_required_for_write: true,
    },
  },
  tenant_settings: {
    schema_version: '1.0',
    required: false,
    defaults: {},
    schema: {},
    secrets: [],
    limits: {},
  },
  routes: {
    navigation: [
      {
        id: 'rrhh-ciclo-vida-ats',
        path: '/rrhh/ats',
        label: 'Atraccion y seleccion',
        feature_flag: 'rrhh_ciclo_vida',
        required_scopes: [READ_SCOPE],
      },
      {
        id: 'rrhh-ciclo-vida-onboarding',
        path: '/rrhh/onboarding',
        label: 'Onboarding',
        feature_flag: 'rrhh_ciclo_vida',
        required_scopes: [READ_SCOPE],
      },
      {
        id: 'rrhh-ciclo-vida-contratos',
        path: '/rrhh/contratos',
        label: 'Contratos y legajos',
        feature_flag: 'rrhh_ciclo_vida',
        required_scopes: [READ_SCOPE],
      },
      {
        id: 'rrhh-ciclo-vida-offboarding',
        path: '/rrhh/offboarding',
        label: 'Offboarding',
        feature_flag: 'rrhh_ciclo_vida',
        required_scopes: [READ_SCOPE],
      },
    ],
    pages: [
      {
        path: '/rrhh/ats',
        type: 'internal',
        feature_flag: 'rrhh_ciclo_vida',
        required_scopes: [READ_SCOPE],
      },
      {
        path: '/rrhh/onboarding',
        type: 'internal',
        feature_flag: 'rrhh_ciclo_vida',
        required_scopes: [READ_SCOPE],
      },
      {
        path: '/rrhh/contratos',
        type: 'internal',
        feature_flag: 'rrhh_ciclo_vida',
        required_scopes: [READ_SCOPE],
      },
      {
        path: '/rrhh/offboarding',
        type: 'internal',
        feature_flag: 'rrhh_ciclo_vida',
        required_scopes: [READ_SCOPE],
      },
    ],
    api: API_ROUTES.flatMap(({ path, methods }) =>
      methods.map(method => ({
        method,
        path,
        required_scopes: scopesForMethod(method),
      }))
    ),
  },
  events: {
    emits: [],
    consumes: [],
  },
  skills: {
    exposes: [],
  },
  billing: {
    model: 'subscription',
    price_code: 'rrhh_ciclo_vida_optional',
    revenue_share: {
      platform_percent: 100,
      partner_percent: 0,
    },
    usage_metered: false,
    suspension_policy: 'disable_write_then_suspend',
  },
  audit: {
    level: 'full',
    log_reads: false,
    log_writes: true,
    retention_days: 3650,
    trace_dimensions: ['tenant_id', 'user_id', 'plugin_id', 'request_id'],
  },
  health: {
    checks: ['manifest_schema_valid', 'dependencies_resolved', 'catalog'],
    status_policy: {
      degraded_blocks_new_writes: false,
      unhealthy_blocks_enable: true,
    },
  },
  uninstall_strategy: {
    mode: 'soft_remove',
    export_required: false,
    data_retention_days: 30,
    reversible_within_days: 30,
    blockers: [],
  },
  multi_tenant: {
    isolation_model: 'logical_per_organization',
    shared_code: true,
    shared_runtime: true,
    per_tenant_overrides_allowed: true,
    tenant_override_policy: 'admin_approved',
  },
});
