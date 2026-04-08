export type CapabilityStatus =
  | 'installed'
  | 'enabled'
  | 'disabled'
  | 'uninstalled';

export type PlatformCapabilityStatus =
  | 'active'
  | 'available'
  | 'beta'
  | 'deprecated';
export type CapabilityTier = 'base' | 'opcional' | 'premium' | 'government';

export interface PluginNavigationEntry {
  name: string;
  href: string;
  icon: string;
  parent?: string;
  feature: string;
  badge?: 'count' | 'alert';
  condition?: 'enabled' | 'role_min_jefe';
  roles?: string[];
}

export interface CapabilityManifest {
  capability_id: string;
  version: string;
  system_id: string;
  navigation: PluginNavigationEntry[];
  settings_schema?: Record<string, unknown>;
  datasets?: string[];
  permissions?: {
    export_roles?: string[];
    restore_roles?: string[];
  };
}

export interface PlatformCapability {
  id: string;
  name: string;
  description: string;
  version: string;
  system_ids: string[];
  scope: 'platform' | 'system';
  status: PlatformCapabilityStatus;
  tier: CapabilityTier;
  icon: string;
  color?: string;
  tags: string[];
  category?: PluginCategory; // vertical/tema del plugin (opcional para retrocompatibilidad)
  industries?: Array<{
    type: string;
    label: string;
    submodules?: Array<{
      id: string;
      label: string;
      enabled_by_default?: boolean;
    }>;
  }>;
  industry_required?: boolean;
  manifest: CapabilityManifest;
  dependencies?: string[];
  // Campos de marketing y documentación (opcionales para retrocompatibilidad)
  long_description?: string; // Texto de 2-3 párrafos para la ficha del Power
  target_audience?: string; // "Ideal para organizaciones que..."
  features?: string[]; // Lista de funcionalidades ["Doble partida automática", ...]
  benefits?: string[]; // Lista de beneficios ["Reducí el tiempo de cierre", ...]
  how_it_works?: string; // Descripción breve del flujo operativo
  screenshots?: string[]; // URLs en Firebase Storage (futuro)
  created_at?: Date;
  updated_at?: Date;
}

export interface InstalledCapability {
  id: string;
  capability_id: string;
  system_id: string;
  version_installed: string;
  industry_type?: string | null;
  submodules_enabled: string[];
  status: CapabilityStatus;
  enabled: boolean;
  settings: Record<string, unknown>;
  installed_by: string;
  installed_at: Date;
  enabled_at?: Date | null;
  disabled_at?: Date | null;
  updated_at: Date;
}

export interface CapabilityAuditEntry {
  id?: string;
  capability_id: string;
  action:
    | 'installed'
    | 'enabled'
    | 'disabled'
    | 'uninstalled'
    | 'settings_changed'
    | 'upgraded'
    | 'export_requested'
    | 'export_generated'
    | 'backup_created'
    | 'restore_started'
    | 'restore_completed'
    | 'restore_conflict';
  performed_by: string;
  performed_at: Date;
  details?: Record<string, unknown>;
  previous_state?: Record<string, unknown> | null;
}

export interface InstallCapabilityRequest {
  organization_id?: string;
  capability_id: string;
  system_id?: string;
  enabled?: boolean;
  settings?: Record<string, unknown>;
  industry_type?: string | null;
  submodules_enabled?: string[];
}

export interface ToggleCapabilityRequest {
  organization_id?: string;
  capability_id?: string;
  enabled: boolean;
}

export interface UpdateCapabilitySettingsRequest {
  organization_id?: string;
  capability_id?: string;
  settings: Record<string, unknown>;
}

export interface DeleteCapabilityRequest {
  organization_id?: string;
  capability_id?: string;
}

export interface AvailableCapabilitiesRequest {
  organization_id?: string;
  system_id?: string;
}

export type PluginLifecycleStatus =
  | 'draft'
  | 'published'
  | 'installed'
  | 'enabled'
  | 'suspended'
  | 'disabled'
  | 'deprecated'
  | 'removed';

export type PluginTier = 'base' | 'optional' | 'premium';

