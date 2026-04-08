import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const isoInfraManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'iso_infrastructure',
    slug: 'iso-infrastructure',
    display_name: 'ISO 7.1.3 - Infraestructura',
    summary: 'Gestion de activos, responsables y mantenimientos segun ISO 9001 7.1.3.',
    description:
      'Centraliza infraestructura y evidencia operativa de mantenimiento para auditoria y gestion interna.',
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
    scopes: ['iso.infrastructure.read', 'iso.infrastructure.write'],
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
        id: 'iso-infrastructure-root',
        path: '/iso-infrastructure',
        label: 'Infraestructura',
        feature_flag: 'iso_infrastructure',
        required_scopes: ['iso.infrastructure.read'],
      },
    ],
    pages: [
      {
        path: '/iso-infrastructure',
        type: 'internal',
        feature_flag: 'iso_infrastructure',
        required_scopes: ['iso.infrastructure.read'],
      },
    ],
    api: [
      {
        method: 'GET',
        path: '/api/iso-infrastructure',
        required_scopes: ['iso.infrastructure.read'],
      },
      {
        method: 'POST',
        path: '/api/iso-infrastructure',
        required_scopes: ['iso.infrastructure.write'],
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
    price_code: 'iso_infrastructure_premium',
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
