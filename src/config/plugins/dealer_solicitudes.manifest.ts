import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const dealerSolicitudesManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'dealer_solicitudes',
    slug: 'dealer-solicitudes',
    display_name: 'Solicitudes Dealer',
    summary: 'Backoffice de solicitudes dealer y catalogo comercial.',
    description:
      'Canaliza solicitudes de repuestos, servicio y consultas comerciales dentro del flujo dealer existente.',
    owner: {
      type: 'platform',
      owner_id: 'don_candido',
      legal_name: 'Don Candido Platform',
      support_email: 'soporte@doncandidoplatform.com',
    },
    tier: 'optional',
    category: 'dealer',
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
    optional_capabilities: ['crm'],
    incompatible_plugins: [],
    tenant_types_allowed: ['dealer'],
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
    scopes: ['dealer.solicitudes.read', 'dealer.solicitudes.write'],
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
      whatsapp_notificaciones: '',
    },
    schema: {
      whatsapp_notificaciones: {
        type: 'string',
        title: 'WhatsApp de notificaciones',
        description: 'Numero del operario o equipo que recibe alertas operativas.',
        format: 'phone_ar',
      },
    },
    secrets: [],
    limits: {},
  },
  routes: {
    navigation: [
      {
        id: 'dealer-solicitudes-root',
        path: '/solicitudes',
        label: 'Solicitudes',
        feature_flag: 'dealer_solicitudes',
        required_scopes: ['dealer.solicitudes.read'],
      },
      {
        id: 'dealer-catalogo-root',
        path: '/dealer/catalogo',
        label: 'Catalogo de productos',
        feature_flag: 'dealer_solicitudes',
        required_scopes: ['dealer.solicitudes.read'],
      },
    ],
    pages: [
      {
        path: '/solicitudes',
        type: 'internal',
        feature_flag: 'dealer_solicitudes',
        required_scopes: ['dealer.solicitudes.read'],
      },
      {
        path: '/dealer/catalogo',
        type: 'internal',
        feature_flag: 'dealer_solicitudes',
        required_scopes: ['dealer.solicitudes.read'],
      },
      {
        path: '/solicitudes/repuestos',
        type: 'internal',
        feature_flag: 'dealer_solicitudes',
        required_scopes: ['dealer.solicitudes.read'],
      },
    ],
    api: [
      {
        method: 'GET',
        path: '/api/solicitudes',
        required_scopes: ['dealer.solicitudes.read'],
      },
      {
        method: 'PATCH',
        path: '/api/solicitudes/[id]',
        required_scopes: ['dealer.solicitudes.write'],
      },
      {
        method: 'GET',
        path: '/api/dealer/productos',
        required_scopes: ['dealer.solicitudes.read'],
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
        required_scopes: ['dealer.solicitudes.read'],
        approval_policy: 'none',
        handler: 'dealerSolicitudes.skills.verSolicitudesAbiertas',
      },
      {
        skill_id: 'actualizar_estado_solicitud',
        mode: 'write',
        required_scopes: ['dealer.solicitudes.write'],
        approval_policy: 'human_confirmation',
        handler: 'dealerSolicitudes.skills.actualizarEstadoSolicitud',
      },
    ],
  },
  billing: {
    model: 'subscription',
    price_code: 'dealer_solicitudes_optional',
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
    data_retention_days: 90,
    reversible_within_days: 30,
    blockers: ['solicitudes_activas'],
  },
  multi_tenant: {
    isolation_model: 'logical_per_organization',
    shared_code: true,
    shared_runtime: true,
    per_tenant_overrides_allowed: true,
    tenant_override_policy: 'settings_schema_validated',
  },
});
