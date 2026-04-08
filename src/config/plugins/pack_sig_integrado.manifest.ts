import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const packSigIntegradoManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  type: 'bundle',
  bundle_plugins: [
    'iso_environment_14001',
    'iso_sst_45001',
    'iso_sgsi_27001',
    'iso_audit_19011',
  ],
  identity: {
    plugin_id: 'pack_sig_integrado',
    slug: 'pack-sig-integrado',
    display_name: 'Pack SIG Integrado',
    summary:
      'Bundle comercial integrado con ISO 14001, ISO 45001, ISO 27001 e ISO 19011.',
    description:
      'Consolida el maximo alcance comercial del SIG integrando ambiente, seguridad y salud, seguridad de la informacion y programa de auditorias en una sola contratacion.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'premium',
    category: 'iso_hse',
    visibility: 'public_marketplace',
    maturity: 'draft',
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
    optional_capabilities: ['iso_quality'],
    incompatible_plugins: [],
    tenant_types_allowed: ['pyme', 'dealer', 'government', 'industria'],
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
    scopes: [
      'hse_environment:read',
      'hse_sst:read',
      'sgsi:read',
      'audit_program:read',
    ],
    data_access: {
      pii: true,
      financial: false,
      payroll: false,
    },
    agent_access: {
      read_skills_allowed: true,
      write_skills_allowed: false,
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
    navigation: [],
    pages: [],
    api: [],
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
    price_code: 'bundle.pack_sig_integrado',
    revenue_share: {
      platform_percent: 100,
      partner_percent: 0,
    },
    usage_metered: false,
    suspension_policy: 'manual_review',
  },
  audit: {
    level: 'basic',
    log_reads: false,
    log_writes: true,
    retention_days: 90,
    trace_dimensions: ['organization_id', 'plugin_id'],
  },
  health: {
    checks: ['catalog', 'configuration'],
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
