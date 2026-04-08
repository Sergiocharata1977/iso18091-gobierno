import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const crmScoringManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'crm_risk_scoring',
    slug: 'crm-risk-scoring',
    display_name: 'CRM Risk Scoring',
    summary: 'Scoring crediticio y consulta de riesgo sobre clientes del CRM.',
    description:
      'Amplia el CRM con scoring e historico crediticio para evaluacion comercial y financiera.',
    owner: {
      type: 'platform',
      owner_id: 'don_candido',
      legal_name: 'Don Candido Platform',
      support_email: 'soporte@doncandidoplatform.com',
    },
    tier: 'premium',
    category: 'crm',
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
    required_capabilities: ['crm'],
    optional_capabilities: [],
    incompatible_plugins: [],
    tenant_types_allowed: ['dealer', 'pyme'],
    regions_allowed: ['AR'],
    deployment_modes: ['shared_saas'],
  },
  dependencies: {
    services: ['firestore', 'auth', 'audit'],
    secrets: ['nosis_api_key'],
    migrations: {
      install: [],
      update: [],
      uninstall: [],
    },
  },
  permissions: {
    scopes: ['crm.scoring.read'],
    data_access: {
      pii: true,
      financial: true,
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
    schema: {
      nosis_api_key: {
        type: 'string',
        title: 'NOSIS API Key',
        description: 'Credencial opcional para enriquecer consultas de scoring.',
      },
    },
    secrets: ['nosis_api_key'],
    limits: {},
  },
  routes: {
    navigation: [
      {
        id: 'crm-scoring-root',
        path: '/crm/gestion-crediticia',
        label: 'Scoring crediticio',
        feature_flag: 'crm_risk_scoring',
        required_scopes: ['crm.scoring.read'],
      },
    ],
    pages: [
      {
        path: '/crm/gestion-crediticia',
        type: 'internal',
        feature_flag: 'crm_risk_scoring',
        required_scopes: ['crm.scoring.read'],
      },
    ],
    api: [
      {
        method: 'GET',
        path: '/api/crm/historico/[clienteId]/scoring',
        required_scopes: ['crm.scoring.read'],
      },
      {
        method: 'GET',
        path: '/api/crm/historico/[clienteId]/nosis',
        required_scopes: ['crm.scoring.read'],
      },
    ],
  },
  events: {
    emits: [],
    consumes: [],
  },
  skills: {
    exposes: [
      {
        skill_id: 'consultar_scoring',
        mode: 'read',
        required_scopes: ['crm.scoring.read'],
        approval_policy: 'none',
        handler: 'crmScoring.skills.consultarScoring',
      },
    ],
  },
  billing: {
    model: 'subscription',
    price_code: 'crm_scoring_premium',
    revenue_share: {
      platform_percent: 100,
      partner_percent: 0,
    },
    usage_metered: false,
    suspension_policy: 'disable_write_then_suspend',
  },
  audit: {
    level: 'full',
    log_reads: true,
    log_writes: false,
    retention_days: 3650,
    trace_dimensions: ['tenant_id', 'user_id', 'plugin_id', 'request_id'],
  },
  health: {
    checks: ['manifest_schema_valid', 'dependencies_resolved', 'routes_registered'],
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
