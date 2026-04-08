import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const isoSst45001Manifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'iso_sst_45001',
    slug: 'iso-sst-45001',
    display_name: 'ISO 45001 — Seguridad y Salud en el Trabajo',
    summary: 'Sistema de Gestión de Seguridad y Salud en el Trabajo conforme a ISO 45001. Peligros, incidentes, EPP y objetivos SST.',
    description: 'Implementa la identificación de peligros y evaluación de riesgos, gestión de incidentes y accidentes de trabajo, control de EPP por trabajador y puesto, objetivos e indicadores SST. Integrado con el núcleo de auditorías, hallazgos y acciones del SGC.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'optional',
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
    optional_capabilities: ['iso_quality', 'iso_environment_14001'],
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
      'hse_sst:read',
      'hse_sst:write',
      'hse_sst:admin',
    ],
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
    defaults: {
      notificaciones_incidentes: '',
      umbral_siniestralidad_alerta: 3,
    },
    schema: {
      notificaciones_incidentes: {
        type: 'string',
        description: 'Email o WhatsApp del responsable SST que recibe alertas de incidentes.',
      },
      umbral_siniestralidad_alerta: {
        type: 'number',
        description: 'Cantidad de incidentes en el mes que dispara una alerta al responsable.',
        min: 1,
        max: 100,
      },
    },
    secrets: [],
    limits: {
      max_incidentes_activos: 500,
      max_peligros_registrados: 500,
    },
  },
  routes: {
    navigation: [
      {
        id: 'hse-incidentes',
        path: '/hse/incidentes',
        label: 'Incidentes SST',
        feature_flag: 'iso_sst_45001',
        required_scopes: ['hse_sst:read'],
      },
      {
        id: 'hse-peligros',
        path: '/hse/peligros',
        label: 'Identificación de Peligros',
        feature_flag: 'iso_sst_45001',
        required_scopes: ['hse_sst:read'],
      },
      {
        id: 'hse-epp',
        path: '/hse/epp',
        label: 'EPP',
        feature_flag: 'iso_sst_45001',
        required_scopes: ['hse_sst:read'],
      },
    ],
    pages: [
      {
        path: '/hse/incidentes',
        type: 'internal',
        feature_flag: 'iso_sst_45001',
        required_scopes: ['hse_sst:read'],
      },
      {
        path: '/hse/peligros',
        type: 'internal',
        feature_flag: 'iso_sst_45001',
        required_scopes: ['hse_sst:read'],
      },
      {
        path: '/hse/epp',
        type: 'internal',
        feature_flag: 'iso_sst_45001',
        required_scopes: ['hse_sst:read'],
      },
    ],
    api: [
      { method: 'GET', path: '/api/hse/incidentes', required_scopes: ['hse_sst:read'] },
      { method: 'POST', path: '/api/hse/incidentes', required_scopes: ['hse_sst:write'] },
      { method: 'GET', path: '/api/hse/peligros', required_scopes: ['hse_sst:read'] },
      { method: 'POST', path: '/api/hse/peligros', required_scopes: ['hse_sst:write'] },
      { method: 'GET', path: '/api/hse/epp', required_scopes: ['hse_sst:read'] },
      { method: 'POST', path: '/api/hse/epp', required_scopes: ['hse_sst:write'] },
    ],
  },
  events: {
    emits: [],
    consumes: [],
  },
  skills: {
    exposes: [
      {
        skill_id: 'ver_incidentes_sst',
        mode: 'read',
        required_scopes: ['hse_sst:read'],
        approval_policy: 'none',
        handler: 'isoSst45001.skills.verIncidentesSst',
        description: 'Consulta incidentes SST activos y estadísticas de siniestralidad.',
      },
    ],
  },
  billing: {
    model: 'subscription',
    price_code: 'iso_sst_45001_optional',
    revenue_share: {
      platform_percent: 100,
      partner_percent: 0,
    },
    usage_metered: false,
    suspension_policy: 'disable_write_then_read_only',
  },
  audit: {
    level: 'full',
    log_reads: false,
    log_writes: true,
    retention_days: 3650,
    trace_dimensions: ['tenant_id', 'user_id', 'plugin_id', 'request_id'],
  },
  health: {
    checks: ['manifest_schema_valid', 'routes_registered'],
    status_policy: {
      degraded_blocks_new_writes: false,
      unhealthy_blocks_enable: true,
    },
  },
  uninstall_strategy: {
    mode: 'soft_remove',
    export_required: true,
    data_retention_days: 3650,
    reversible_within_days: 30,
    blockers: ['incidentes_activos', 'investigaciones_abiertas'],
  },
  multi_tenant: {
    isolation_model: 'logical_per_organization',
    shared_code: true,
    shared_runtime: true,
    per_tenant_overrides_allowed: true,
    tenant_override_policy: 'settings_schema_validated',
  },
});
