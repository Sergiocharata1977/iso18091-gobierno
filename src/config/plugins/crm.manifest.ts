import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';
import type { PluginApiMethod } from '@/types/plugins';

const CRM_READ_SCOPE = 'crm.read';
const CRM_WRITE_SCOPE = 'crm.write';

const CRM_API_ROUTE_DEFINITIONS: Array<{
  path: string;
  methods: PluginApiMethod[];
}> = [
  { path: '/api/crm/cobros', methods: ['POST'] },
  { path: '/api/crm/acciones', methods: ['GET', 'POST'] },
  { path: '/api/crm/acciones/[id]', methods: ['PUT', 'DELETE'] },
  { path: '/api/crm/clasificaciones', methods: ['GET', 'POST'] },
  { path: '/api/crm/clasificaciones/[id]', methods: ['GET', 'PATCH', 'DELETE'] },
  { path: '/api/crm/clientes', methods: ['GET', 'POST'] },
  {
    path: '/api/crm/clientes/[id]',
    methods: ['GET', 'PATCH', 'PUT', 'DELETE'],
  },
  { path: '/api/crm/clientes/[id]/clasificaciones', methods: ['PATCH'] },
  { path: '/api/crm/config/scoring', methods: ['GET', 'PATCH'] },
  { path: '/api/crm/contactos', methods: ['GET', 'POST'] },
  { path: '/api/crm/contactos/[id]', methods: ['GET', 'PATCH', 'DELETE'] },
  { path: '/api/crm/credit-workflows', methods: ['GET', 'POST'] },
  {
    path: '/api/crm/credit-workflows/by-opportunity/[oportunidadId]',
    methods: ['GET'],
  },
  { path: '/api/crm/credit-workflows/[id]', methods: ['GET', 'PATCH'] },
  { path: '/api/crm/credit-workflows/[id]/close', methods: ['POST'] },
  { path: '/api/crm/credit-workflows/[id]/move', methods: ['POST'] },
  { path: '/api/crm/estados-financieros/resultados', methods: ['GET', 'POST'] },
  {
    path: '/api/crm/estados-financieros/resultados/[id]',
    methods: ['GET', 'PATCH', 'DELETE'],
  },
  { path: '/api/crm/estados-financieros/situacion', methods: ['GET', 'POST'] },
  {
    path: '/api/crm/estados-financieros/situacion/[id]',
    methods: ['GET', 'PATCH', 'DELETE'],
  },
  { path: '/api/crm/evaluaciones', methods: ['GET', 'POST'] },
  { path: '/api/crm/evaluaciones/[id]', methods: ['GET', 'PATCH', 'DELETE'] },
  { path: '/api/crm/facturas', methods: ['POST'] },
  { path: '/api/crm/historico/[clienteId]/documentos', methods: ['GET', 'POST'] },
  { path: '/api/crm/historico/[clienteId]/financial', methods: ['GET', 'POST'] },
  { path: '/api/crm/historico/[clienteId]/nosis', methods: ['GET', 'POST'] },
  { path: '/api/crm/historico/[clienteId]/patrimonio', methods: ['GET', 'POST'] },
  { path: '/api/crm/historico/[clienteId]/scoring', methods: ['GET', 'POST'] },
  { path: '/api/crm/init', methods: ['POST'] },
  { path: '/api/crm/kanban/estados', methods: ['GET', 'POST'] },
  { path: '/api/crm/kanban/mover', methods: ['POST'] },
  { path: '/api/crm/kanban/reset', methods: ['POST'] },
  { path: '/api/crm/metricas/clientes-no-atendidos', methods: ['GET'] },
  { path: '/api/crm/metricas/penetracion', methods: ['GET'] },
  { path: '/api/crm/metricas/sin-contacto', methods: ['GET'] },
  { path: '/api/crm/metricas/vendedores', methods: ['GET'] },
  { path: '/api/crm/oportunidades', methods: ['GET', 'POST'] },
  { path: '/api/crm/oportunidades/[id]', methods: ['GET', 'PATCH', 'DELETE'] },
  { path: '/api/crm/oportunidades/[id]/clasificaciones', methods: ['PATCH'] },
  { path: '/api/crm/oportunidades/[id]/mover', methods: ['POST'] },
  { path: '/api/crm/satisfaccion', methods: ['GET'] },
];

function scopesForMethod(method: PluginApiMethod): string[] {
  return method === 'GET' ? [CRM_READ_SCOPE] : [CRM_WRITE_SCOPE];
}

export const crmManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'crm',
    slug: 'crm',
    display_name: 'CRM Comercial',
    summary:
      'Core comercial del CRM con clientes, contactos, oportunidades, acciones y analitica operativa.',
    description:
      'Formaliza el CRM como plugin activable por tenant, con rutas de navegacion, API catalogada y dependencias listas para extensiones como scoring y canales comerciales.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'optional',
    category: 'crm',
    visibility: 'public_marketplace',
    maturity: 'ga',
  },
  versioning: {
    plugin_version: '1.0.0',
    release_channel: 'stable',
    runtime_api_version: '2026-03',
    data_contract_version: '1.0',
  },
  compatibility: {
    core_version_range: '^3.0.0',
    required_capabilities: [],
    optional_capabilities: [],
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
    scopes: [CRM_READ_SCOPE, CRM_WRITE_SCOPE],
    data_access: {
      pii: true,
      financial: true,
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
    required: true,
    defaults: {},
    schema: {},
    secrets: [],
    limits: {},
  },
  routes: {
    navigation: [
      {
        id: 'crm-root',
        path: '/crm',
        label: 'CRM',
        feature_flag: 'crm',
        required_scopes: [CRM_READ_SCOPE],
      },
      {
        id: 'crm-credit-root',
        path: '/crm/gestion-crediticia',
        label: 'Gestion crediticia',
        feature_flag: 'crm',
        required_scopes: [CRM_READ_SCOPE],
      },
    ],
    pages: [
      {
        path: '/crm',
        type: 'internal',
        feature_flag: 'crm',
        required_scopes: [CRM_READ_SCOPE],
      },
      {
        path: '/crm/gestion-crediticia',
        type: 'internal',
        feature_flag: 'crm',
        required_scopes: [CRM_READ_SCOPE],
      },
    ],
    api: CRM_API_ROUTE_DEFINITIONS.flatMap(({ path, methods }) =>
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
    price_code: 'crm_core_optional',
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
    checks: [
      'manifest_schema_valid',
      'dependencies_resolved',
      'routes_registered',
      'tenant_capability_installed',
    ],
    status_policy: {
      degraded_blocks_new_writes: false,
      unhealthy_blocks_enable: true,
    },
  },
  uninstall_strategy: {
    mode: 'soft_remove',
    export_required: true,
    data_retention_days: 90,
    reversible_within_days: 30,
    blockers: [],
  },
  multi_tenant: {
    isolation_model: 'logical_per_organization',
    shared_code: true,
    shared_runtime: true,
    per_tenant_overrides_allowed: true,
    tenant_override_policy: 'settings_schema_validated',
  },
});
