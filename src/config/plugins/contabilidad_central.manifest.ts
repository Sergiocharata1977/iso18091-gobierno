import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';
import type { PluginApiMethod } from '@/types/plugins';

const ACCOUNTING_READ_SCOPE = 'accounting:read';
const ACCOUNTING_WRITE_SCOPE = 'accounting:write';
const ACCOUNTING_ADMIN_SCOPE = 'accounting:admin';
const ACCOUNTING_EMIT_SCOPE = 'accounting:emit';

const ACCOUNTING_API_ROUTE_DEFINITIONS: Array<{
  path: string;
  methods: PluginApiMethod[];
}> = [
  { path: '/api/accounting/events', methods: ['POST'] },
  { path: '/api/accounting/entries', methods: ['GET'] },
  { path: '/api/accounting/entries/manual', methods: ['POST'] },
  { path: '/api/accounting/accounts', methods: ['GET', 'POST'] },
  { path: '/api/accounting/accounts/[id]', methods: ['GET', 'PATCH'] },
  { path: '/api/accounting/accounts/[id]/ledger', methods: ['GET'] },
  { path: '/api/accounting/rules', methods: ['GET', 'POST'] },
  { path: '/api/accounting/rules/[id]', methods: ['GET', 'PATCH'] },
  { path: '/api/accounting/periods', methods: ['GET', 'POST'] },
  { path: '/api/accounting/balance-trial', methods: ['GET'] },
  { path: '/api/accounting/balance-sheet', methods: ['GET'] },
  { path: '/api/accounting/income-statement', methods: ['GET'] },
  { path: '/api/accounting/close-period', methods: ['POST'] },
  { path: '/api/accounting/rebuild-snapshots', methods: ['POST'] },
  { path: '/api/accounting/reprocess-event', methods: ['POST'] },
];

function scopesForMethod(path: string, method: PluginApiMethod): string[] {
  if (path === '/api/accounting/events') {
    return [ACCOUNTING_EMIT_SCOPE];
  }

  if (
    path === '/api/accounting/close-period' ||
    path === '/api/accounting/rebuild-snapshots' ||
    path === '/api/accounting/reprocess-event' ||
    path.startsWith('/api/accounting/rules') ||
    (path.startsWith('/api/accounting/accounts') && method !== 'GET') ||
    (path === '/api/accounting/periods' && method !== 'GET')
  ) {
    return [ACCOUNTING_ADMIN_SCOPE];
  }

  if (path === '/api/accounting/entries/manual') {
    return [ACCOUNTING_WRITE_SCOPE];
  }

  return [ACCOUNTING_READ_SCOPE];
}

