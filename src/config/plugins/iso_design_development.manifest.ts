import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const isoDesignManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'iso_design_development',
    slug: 'iso-design-development',
    display_name: 'ISO 8.3 - Diseno y Desarrollo',
    summary: 'Gestion formal del ciclo de vida de diseno segun ISO 9001 8.3.',
    description:
      'Estructura proyectos de diseno y desarrollo con trazabilidad sobre entradas, salidas, revisiones y validaciones.',
    owner: {
      type: 'platform',
      owner_id: 'don_candido',
      legal_name: 'Don Candido Platform',
      support_email: 'soporte@doncandidoplatform.com',
    },
    tier: 'premium',
    category: 'iso_quality',
    visibility: 'internal',
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
    tenant_types_allowed: ['pyme', 'dealer', 'government'],
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
    scopes: ['iso.design.read', 'iso.design.write'],
    data_access: {
      pii: false,
      financial: false,
      payroll: false,
    },
    agent_access: {
      read_skills_allowed: true,
      write_skills_allowed: false,
      human_approval_required_for_write: false,
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
        id: 'iso-design-root',
        path: '/iso-design',
        label: 'Diseno y Desarrollo',
        feature_flag: 'iso_design_development',
        required_scopes: ['iso.design.read'],
      },
    ],
    pages: [
      {
        path: '/iso-design',
        type: 'internal',
        feature_flag: 'iso_design_development',
        required_scopes: ['iso.design.read'],
      },
    ],
    api: [
      {
        method: 'GET',
        path: '/api/iso-design',
        required_scopes: ['iso.design.read'],
      },
      {
        method: 'POST',
        path: '/api/iso-design',
        required_scopes: ['iso.design.write'],
      },
    ],
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
    price_code: 'iso_design_premium',
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
    checks: ['manifest_schema_valid', 'dependencies_resolved', 'routes_registered'],
    status_policy: {
      degraded_blocks_new_writes: true,
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
    per_tenant_overrides_allowed: false,
    tenant_override_policy: 'platform_only',
  },
});
