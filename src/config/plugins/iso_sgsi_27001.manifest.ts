import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const isoSgsi27001Manifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'iso_sgsi_27001',
    slug: 'iso-sgsi-27001',
    display_name: 'ISO 27001 - Sistema de Gestion de Seguridad de la Informacion',
    summary:
      'SGSI conforme a ISO 27001/27002. Activos, riesgos, controles, SOA e incidentes de seguridad de la informacion.',
    description:
      'Implementa el Sistema de Gestion de Seguridad de la Informacion (SGSI) conforme a ISO 27001. Incluye inventario de activos de informacion con clasificacion por criticidad, evaluacion de riesgos SGSI con matriz de probabilidad e impacto, Declaracion de Aplicabilidad (SOA) con los controles del Anexo A, registro de controles implementados e incidentes de seguridad. Integrado con hallazgos y acciones del SGC.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'optional',
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
    optional_capabilities: ['iso_quality', 'iso_audit_19011'],
    incompatible_plugins: [],
    tenant_types_allowed: [],
    regions_allowed: [],
    deployment_modes: ['shared_saas'],
  },
  dependencies: {
    services: ['firestore', 'auth', 'audit'],
    secrets: [],
    migrations: {
      install: ['seed_soa_controles_27001'],
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
    defaults: {
      responsable_sgsi_id: '',
      alcance_sgsi: '',
    },
    schema: {
      responsable_sgsi_id: {
        type: 'string',
        description: 'ID del usuario responsable del SGSI (CISO o equivalente).',
      },
      alcance_sgsi: {
        type: 'string',
        description: 'Descripcion del alcance del SGSI de la organizacion.',
      },
    },
    secrets: [],
    limits: {
      max_activos_informacion: 500,
      max_riesgos_sgsi: 200,
    },
  },
  routes: {
    navigation: [
      {
        id: 'sgsi-dashboard',
        path: '/sgsi',
        label: 'SGSI',
        feature_flag: 'iso_sgsi_27001',
        required_scopes: ['sgsi:read'],
      },
    ],
    pages: [
      {
        path: '/sgsi',
        type: 'internal',
        feature_flag: 'iso_sgsi_27001',
        required_scopes: ['sgsi:read'],
      },
    ],
    api: [
      {
        method: 'GET',
        path: '/api/sgsi/dashboard',
        required_scopes: ['sgsi:read'],
      },
      {
        method: 'GET',
        path: '/api/sgsi/assets',
        required_scopes: ['sgsi:read'],
      },
      {
        method: 'POST',
        path: '/api/sgsi/assets',
        required_scopes: ['sgsi:write'],
      },
      {
        method: 'GET',
        path: '/api/sgsi/risks',
        required_scopes: ['sgsi:read'],
      },
      {
        method: 'POST',
        path: '/api/sgsi/risks',
        required_scopes: ['sgsi:write'],
      },
      {
        method: 'GET',
        path: '/api/sgsi/controls',
        required_scopes: ['sgsi:read'],
      },
      {
        method: 'POST',
        path: '/api/sgsi/controls',
        required_scopes: ['sgsi:write'],
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
        skill_id: 'ver_riesgos_sgsi',
        mode: 'read',
        required_scopes: ['sgsi:read'],
        approval_policy: 'none',
        handler: 'isoSgsi27001.skills.verRiesgosSgsi',
        description:
          'Consulta riesgos SGSI activos con su nivel de riesgo residual.',
      },
      {
        skill_id: 'ver_activos_criticos',
        mode: 'read',
        required_scopes: ['sgsi:read'],
        approval_policy: 'none',
        handler: 'isoSgsi27001.skills.verActivosCriticos',
        description:
          'Consulta activos de informacion clasificados como criticos o altos.',
      },
    ],
  },
  billing: {
    model: 'subscription',
    price_code: 'iso_sgsi_27001_optional',
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
