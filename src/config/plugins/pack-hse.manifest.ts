import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const packHseManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  type: 'bundle',
  bundle_plugins: ['iso_environment_14001', 'iso_sst_45001', 'ptw_seguridad'],
  identity: {
    plugin_id: 'pack_hse',
    slug: 'pack-hse',
    display_name: 'Pack HSE — Seguridad, Salud y Medio Ambiente',
    summary: 'ISO 14001 (Medio Ambiente) + ISO 45001 (SST) integrados en un solo pack premium.',
    description:
      'Aspectos ambientales, identificacion de peligros, gestion de incidentes, control de EPP, objetivos ambientales y de SST, y registro de requisitos legales con evaluacion de cumplimiento.',
    owner: {
      type: 'platform',
      owner_id: 'don_candido',
      legal_name: 'Don Candido Platform',
      support_email: 'soporte@doncandidoplatform.com',
    },
    tier: 'premium',
    category: 'iso_hse',
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
    scopes: ['hse.read', 'hse.write', 'hse.admin'],
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
    required: true,
    defaults: {
      notificaciones_incidentes: '',
      frecuencia_revision_legal: 'trimestral',
    },
    schema: {
      notificaciones_incidentes: {
        type: 'string',
        description: 'Email o WhatsApp del responsable HSE que recibe alertas de incidentes.',
      },
      frecuencia_revision_legal: {
        type: 'string',
        description: 'Frecuencia de revision del registro de requisitos legales.',
        enum: ['mensual', 'trimestral', 'semestral', 'anual'],
      },
    },
    secrets: [],
    limits: {
      max_incidentes_activos: 500,
      max_aspectos_ambientales: 200,
    },
  },
  routes: {
    navigation: [
      {
        id: 'hse-dashboard',
        path: '/hse',
        label: 'Dashboard HSE',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        id: 'hse-incidentes',
        path: '/hse/incidentes',
        label: 'Incidentes SST',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        id: 'hse-peligros',
        path: '/hse/peligros',
        label: 'Identificacion de Peligros',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        id: 'hse-aspectos-ambientales',
        path: '/hse/aspectos-ambientales',
        label: 'Aspectos Ambientales',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        id: 'hse-objetivos-ambientales',
        path: '/hse/objetivos-ambientales',
        label: 'Objetivos Ambientales',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        id: 'hse-requisitos-legales',
        path: '/hse/requisitos-legales',
        label: 'Requisitos Legales',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        id: 'hse-epp',
        path: '/hse/epp',
        label: 'EPP',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
    ],
    pages: [
      {
        path: '/hse',
        type: 'internal',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        path: '/hse/incidentes',
        type: 'internal',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        path: '/hse/peligros',
        type: 'internal',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        path: '/hse/aspectos-ambientales',
        type: 'internal',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        path: '/hse/objetivos-ambientales',
        type: 'internal',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        path: '/hse/requisitos-legales',
        type: 'internal',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
      {
        path: '/hse/epp',
        type: 'internal',
        feature_flag: 'pack_hse',
        required_scopes: ['hse.read'],
      },
    ],
    api: [
      {
        method: 'GET',
        path: '/api/hse/incidentes',
        required_scopes: ['hse.read'],
      },
      {
        method: 'POST',
        path: '/api/hse/incidentes',
        required_scopes: ['hse.write'],
      },
      {
        method: 'GET',
        path: '/api/hse/peligros',
        required_scopes: ['hse.read'],
      },
      {
        method: 'POST',
        path: '/api/hse/peligros',
        required_scopes: ['hse.write'],
      },
      {
        method: 'GET',
        path: '/api/hse/aspectos-ambientales',
        required_scopes: ['hse.read'],
      },
      {
        method: 'POST',
        path: '/api/hse/aspectos-ambientales',
        required_scopes: ['hse.write'],
      },
      {
        method: 'GET',
        path: '/api/hse/objetivos-ambientales',
        required_scopes: ['hse.read'],
      },
      {
        method: 'POST',
        path: '/api/hse/objetivos-ambientales',
        required_scopes: ['hse.write'],
      },
      {
        method: 'GET',
        path: '/api/hse/requisitos-legales',
        required_scopes: ['hse.read'],
      },
      {
        method: 'POST',
        path: '/api/hse/requisitos-legales',
        required_scopes: ['hse.write'],
      },
      {
        method: 'GET',
        path: '/api/hse/epp',
        required_scopes: ['hse.read'],
      },
      {
        method: 'POST',
        path: '/api/hse/epp',
        required_scopes: ['hse.write'],
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
        skill_id: 'ver_incidentes_hse',
        mode: 'read',
        required_scopes: ['hse.read'],
        approval_policy: 'none',
        handler: 'packHse.skills.verIncidentesHse',
        description: 'Consulta incidentes SST activos y estadisticas de siniestralidad.',
      },
      {
        skill_id: 'registrar_incidente_hse',
        mode: 'write',
        required_scopes: ['hse.write'],
        approval_policy: 'human_confirmation',
        handler: 'packHse.skills.registrarIncidenteHse',
        description: 'Registra un nuevo incidente, accidente o casi-accidente.',
      },
      {
        skill_id: 'ver_aspectos_ambientales',
        mode: 'read',
        required_scopes: ['hse.read'],
        approval_policy: 'none',
        handler: 'packHse.skills.verAspectosAmbientales',
        description: 'Consulta la matriz de aspectos e impactos ambientales.',
      },
    ],
  },
  billing: {
    model: 'subscription',
    price_code: 'pack_hse_premium',
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
    checks: ['manifest_schema_valid', 'required_settings_present', 'routes_registered'],
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
