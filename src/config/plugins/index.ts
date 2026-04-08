import { contabilidadCentralManifest } from '@/config/plugins/contabilidad_central.manifest';
import { crmManifest } from '@/config/plugins/crm.manifest';
import { crmScoringManifest } from '@/config/plugins/crm_scoring.manifest';
import { crmWhatsappInboxManifest } from '@/config/plugins/crm-whatsapp-inbox.manifest';
import { dealerSolicitudesManifest } from '@/config/plugins/dealer_solicitudes.manifest';
import { isoAudit19011Manifest } from '@/config/plugins/iso_audit_19011.manifest';
import { isoDesignManifest } from '@/config/plugins/iso_design_development.manifest';
import { isoEnvironment14001Manifest } from '@/config/plugins/iso_environment_14001.manifest';
import { isoInfraManifest } from '@/config/plugins/iso_infrastructure.manifest';
import { isoSgsi27001Manifest } from '@/config/plugins/iso_sgsi_27001.manifest';
import { isoSst45001Manifest } from '@/config/plugins/iso_sst_45001.manifest';
import { openclawManifest } from '@/config/plugins/openclaw.manifest';
import { packHseManifest } from '@/config/plugins/pack-hse.manifest';
import { packGovManifest } from './pack_gov.manifest';
import { packSgsiPlusManifest } from '@/config/plugins/pack_sgsi_plus.manifest';
import { packSigIntegradoManifest } from '@/config/plugins/pack_sig_integrado.manifest';
import { ptwSeguridadManifest } from '@/config/plugins/ptw_seguridad.manifest';
import { rrhhCicloVidaManifest } from '@/config/plugins/rrhh_ciclo_vida.manifest';
import { rrhhEstrategicoManifest } from '@/config/plugins/rrhh_estrategico.manifest';
import { rrhhOperacionesManifest } from '@/config/plugins/rrhh_operaciones.manifest';
import type {
  PlatformCapability,
  PluginCategory,
  PluginManifest,
  PluginMaturity,
  PluginSettingFieldSchema,
  PluginTier,
} from '@/types/plugins';

const DEFAULT_OWNER = {
  type: 'platform' as const,
  owner_id: '9001app',
  legal_name: '9001app Platform',
  support_email: 'soporte@9001app.com',
};

function mapTier(tier: PlatformCapability['tier']): PluginTier {
  switch (tier) {
    case 'opcional':
      return 'optional';
    case 'government':
      return 'premium';
    case 'premium':
      return 'premium';
    case 'base':
    default:
      return 'base';
  }
}

function mapMaturity(status: PlatformCapability['status']): PluginMaturity {
  switch (status) {
    case 'beta':
      return 'beta';
    case 'deprecated':
      return 'deprecated';
    case 'available':
      return 'draft';
    case 'active':
    default:
      return 'ga';
  }
}

function inferCategory(capability: PlatformCapability): PluginCategory {
  const source = `${capability.id} ${capability.tags.join(' ')}`.toLowerCase();

  if (source.includes('crm')) return 'crm';
  if (source.includes('rrhh') || source.includes('personal')) return 'hr';
  if (source.includes('ai')) return 'integration';
  if (source.includes('dealer')) return 'dealer';
  if (source.includes('finanza') || source.includes('credito')) return 'finance';
  if (source.includes('admin') || source.includes('usuario')) return 'integration';
  if (source.includes('iso') || source.includes('sgc') || source.includes('auditor')) {
    return 'iso_quality';
  }
  if (source.includes('proceso') || source.includes('operacion')) {
    return 'iso_quality';
  }

  return 'analytics';
}

function inferSettingField(value: unknown): PluginSettingFieldSchema {
  if (
    value &&
    typeof value === 'object' &&
    'type' in value &&
    typeof (value as { type?: unknown }).type === 'string'
  ) {
    const candidate = value as Partial<PluginSettingFieldSchema>;
    if (
      candidate.type === 'string' ||
      candidate.type === 'number' ||
      candidate.type === 'boolean'
    ) {
      return {
        type: candidate.type,
        description: candidate.description,
        enum: candidate.enum,
        min: candidate.min,
        max: candidate.max,
      };
    }
  }

  switch (typeof value) {
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'string':
    default:
      return { type: 'string' };
  }
}

