import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';
import type { PluginApiMethod } from '@/types/plugins';

const READ_SCOPE = 'rrhh.estrategico.read';
const WRITE_SCOPE = 'rrhh.estrategico.write';

const API_ROUTES: Array<{ path: string; methods: PluginApiMethod[] }> = [
  { path: '/api/rrhh/clima', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/clima/[id]', methods: ['GET', 'PUT'] },
  { path: '/api/rrhh/talento', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/talento/[id]', methods: ['GET', 'PUT'] },
  { path: '/api/rrhh/relaciones', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/relaciones/[id]', methods: ['GET', 'PUT'] },
];

function scopesForMethod(method: PluginApiMethod): string[] {
  return method === 'GET' ? [READ_SCOPE] : [WRITE_SCOPE];
}

export const rrhhEstrategicoManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'rrhh_estrategico',
    slug: 'rrhh-estrategico',
    display_name: 'RRHH Estrategico',
    summary:
      'Extension de RRHH para clima, talento y relaciones laborales.',
    description:
      'Amplia RRHH con lectura estrategica del equipo, encuestas de clima, deteccion de talento y gestion de relaciones laborales.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'premium',
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
        id: 'rrhh-estrategico-clima',
        path: '/rrhh/clima',
        label: 'Clima y bienestar',
        feature_flag: 'rrhh_estrategico',
        required_scopes: [READ_SCOPE],
      },
      {
        id: 'rrhh-estrategico-talento',
        path: '/rrhh/talento',
        label: 'Gestion del talento',
        feature_flag: 'rrhh_estrategico',
        required_scopes: [READ_SCOPE],
      },
      {
        id: 'rrhh-estrategico-relaciones',
        path: '/rrhh/relaciones',
        label: 'Relaciones laborales',
        feature_flag: 'rrhh_estrategico',
        required_scopes: [READ_SCOPE],
      },
    ],
    pages: [
      {
        path: '/rrhh/clima',
        type: 'internal',
        feature_flag: 'rrhh_estrategico',
        required_scopes: [READ_SCOPE],
      },
      {
        path: '/rrhh/talento',
        type: 'internal',
        feature_flag: 'rrhh_estrategico',
        required_scopes: [READ_SCOPE],
      },
      {
        path: '/rrhh/relaciones',
        type: 'internal',
        feature_flag: 'rrhh_estrategico',
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
    price_code: 'rrhh_estrategico_premium',
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
