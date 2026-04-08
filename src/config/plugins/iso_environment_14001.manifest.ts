import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const isoEnvironment14001Manifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'iso_environment_14001',
    slug: 'iso-environment-14001',
    display_name: 'ISO 14001 — Gestión Ambiental',
    summary: 'Sistema de Gestión Ambiental conforme a ISO 14001. Aspectos, impactos, objetivos y requisitos legales ambientales.',
    description: 'Implementa el ciclo PHVA ambiental de ISO 14001: identificación de aspectos e impactos ambientales, evaluación de significatividad, objetivos y metas ambientales, registro y evaluación de cumplimiento de requisitos legales. Integrado con el núcleo de auditorías y acciones del SGC.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'optional',
    category: 'iso_environment',
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
    optional_capabilities: ['iso_quality', 'iso_sst_45001'],
    incompatible_plugins: [],
    tenant_types_allowed: ['pyme', 'dealer', 'government', 'industria'],
    regions_allowed: ['AR'],
    deployment_modes: ['shared_saas'],
  },
  dependencies: {
    services: ['firestore', 'auth', 'audit'],
    secrets: [],
    migrations: {
      install: ['seed_aspectos_ambientales_iniciales'],
      update: [],
      uninstall: [],
    },
  },
  permissions: {
    scopes: [
      'hse_environment:read',
      'hse_environment:write',
      'hse_environment:admin',
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
      frecuencia_revision_legal: 'trimestral',
      notificaciones_objetivos: '',
    },
    schema: {
      frecuencia_revision_legal: {
        type: 'string',
        description: 'Frecuencia de revisión del registro de requisitos legales ambientales.',
        enum: ['mensual', 'trimestral', 'semestral', 'anual'],
      },
      notificaciones_objetivos: {
        type: 'string',
        description: 'Email del responsable ambiental que recibe alertas de objetivos vencidos.',
      },
    },
    secrets: [],
    limits: {
      max_aspectos_ambientales: 200,
      max_objetivos_ambientales: 50,
    },
  },
  routes: {
    navigation: [
      {
        id: 'hse-aspectos-ambientales',
        path: '/hse/aspectos-ambientales',
        label: 'Aspectos Ambientales',
        feature_flag: 'iso_environment_14001',
        required_scopes: ['hse_environment:read'],
      },
      {
        id: 'hse-objetivos-ambientales',
        path: '/hse/objetivos-ambientales',
        label: 'Objetivos Ambientales',
        feature_flag: 'iso_environment_14001',
        required_scopes: ['hse_environment:read'],
      },
      {
        id: 'hse-requisitos-legales',
        path: '/hse/requisitos-legales',
        label: 'Requisitos Legales',
        feature_flag: 'iso_environment_14001',
        required_scopes: ['hse_environment:admin'],
      },
    ],
    pages: [
      {
        path: '/hse/aspectos-ambientales',
        type: 'internal',
        feature_flag: 'iso_environment_14001',
        required_scopes: ['hse_environment:read'],
      },
      {
        path: '/hse/objetivos-ambientales',
        type: 'internal',
        feature_flag: 'iso_environment_14001',
        required_scopes: ['hse_environment:read'],
      },
      {
        path: '/hse/requisitos-legales',
        type: 'internal',
        feature_flag: 'iso_environment_14001',
        required_scopes: ['hse_environment:admin'],
      },
    ],
    api: [
      { method: 'GET', path: '/api/hse/aspectos-ambientales', required_scopes: ['hse_environment:read'] },
      { method: 'POST', path: '/api/hse/aspectos-ambientales', required_scopes: ['hse_environment:write'] },
      { method: 'GET', path: '/api/hse/objetivos-ambientales', required_scopes: ['hse_environment:read'] },
      { method: 'POST', path: '/api/hse/objetivos-ambientales', required_scopes: ['hse_environment:write'] },
      { method: 'GET', path: '/api/hse/requisitos-legales', required_scopes: ['hse_environment:admin'] },
      { method: 'POST', path: '/api/hse/requisitos-legales', required_scopes: ['hse_environment:admin'] },
    ],
  },
  events: {
    emits: [],
    consumes: [],
  },
  skills: {
    exposes: [
      {
        skill_id: 'ver_aspectos_ambientales',
        mode: 'read',
        required_scopes: ['hse_environment:read'],
        approval_policy: 'none',
        handler: 'isoEnvironment14001.skills.verAspectosAmbientales',
        description: 'Consulta la matriz de aspectos e impactos ambientales significativos.',
      },
      {
        skill_id: 'ver_objetivos_ambientales',
        mode: 'read',
        required_scopes: ['hse_environment:read'],
        approval_policy: 'none',
        handler: 'isoEnvironment14001.skills.verObjetivosAmbientales',
        description: 'Consulta objetivos y metas ambientales con estado de avance.',
      },
    ],
  },
  billing: {
    model: 'subscription',
    price_code: 'iso_environment_14001_optional',
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