export type PluginCategory =
  | 'iso_quality'       // ISO 9001
  | 'iso_environment'   // ISO 14001
  | 'iso_hse'           // ISO 45001 + PTW
  | 'iso_sgsi'          // ISO 27001/27002
  | 'iso_government'    // ISO 18091
  | 'registry'          // Editor de registros configurables
  | 'finance'
  | 'crm'
  | 'dealer'
  | 'hr'
  | 'analytics'
  | 'integration'
  | 'security';

export type PluginMaturity =
  | 'draft'
  | 'beta'
  | 'ga'
  | 'deprecated'
  | 'retired';

export type PluginPermissionScope = string;

export type PluginVisibility =
  | 'public_marketplace'
  | 'private_marketplace'
  | 'internal';

export type PluginOwnerType = 'platform' | 'partner' | 'third_party';

export type PluginReleaseChannel = 'stable' | 'beta' | 'alpha' | 'canary';

export type PluginManifestType = 'plugin' | 'bundle';

export type PluginDeploymentMode =
  | 'shared_saas'
  | 'single_tenant'
  | 'hybrid';

export type PluginRouteType = 'internal' | 'external' | 'embedded';

export type PluginApiMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE';

export type PluginEventMode = 'sync' | 'async';

export type PluginSkillMode = 'read' | 'write';

export type PluginApprovalPolicy =
  | 'none'
  | 'human_confirmation'
  | 'two_person_review'
  | 'policy_engine';

export type PluginBillingModel =
  | 'free'
  | 'subscription'
  | 'usage'
  | 'one_time';

export type PluginAuditLevel = 'basic' | 'full';

export type PluginHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type PluginUninstallMode = 'soft_remove' | 'hard_remove';

export type PluginIsolationModel =
  | 'logical_per_organization'
  | 'physical_per_organization'
  | 'shared';

export type PluginCapabilityId =
  | 'crm'
  | 'crm_scoring'
  | 'dealer_solicitudes'
  | 'iso_quality'
  | 'pack_hse'
  | 'iso_infrastructure'
  | 'iso_design_development'
  | 'iso_environment_14001'
  | 'iso_sst_45001'
  | 'ptw_seguridad'
  | 'iso_audit_19011'
  | 'iso_sgsi_27001'
  | 'contabilidad_central'
  | (string & {});

export interface PluginOwner {
  type: PluginOwnerType;
  owner_id: string;
  legal_name: string;
  support_email: string;
}

export interface PluginIdentity {
  plugin_id: string;
  slug: string;
  display_name: string;
  summary: string;
  description: string;
  owner: PluginOwner;
  tier: PluginTier;
  category: PluginCategory;
  visibility: PluginVisibility;
  maturity: PluginMaturity;
}

export interface PluginVersioning {
  plugin_version: string;
  release_channel: PluginReleaseChannel;
  changelog_url?: string;
  sdk_version_range?: string;
  runtime_api_version: string;
  data_contract_version: string;
}

export interface PluginCompatibility {
  core_version_range: string;
  required_capabilities: PluginCapabilityId[];
  optional_capabilities: PluginCapabilityId[];
  incompatible_plugins: string[];
  tenant_types_allowed: string[];
  regions_allowed: string[];
  deployment_modes: PluginDeploymentMode[];
}

export interface PluginMigrations {
  install: string[];
  update: string[];
  uninstall: string[];
}

export interface PluginDependencies {
  services: string[];
  secrets: string[];
  migrations: PluginMigrations;
}

export interface PluginDataAccess {
  pii: boolean;
  financial: boolean;
  payroll: boolean;
}

export interface PluginAgentAccess {
  read_skills_allowed: boolean;
  write_skills_allowed: boolean;
  human_approval_required_for_write: boolean;
}

export interface PluginPermissions {
  scopes: PluginPermissionScope[];
  data_access: PluginDataAccess;
  agent_access: PluginAgentAccess;
}

export interface PluginSettingFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object';
  description?: string;
  enum?: Array<string | number>;
  min?: number;
  max?: number;
  required?: boolean;
  items?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}

