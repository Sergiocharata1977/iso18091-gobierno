import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const ptwSeguridadManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'ptw_seguridad',
    slug: 'ptw-seguridad',
    display_name: 'PTW — Permisos de Trabajo Seguro',
    summary: 'Gestión de Permisos de Trabajo (PTW) para tareas de alto riesgo. Requiere ISO 45001.',
    description: 'Módulo de Permiso de Trabajo Seguro (PTW) para operaciones de alto riesgo: trabajo en altura, espacios confinados, trabajo en caliente, bloqueo y etiquetado (LOTO), y trabajos eléctricos. Requiere el plugin iso_sst_45001 activo. Cada permiso tiene ciclo de vida con emisión, aprobación, ejecución y cierre.',
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
    required_capabilities: ['iso_sst_45001'],
    optional_capabilities: ['iso_environment_14001'],
    incompatible_plugins: [],
    tenant_types_allowed: ['industria', 'government'],
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
      'ptw:read',
      'ptw:emit',
      'ptw:approve',
      'ptw:admin',
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
    defaults: {
      aprobadores_ptw: [],
      requiere_doble_firma: true,
      vigencia_horas_default: 8,
    },
    schema: {
      requiere_doble_firma: {
        type: 'boolean',
        description: 'Si es true, los permisos de alto riesgo requieren firma de dos aprobadores.',
      },
      vigencia_horas_default: {
        type: 'number',
        description: 'Vigencia por defecto del permiso en horas.',
        min: 1,
        max: 72,
      },
    },
    secrets: [],
    limits: {
      max_permisos_activos: 100,
    },
  },
  routes: {
    navigation: [
      {
        id: 'hse-permisos-trabajo',
        path: '/hse/permisos-trabajo',
        label: 'Permisos de Trabajo',
        feature_flag: 'ptw_seguridad',
        required_scopes: ['ptw:read'],
      },
    ],
    pages: [
      {
        path: '/hse/permisos-trabajo',
        type: 'internal',
        feature_flag: 'ptw_seguridad',
        required_scopes: ['ptw:read'],
      },
    ],
    api: [
      { method: 'GET', path: '/api/hse/permisos-trabajo', required_scopes: ['ptw:read'] },
      { method: 'POST', path: '/api/hse/permisos-trabajo', required_scopes: ['ptw:emit'] },
      { method: 'PATCH', path: '/api/hse/permisos-trabajo/[id]', required_scopes: ['ptw:approve'] },
    ],
  },
  events: {
    emits: [],
    consumes: [],
  },
  skills: {
    exposes: [
      {
        skill_id: 'ver_permisos_trabajo',
        mode: 'read',
        required_scopes: ['ptw:read'],
        approval_policy: 'none',
        handler: 'ptwSeguridad.skills.verPermisosTrabajoActivos',
        description: 'Consulta permisos de trabajo activos y pendientes de aprobación.',
      },
    ],
  },
  billing: {
    model: 'subscription',
    price_code: 'ptw_seguridad_optional',
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
    trace_dimensions: ['tenant_id', 'user_id', 'plugin_id', 'request_id', 'ptw_id'],
  },
  health: {
    checks: ['manifest_schema_valid', 'required_capabilities_installed', 'routes_registered'],
    status_policy: {
      degraded_blocks_new_writes: true,
      unhealthy_blocks_enable: true,
    },
  },
  uninstall_strategy: {
    mode: 'soft_remove',
    export_required: true,
    data_retention_days: 3650,
    reversible_within_days: 30,
    blockers: ['permisos_trabajo_activos'],
  },
  multi_tenant: {
    isolation_model: 'logical_per_organization',
    shared_code: true,
    shared_runtime: true,
    per_tenant_overrides_allowed: true,
    tenant_override_policy: 'settings_schema_validated',
  },
});
