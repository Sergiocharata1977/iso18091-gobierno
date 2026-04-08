import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';
import type { PluginApiMethod } from '@/types/plugins';

const READ_SCOPE = 'rrhh.operaciones.read';
const WRITE_SCOPE = 'rrhh.operaciones.write';

const API_ROUTES: Array<{ path: string; methods: PluginApiMethod[] }> = [
  { path: '/api/rrhh/planificacion', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/planificacion/[id]', methods: ['PUT', 'DELETE'] },
  { path: '/api/rrhh/fichajes', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/ausencias', methods: ['GET', 'POST'] },
  { path: '/api/rrhh/ausencias/[id]', methods: ['PUT'] },
];

function scopesForMethod(method: PluginApiMethod): string[] {
  return method === 'GET' ? [READ_SCOPE] : [WRITE_SCOPE];
}

export const rrhhOperacionesManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'rrhh_operaciones',
    slug: 'rrhh-operaciones',
    display_name: 'RRHH Operaciones',
    summary:
      'Extension operativa de RRHH para planificacion, fichajes y ausencias.',
    description:
      'Incorpora capacidades operativas diarias para RRHH, con foco en headcount, presentismo y gestion de ausencias.',
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
      payroll: true,
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
        id: 'rrhh-operaciones-planificacion',
        path: '/rrhh/planificacion',
        label: 'Planificacion RRHH',
        feature_flag: 'rrhh_operaciones',
        required_scopes: [READ_SCOPE],
      },
      {
        id: 'rrhh-operaciones-asistencia',
        path: '/rrhh/asistencia',
        label: 'Asistencia',
        feature_flag: 'rrhh_operaciones',
        required_scopes: [READ_SCOPE],
      },
    ],
    pages: [
      {
        path: '/rrhh/planificacion',
        type: 'internal',
        feature_flag: 'rrhh_operaciones',
        required_scopes: [READ_SCOPE],
      },
      {
        path: '/rrhh/asistencia',
        type: 'internal',
        feature_flag: 'rrhh_operaciones',
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
    price_code: 'rrhh_operaciones_optional',
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
