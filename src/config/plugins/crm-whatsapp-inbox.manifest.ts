import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const crmWhatsappInboxManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'crm_whatsapp_inbox',
    slug: 'crm-whatsapp-inbox',
    display_name: 'WhatsApp Inbox CRM',
    summary:
      'Inbox operativo de WhatsApp integrado con CRM. Gestion de conversaciones, simulador y configuracion por tenant.',
    description:
      'Canal de mensajeria WhatsApp unificado en el CRM. Permite recibir y enviar mensajes, simular conversaciones para testing, gestionar hilos por contacto/oportunidad, y configurar el numero de telefono y webhook por organizacion.',
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
    optional_capabilities: ['iso_quality'],
    incompatible_plugins: [],
    tenant_types_allowed: ['pyme', 'dealer', 'government', 'industria'],
    regions_allowed: ['AR'],
    deployment_modes: ['shared_saas'],
  },
  dependencies: {
    services: ['firestore', 'auth', 'whatsapp_meta_api'],
    secrets: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_VERIFY_TOKEN'],
    migrations: {
      install: [],
      update: [],
      uninstall: [],
    },
  },
  permissions: {
    scopes: [
      'whatsapp.read',
      'whatsapp.write',
      'whatsapp.admin',
      'whatsapp.simulate',
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
    required: true,
    defaults: {
      phone_number_id: '',
      webhook_verified: false,
    },
    schema: {
      phone_number_id: {
        type: 'string',
        description:
          'ID del numero de telefono de WhatsApp Business registrado en Meta.',
      },
      webhook_verified: {
        type: 'boolean',
        description:
          'Indica si el webhook fue verificado correctamente con Meta.',
      },
    },
    secrets: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_VERIFY_TOKEN'],
    limits: {
      max_conversaciones_activas: 500,
      max_mensajes_por_dia: 1000,
    },
  },
  routes: {
    navigation: [
      {
        id: 'whatsapp-inbox',
        path: '/crm/whatsapp',
        label: 'WhatsApp Inbox',
        feature_flag: 'crm_whatsapp_inbox',
        required_scopes: ['whatsapp.read'],
      },
      {
        id: 'whatsapp-config',
        path: '/configuracion/whatsapp',
        label: 'Configuracion WhatsApp',
        feature_flag: 'crm_whatsapp_inbox',
        required_scopes: ['whatsapp.admin'],
      },
    ],
    pages: [
      {
        path: '/crm/whatsapp',
        type: 'internal',
        feature_flag: 'crm_whatsapp_inbox',
        required_scopes: ['whatsapp.read'],
      },
      {
        path: '/configuracion/whatsapp',
        type: 'internal',
        feature_flag: 'crm_whatsapp_inbox',
        required_scopes: ['whatsapp.admin'],
      },
    ],
    api: [
      {
        method: 'GET',
        path: '/api/whatsapp/conversaciones',
        required_scopes: ['whatsapp.read'],
      },
      {
        method: 'POST',
        path: '/api/whatsapp/mensajes',
        required_scopes: ['whatsapp.write'],
      },
      {
        method: 'POST',
        path: '/api/whatsapp/simular',
        required_scopes: ['whatsapp.simulate'],
      },
      {
        method: 'GET',
        path: '/api/whatsapp/config',
        required_scopes: ['whatsapp.admin'],
      },
      {
        method: 'POST',
        path: '/api/whatsapp/config',
        required_scopes: ['whatsapp.admin'],
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
        skill_id: 'ver_conversaciones_whatsapp',
        mode: 'read',
        required_scopes: ['whatsapp.read'],
        approval_policy: 'none',
        handler: 'crmWhatsappInbox.skills.verConversacionesWhatsapp',
        description:
          'Consulta conversaciones de WhatsApp activas y su estado en el CRM.',
      },
      {
        skill_id: 'enviar_mensaje_whatsapp',
        mode: 'write',
        required_scopes: ['whatsapp.write'],
        approval_policy: 'human_confirmation',
        handler: 'crmWhatsappInbox.skills.enviarMensajeWhatsapp',
        description:
          'Envia un mensaje de WhatsApp a un contacto vinculado en el CRM.',
      },
      {
        skill_id: 'simular_mensaje_whatsapp',
        mode: 'write',
        required_scopes: ['whatsapp.simulate'],
        approval_policy: 'human_confirmation',
        handler: 'crmWhatsappInbox.skills.simularMensajeWhatsapp',
        description:
          'Simula la recepcion de un mensaje entrante de WhatsApp para testing.',
      },
    ],
  },
  billing: {
    model: 'subscription',
    price_code: 'crm_whatsapp_inbox_premium',
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
    retention_days: 1825,
    trace_dimensions: ['tenant_id', 'user_id', 'plugin_id', 'request_id'],
  },
  health: {
    checks: [
      'manifest_schema_valid',
      'required_settings_present',
      'routes_registered',
      'whatsapp_webhook_reachable',
    ],
    status_policy: {
      degraded_blocks_new_writes: false,
      unhealthy_blocks_enable: true,
    },
  },
  uninstall_strategy: {
    mode: 'soft_remove',
    export_required: true,
    data_retention_days: 1825,
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