function normalizeSettingsSchema(
  rawSchema: Record<string, unknown> | undefined
): Record<string, PluginSettingFieldSchema> {
  if (!rawSchema) return {};

  return Object.fromEntries(
    Object.entries(rawSchema).map(([key, value]) => [key, inferSettingField(value)])
  );
}

export function createPluginManifestFromCapability(
  capability: PlatformCapability
): PluginManifest {
  const defaults = capability.manifest.settings_schema || {};
  const settingsSchema = normalizeSettingsSchema(capability.manifest.settings_schema);

  return {
    manifest_version: '1.0',
    identity: {
      plugin_id: capability.id,
      slug: capability.id,
      display_name: capability.name,
      summary: capability.description,
      description: capability.long_description || capability.description,
      owner: DEFAULT_OWNER,
      tier: mapTier(capability.tier),
      category: inferCategory(capability),
      visibility: 'internal',
      maturity: mapMaturity(capability.status),
    },
    versioning: {
      plugin_version: capability.version,
      release_channel: capability.status === 'beta' ? 'beta' : 'stable',
      runtime_api_version: '1.0',
      data_contract_version: '1.0',
    },
    compatibility: {
      core_version_range: '*',
      required_capabilities: capability.dependencies || [],
      optional_capabilities: [],
      incompatible_plugins: [],
      tenant_types_allowed: [],
      regions_allowed: [],
      deployment_modes: ['shared_saas'],
    },
    dependencies: {
      services: [],
      secrets: [],
      migrations: {
        install: [],
        update: [],
        uninstall: [],
      },
    },
    permissions: {
      scopes: [],
      data_access: {
        pii: false,
        financial: false,
        payroll: false,
      },
      agent_access: {
        read_skills_allowed: false,
        write_skills_allowed: false,
        human_approval_required_for_write: true,
      },
    },
    tenant_settings: {
      schema_version: '1.0',
      required: Object.keys(settingsSchema).length > 0,
      defaults,
      schema: settingsSchema,
      secrets: [],
      limits: {},
    },
    routes: {
      navigation: capability.manifest.navigation.map(entry => ({
        id: `${capability.id}:${entry.href}`,
        path: entry.href,
        label: entry.name,
        feature_flag: entry.feature,
        required_scopes: [],
      })),
      pages: capability.manifest.navigation.map(entry => ({
        path: entry.href,
        type: 'internal',
        feature_flag: entry.feature,
        required_scopes: [],
      })),
      api: [],
    },
    events: {
      emits: [],
      consumes: [],
    },
    skills: {
      exposes: [],
    },
    billing: {
      model: 'free',
      price_code: `plugin.${capability.id}`,
      revenue_share: {
        platform_percent: 100,
        partner_percent: 0,
      },
      usage_metered: false,
      suspension_policy: 'manual_review',
    },
    audit: {
      level: 'basic',
      log_reads: false,
      log_writes: true,
      retention_days: 90,
      trace_dimensions: ['organization_id', 'plugin_id'],
    },
    health: {
      checks: ['catalog', 'configuration'],
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
  };
}

export const PLATFORM_PLUGIN_MANIFESTS: PluginManifest[] = [
  // Core CRM
  crmManifest,
  crmScoringManifest,
  crmWhatsappInboxManifest,
  // Dealer
  dealerSolicitudesManifest,
  // ISO Quality
  isoDesignManifest,
  isoInfraManifest,
  isoAudit19011Manifest,
  // ISO HSE
  packHseManifest,
  packSigIntegradoManifest,
  isoEnvironment14001Manifest,
  isoSst45001Manifest,
  ptwSeguridadManifest,
  // ISO SGSI
  packSgsiPlusManifest,
  isoSgsi27001Manifest,
  // Finance
  contabilidadCentralManifest,
  // HR
  rrhhCicloVidaManifest,
  rrhhOperacionesManifest,
  rrhhEstrategicoManifest,
  // Integration
  openclawManifest,
  packGovManifest,
];