export const contabilidadCentralManifest = pluginManifestSchema.parse({
  manifest_version: '1.0',
  identity: {
    plugin_id: 'contabilidad_central',
    slug: 'contabilidad-central',
    display_name: 'Contabilidad Central',
    summary:
      'Nucleo contable por doble partida con libro diario, mayor, balance, reglas y periodos.',
    description:
      'Centraliza la contabilidad organizacional como libro unico del tenant. Los demas plugins emiten eventos contables y este plugin los transforma en asientos balanceados, auditables y administrables desde una sola fuente de verdad.',
    owner: {
      type: 'platform',
      owner_id: '9001app',
      legal_name: '9001app Platform',
      support_email: 'soporte@9001app.com',
    },
    tier: 'optional',
    category: 'finance',
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
    optional_capabilities: ['crm'],
    incompatible_plugins: [],
    tenant_types_allowed: ['pyme', 'dealer', 'industria', 'agro', 'comercio'],
    regions_allowed: ['AR'],
    deployment_modes: ['shared_saas'],
  },
  dependencies: {
    services: ['firestore', 'auth', 'audit'],
    secrets: [],
    migrations: {
      install: [
        'create_current_accounting_period',
        'seed_arg_chart_of_accounts',
      ],
      update: [],
      uninstall: [],
    },
  },
  permissions: {
    scopes: [
      ACCOUNTING_READ_SCOPE,
      ACCOUNTING_WRITE_SCOPE,
      ACCOUNTING_ADMIN_SCOPE,
      ACCOUNTING_EMIT_SCOPE,
    ],
    data_access: {
      pii: false,
      financial: true,
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
      pais_base: 'AR',
      moneda_base: 'ARS',
      seed_plan_cuentas: 'arg_general',
      requiere_aprobacion_asiento_manual: true,
      dias_gracia_periodo: 5,
    },
    schema: {
      pais_base: {
        type: 'string',
        description: 'Pais base del tenant para elegir pack contable y validaciones fiscales.',
        enum: ['AR'],
      },
      moneda_base: {
        type: 'string',
        description: 'Moneda funcional del libro mayor.',
        enum: ['ARS', 'USD'],
      },
      seed_plan_cuentas: {
        type: 'string',
        description: 'Seed inicial del plan de cuentas a instalar al activar el plugin.',
        enum: ['arg_general'],
      },
      requiere_aprobacion_asiento_manual: {
        type: 'boolean',
        description: 'Si es true, ciertos asientos manuales quedan pendientes de aprobacion.',
      },
      dias_gracia_periodo: {
        type: 'number',
        description: 'Dias de gracia para operar antes del cierre administrativo del periodo.',
        min: 0,
        max: 31,
      },
    },
    secrets: [],
    limits: {
      max_manual_entries_per_day: 500,
      max_reprocess_batch_size: 1000,
    },
  },
  routes: {
    navigation: [
      {
        id: 'accounting-dashboard',
        path: '/contabilidad',
        label: 'Contabilidad',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        id: 'accounting-plan-cuentas',
        path: '/contabilidad/plan-cuentas',
        label: 'Plan de cuentas',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_ADMIN_SCOPE],
      },
      {
        id: 'accounting-libro-diario',
        path: '/contabilidad/libro-diario',
        label: 'Libro diario',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        id: 'accounting-mayor',
        path: '/contabilidad/mayor',
        label: 'Mayor',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        id: 'accounting-balance',
        path: '/contabilidad/balance',
        label: 'Balance',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        id: 'accounting-resultados',
        path: '/contabilidad/resultados',
        label: 'Resultados',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        id: 'accounting-periodos',
        path: '/contabilidad/periodos',
        label: 'Periodos',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_ADMIN_SCOPE],
      },
      {
        id: 'accounting-reglas',
        path: '/contabilidad/reglas',
        label: 'Reglas',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_ADMIN_SCOPE],
      },
      {
        id: 'accounting-auditoria',
        path: '/contabilidad/auditoria',
        label: 'Auditoria',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_ADMIN_SCOPE],
      },
    ],
    pages: [
      {
        path: '/contabilidad',
        type: 'internal',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        path: '/contabilidad/plan-cuentas',
        type: 'internal',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_ADMIN_SCOPE],
      },
      {
        path: '/contabilidad/libro-diario',
        type: 'internal',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        path: '/contabilidad/mayor',
        type: 'internal',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        path: '/contabilidad/balance',
        type: 'internal',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        path: '/contabilidad/resultados',
        type: 'internal',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_READ_SCOPE],
      },
      {
        path: '/contabilidad/periodos',
        type: 'internal',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_ADMIN_SCOPE],
      },
      {
        path: '/contabilidad/reglas',
        type: 'internal',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_ADMIN_SCOPE],
      },
      {
        path: '/contabilidad/auditoria',
        type: 'internal',
        feature_flag: 'contabilidad_central',
        required_scopes: [ACCOUNTING_ADMIN_SCOPE],
      },
    ],
    api: ACCOUNTING_API_ROUTE_DEFINITIONS.flatMap(({ path, methods }) =>
      methods.map(method => ({
        method,
        path,
        required_scopes: scopesForMethod(path, method),
      }))
    ),
  },
  events: {
    emits: [],
    consumes: [],
  },
  skills: {
    exposes: [],
  },
  billing: {
    model: 'subscription',
    price_code: 'contabilidad_central_optional',
    revenue_share: {
      platform_percent: 100,
      partner_percent: 0,
    },
    usage_metered: false,
    suspension_policy: 'disable_write_then_read_only',
  },
  audit: {
    level: 'full',
    log_reads: true,
    log_writes: true,
    retention_days: 3650,
    trace_dimensions: ['tenant_id', 'user_id', 'plugin_id', 'request_id', 'periodo'],
  },
  health: {
    checks: [
      'manifest_schema_valid',
      'current_period_ready',
      'chart_of_accounts_seeded',
      'accounting_rules_consistent',
    ],
    status_policy: {
      degraded_blocks_new_writes: true,
      unhealthy_blocks_enable: true,
    },
  },
  uninstall_strategy: {
    mode: 'soft_remove',
    export_required: true,
    data_retention_days: 365,
    blockers: ['confirmed_accounting_entries_present'],
  },
  multi_tenant: {
    isolation_model: 'logical_per_organization',
    shared_code: true,
    shared_runtime: true,
    per_tenant_overrides_allowed: true,
    tenant_override_policy: 'settings_schema_validated',
  },
});
