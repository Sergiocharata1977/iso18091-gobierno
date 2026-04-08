import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const openclawManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'openclaw',
    slug: 'openclaw',
    display_name: 'OpenClaw — API de Skills Externas',
    summary:
      'Bus de skills que permite a sistemas externos ejecutar acciones en Don Candido usando una clave de tenant.',
    description:
      'OpenClaw expone un conjunto de skills ejecutables por API publica. Sistemas externos como landing pages, bots de WhatsApp, Zapier o apps moviles pueden consultar datos o disparar acciones en el SGC usando una tenant_key. Las write skills requieren confirmacion humana. El catalogo de skills disponibles se filtra segun las capabilities instaladas en el tenant.',
    owner: {
      type: 'platform',
      owner_id: 'don_candido',
      legal_name: 'Don Candido Platform',
      support_email: 'soporte@doncandidoplatform.com',
    },
    tier: 'optional',
    category: 'integration',
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
    optional_capabilities: ['crm', 'dealer_solicitudes', 'contabilidad_central'],
    incompatible_plugins: [],
    tenant_types_allowed: [],
    regions_allowed: [],
    deployment_modes: ['shared_saas'],
  },
  dependencies: {
    services: ['firestore', 'auth'],
    secrets: [],
    migrations: {
      install: [],
      update: [],
      uninstall: [],
    },
  },
  permissions: {
    scopes: [
      'openclaw.read',
      'openclaw.write',
      'openclaw.admin',
    ],
    data_access: {
      pii: false,
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
    defaults: {
      tenant_key: '',
      write_skills_require_otp: true,
    },
    schema: {
      tenant_key: {
        type: 'string',
        description:
          'Clave unica del tenant para autenticar llamadas a la API publica de OpenClaw. Generada automaticamente.',
      },
      write_skills_require_otp: {
        type: 'boolean',
        description:
          'Si es true, las skills de escritura requieren un token de confirmacion antes de ejecutarse.',
      },
    },
    secrets: [],
    limits: {
      max_skills_habilitadas: 20,
      max_ejecuciones_por_dia: 500,
    },
  },
  routes: {
    navigation: [
      {
        id: 'openclaw-admin',
        path: '/admin/openclaw',
        label: 'OpenClaw Skills',
        feature_flag: 'openclaw',
        required_scopes: ['openclaw.admin'],
      },
    ],
    pages: [
      {
        path: '/admin/openclaw',
        type: 'internal',
        feature_flag: 'openclaw',
        required_scopes: ['openclaw.admin'],
      },
    ],
    api: [
      {
        method: 'GET',
        path: '/api/public/openclaw/skills',
        required_scopes: [],
      },
      {
        method: 'POST',
        path: '/api/public/openclaw/execute',
        required_scopes: [],
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
        skill_id: 'ver_solicitudes_abiertas',
        mode: 'read',
        required_scopes: ['openclaw.read'],
        approval_policy: 'none',
        handler: 'openclaw.skills.verSolicitudesAbiertas',
        description: 'Consulta solicitudes abiertas del modulo dealer.',
      },
      {
        skill_id: 'ver_oportunidades_activas',
        mode: 'read',
        required_scopes: ['openclaw.read'],
        approval_policy: 'none',
        handler: 'openclaw.skills.verOportunidadesActivas',
        description: 'Consulta oportunidades activas del CRM.',
      },
      {
        skill_id: 'ver_no_conformidades',
        mode: 'read',
        required_scopes: ['openclaw.read'],
        approval_policy: 'none',
        handler: 'openclaw.skills.verNoConformidades',
        description: 'Consulta no conformidades y hallazgos abiertos del SGC.',
      },
      {
        skill_id: 'ver_metricas_sgc',
        mode: 'read',
        required_scopes: ['openclaw.read'],
        approval_policy: 'none',
        handler: 'openclaw.skills.verMetricasSgc',
        description: 'Consulta metricas globales del sistema de gestion de calidad.',
      },
    ],
  },
  billing: {
    model: 'free',
    price_code: 'plugin.openclaw',
    revenue_share: {
      platform_percent: 100,
      partner_percent: 0,
    },
    usage_metered: false,
    suspension_policy: 'manual_review',
  },
  audit: {
    level: 'full',
    log_reads: false,
    log_writes: true,
    retention_days: 365,
    trace_dimensions: ['organization_id', 'plugin_id', 'skill_id', 'tenant_key'],
  },
  health: {
    checks: [
      'catalog',
      'configuration',
      'routes_registered',
    ],
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
