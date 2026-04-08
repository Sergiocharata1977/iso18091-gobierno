import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const isoAudit19011Manifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'iso_audit_19011',
    slug: 'iso-audit-19011',
    display_name: 'ISO 19011 — Programa de Auditorías',
    summary: 'Gestión de programas de auditoría multistandard conforme a ISO 19011. Planifica, asigna y cierra auditorías de múltiples normas desde un único módulo.',
    description: 'Centraliza la planificación anual de auditorías para múltiples normas ISO (9001, 14001, 45001, 27001). Define programas por ejercicio, asigna auditores calificados por norma, planifica y ejecuta auditorías individuales, y enlaza con los módulos de hallazgos y acciones del núcleo. Los perfiles de auditor se certifican por norma habilitada.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'optional',
    category: 'iso_quality',
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
    optional_capabilities: ['iso_quality', 'iso_environment_14001', 'iso_sst_45001', 'iso_sgsi_27001'],
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
    scopes: [
      'audit_program:read',
      'audit_program:write',
      'audit_program:admin',
    ],
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
      ejercicio_actual: '',
      responsable_programa_id: '',
    },
    schema: {
      ejercicio_actual: {
        type: 'string',
        description: 'Año del ejercicio actual para el programa de auditorías (YYYY).',
      },
      responsable_programa_id: {
        type: 'string',
        description: 'ID del usuario responsable del programa anual de auditorías.',
      },
    },
    secrets: [],
    limits: {
      max_programas_por_ejercicio: 3,
      max_auditorias_por_programa: 50,
    },
  },
  routes: {
    navigation: [
      {
        id: 'audit-programa',
        path: '/auditoria-programa',
        label: 'Programa de Auditorías',
        feature_flag: 'iso_audit_19011',
        required_scopes: ['audit_program:read'],
      },
    ],
    pages: [
      {
        path: '/auditoria-programa',
        type: 'internal',
        feature_flag: 'iso_audit_19011',
        required_scopes: ['audit_program:read'],
      },
    ],
    api: [
      { method: 'GET', path: '/api/audit-programs', required_scopes: ['audit_program:read'] },
      { method: 'POST', path: '/api/audit-programs', required_scopes: ['audit_program:write'] },
      { method: 'GET', path: '/api/audit-programs/[id]', required_scopes: ['audit_program:read'] },
      { method: 'PATCH', path: '/api/audit-programs/[id]', required_scopes: ['audit_program:write'] },
    ],
  },
  events: {
    emits: [],
    consumes: [],
  },
  skills: {
    exposes: [
      {
        skill_id: 'ver_programa_auditorias',
        mode: 'read',
        required_scopes: ['audit_program:read'],
        approval_policy: 'none',
        handler: 'isoAudit19011.skills.verProgramaAuditorias',
        description: 'Consulta el programa anual de auditorías: planificadas, completadas y pendientes por norma.',
      },
    ],
  },
  billing: {
    model: 'subscription',
    price_code: 'iso_audit_19011_optional',
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
    trace_dimensions: ['tenant_id', 'user_id', 'plugin_id', 'program_id'],
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
    export_required: false,
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