export interface PluginTenantSettings {
  schema_version: string;
  required: boolean;
  defaults: Record<string, unknown>;
  schema: Record<string, PluginSettingFieldSchema>;
  secrets: string[];
  limits: Record<string, number>;
}

export interface PluginRoute {
  id?: string;
  path: string;
  label?: string;
  type?: PluginRouteType;
  method?: PluginApiMethod;
  feature_flag?: string;
  required_scopes: PluginPermissionScope[];
}

export interface PluginRoutes {
  navigation: PluginRoute[];
  pages: PluginRoute[];
  api: PluginRoute[];
}

export interface PluginEvent {
  event_name: string;
  version: string;
  mode?: PluginEventMode;
  idempotency_key?: string;
  payload_schema?: Record<string, unknown>;
}

export interface PluginEvents {
  emits: PluginEvent[];
  consumes: PluginEvent[];
}

export interface PluginSkill {
  skill_id: string;
  mode: PluginSkillMode;
  required_scopes: PluginPermissionScope[];
  approval_policy?: PluginApprovalPolicy;
  handler: string;
  description?: string;
}

export interface PluginSkills {
  exposes: PluginSkill[];
}

export interface PluginRevenueShare {
  platform_percent: number;
  partner_percent: number;
}

export interface PluginBilling {
  model: PluginBillingModel;
  price_code: string;
  revenue_share: PluginRevenueShare;
  usage_metered: boolean;
  suspension_policy: string;
}

export interface PluginAudit {
  level: PluginAuditLevel;
  log_reads: boolean;
  log_writes: boolean;
  retention_days: number;
  trace_dimensions: string[];
}

export interface PluginHealthPolicy {
  degraded_blocks_new_writes: boolean;
  unhealthy_blocks_enable: boolean;
}

export interface PluginHealth {
  checks: string[];
  status_policy: PluginHealthPolicy;
}

export interface PluginUninstallStrategy {
  mode: PluginUninstallMode;
  export_required: boolean;
  data_retention_days: number;
  reversible_within_days?: number;
  blockers: string[];
}

export interface PluginMultiTenant {
  isolation_model: PluginIsolationModel;
  shared_code: boolean;
  shared_runtime: boolean;
  per_tenant_overrides_allowed: boolean;
  tenant_override_policy: string;
}

export interface PluginManifest {
  manifest_version: '1.0';
  type?: PluginManifestType;
  bundle_includes?: string[];
  bundle_plugins?: string[];
  identity: PluginIdentity;
  versioning: PluginVersioning;
  compatibility: PluginCompatibility;
  dependencies: PluginDependencies;
  permissions: PluginPermissions;
  tenant_settings: PluginTenantSettings;
  routes: PluginRoutes;
  events: PluginEvents;
  skills: PluginSkills;
  billing: PluginBilling;
  audit: PluginAudit;
  health: PluginHealth;
  uninstall_strategy: PluginUninstallStrategy;
  multi_tenant: PluginMultiTenant;
}

export interface InstalledPluginBillingStatus {
  status: 'active' | 'past_due' | 'suspended' | 'canceled';
  current_plan?: string;
  usage_snapshot?: Record<string, number>;
  last_billed_at?: Date | null;
}

export interface InstalledPluginHealthSummary {
  status: PluginHealthStatus;
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    checked_at?: Date | null;
  }>;
  last_checked_at?: Date | null;
}

export interface InstalledPluginAuditSummary {
  last_event_at?: Date | null;
  last_event_by?: string | null;
  writes_last_24h?: number;
  pending_approvals?: number;
}

export interface InstalledPlugin {
  plugin_id: string;
  organization_id: string;
  version_installed: string;
  lifecycle: PluginLifecycleStatus;
  enabled: boolean;
  settings_effective: Record<string, unknown>;
  approved_overrides?: Record<string, unknown>;
  billing: InstalledPluginBillingStatus;
  health: InstalledPluginHealthSummary;
  audit_summary: InstalledPluginAuditSummary;
  install_blockers?: string[];
  pending_jobs?: string[];
  installed_by: string;
  installed_at: Date;
  updated_at: Date;
  enabled_at?: Date | null;
  disabled_at?: Date | null;
  removed_at?: Date | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
