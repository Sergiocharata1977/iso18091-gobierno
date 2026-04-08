import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const packSgsiPlusManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  type: 'bundle',
  bundle_plugins: ['iso_sgsi_27001'],
  identity: {
    plugin_id: 'pack_sgsi_plus',
    slug: 'pack-sgsi-plus',
    display_name: 'Pack SGSI Plus',
    summary:
      'Bundle comercial para SGSI con ISO 27001 como base y espacio para extras futuros.',
    description:
      'Agrupa la base de SGSI con ISO 27001 y deja preparado el bundle para incorporar complementos futuros de seguridad, cumplimiento y gobierno sin cambiar el producto comercial.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'premium',
    category: 'iso_sgsi',
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
    optional_capabilities: ['iso_audit_19011'],
    incompatible_plugins: [],
    tenant_types_allowed: [],
    regions_allowed: [],
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
    scopes: ['sgsi:read', 'sgsi:write', 'sgsi:admin'],
    data_access: {
      pii: false,
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
    price_code: 'bundle.pack_sgsi_plus',
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
