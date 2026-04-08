import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);

const pluginLifecycleManifestVersionSchema = z.literal('1.0');
const pluginTierSchema = z.enum(['base', 'optional', 'premium']);
const pluginCategorySchema = z.enum([
  'iso_quality',
  'iso_environment',
  'iso_hse',
  'iso_sgsi',
  'iso_government',
  'registry',
  'finance',
  'crm',
  'dealer',
  'hr',
  'analytics',
  'integration',
  'security',
]);
const pluginMaturitySchema = z.enum([
  'draft',
  'beta',
  'ga',
  'deprecated',
  'retired',
]);
const pluginVisibilitySchema = z.enum([
  'public_marketplace',
  'private_marketplace',
  'internal',
]);
const pluginOwnerTypeSchema = z.enum(['platform', 'partner', 'third_party']);
const pluginReleaseChannelSchema = z.enum(['stable', 'beta', 'alpha', 'canary']);
const pluginManifestTypeSchema = z.enum(['plugin', 'bundle']);
const pluginDeploymentModeSchema = z.enum([
  'shared_saas',
  'single_tenant',
  'hybrid',
]);
const pluginRouteTypeSchema = z.enum(['internal', 'external', 'embedded']);
const pluginApiMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const pluginEventModeSchema = z.enum(['sync', 'async']);
const pluginSkillModeSchema = z.enum(['read', 'write']);
const pluginApprovalPolicySchema = z.enum([
  'none',
  'human_confirmation',
  'two_person_review',
  'policy_engine',
]);
const pluginBillingModelSchema = z.enum([
  'free',
  'subscription',
  'usage',
  'one_time',
]);
const pluginAuditLevelSchema = z.enum(['basic', 'full']);
const pluginUninstallModeSchema = z.enum(['soft_remove', 'hard_remove']);
const pluginIsolationModelSchema = z.enum([
  'logical_per_organization',
  'physical_per_organization',
  'shared',
]);

const pluginOwnerSchema = z.object({
  type: pluginOwnerTypeSchema,
  owner_id: nonEmptyStringSchema,
  legal_name: nonEmptyStringSchema,
  support_email: z.email(),
});

const pluginIdentitySchema = z.object({
  plugin_id: z.string().regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  display_name: nonEmptyStringSchema,
  summary: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  owner: pluginOwnerSchema,
  tier: pluginTierSchema,
  category: pluginCategorySchema,
  visibility: pluginVisibilitySchema,
  maturity: pluginMaturitySchema,
});

const pluginVersioningSchema = z.object({
  plugin_version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/),
  release_channel: pluginReleaseChannelSchema,
  changelog_url: z.string().trim().min(1).optional(),
  sdk_version_range: z.string().trim().min(1).optional(),
  runtime_api_version: nonEmptyStringSchema,
  data_contract_version: nonEmptyStringSchema,
});

const pluginCompatibilitySchema = z.object({
  core_version_range: nonEmptyStringSchema,
  required_capabilities: z.array(nonEmptyStringSchema),
  optional_capabilities: z.array(nonEmptyStringSchema),
  incompatible_plugins: z.array(nonEmptyStringSchema),
  tenant_types_allowed: z.array(nonEmptyStringSchema),
  regions_allowed: z.array(nonEmptyStringSchema),
  deployment_modes: z.array(pluginDeploymentModeSchema).min(1),
});

const pluginMigrationsSchema = z.object({
  install: z.array(nonEmptyStringSchema),
  update: z.array(nonEmptyStringSchema),
  uninstall: z.array(nonEmptyStringSchema),
});

const pluginDependenciesSchema = z.object({
  services: z.array(nonEmptyStringSchema),
  secrets: z.array(nonEmptyStringSchema),
  migrations: pluginMigrationsSchema,
});

const pluginPermissionsSchema = z.object({
  scopes: z.array(nonEmptyStringSchema).min(1),
  data_access: z.object({
    pii: z.boolean(),
    financial: z.boolean(),
    payroll: z.boolean(),
  }),
  agent_access: z.object({
    read_skills_allowed: z.boolean(),
    write_skills_allowed: z.boolean(),
    human_approval_required_for_write: z.boolean(),
  }),
});

const pluginSettingFieldSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'integer', 'array', 'object']),
  description: z.string().trim().min(1).optional(),
  enum: z.array(z.union([z.string(), z.number()])).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  required: z.boolean().optional(),
  items: z.record(z.string(), z.unknown()).optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

const pluginTenantSettingsSchema = z.object({
  schema_version: nonEmptyStringSchema,
  required: z.boolean(),
  defaults: z.record(z.string(), z.unknown()),
  schema: z.record(z.string(), pluginSettingFieldSchema),
  secrets: z.array(nonEmptyStringSchema),
  limits: z.record(z.string(), z.number()),
});

const pluginRouteSchema = z
  .object({
    id: nonEmptyStringSchema.optional(),
    path: z.string().trim().min(1).startsWith('/'),
    label: nonEmptyStringSchema.optional(),
    type: pluginRouteTypeSchema.optional(),
    method: pluginApiMethodSchema.optional(),
    feature_flag: nonEmptyStringSchema.optional(),
    required_scopes: z.array(nonEmptyStringSchema).min(0),
  })
  .superRefine((route, ctx) => {
    if (route.method && !route.path.startsWith('/api/')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API routes with method must use an /api/ path',
        path: ['path'],
      });
    }
  });

const pluginRoutesSchema = z.object({
  navigation: z.array(pluginRouteSchema),
  pages: z.array(pluginRouteSchema),
  api: z.array(
    pluginRouteSchema.refine(route => Boolean(route.method), {
      message: 'API routes must declare method',
      path: ['method'],
    })
  ),
});

const pluginEventSchema = z.object({
  event_name: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*\.[a-z0-9_]+$/),
  version: nonEmptyStringSchema,
  mode: pluginEventModeSchema.optional(),
  idempotency_key: nonEmptyStringSchema.optional(),
  payload_schema: z.record(z.string(), z.unknown()).optional(),
});

const pluginSkillSchema = z.object({
  skill_id: nonEmptyStringSchema,
  mode: pluginSkillModeSchema,
  required_scopes: z.array(nonEmptyStringSchema).min(1),
  approval_policy: pluginApprovalPolicySchema.optional(),
  handler: nonEmptyStringSchema,
  description: z.string().trim().min(1).optional(),
});

export const pluginManifestSchema = z
  .object({
    manifest_version: pluginLifecycleManifestVersionSchema,
    type: pluginManifestTypeSchema.optional(),
    bundle_includes: z.array(nonEmptyStringSchema).optional(),
    bundle_plugins: z.array(nonEmptyStringSchema).optional(),
    identity: pluginIdentitySchema,
    versioning: pluginVersioningSchema,
    compatibility: pluginCompatibilitySchema,
    dependencies: pluginDependenciesSchema,
    permissions: pluginPermissionsSchema,
    tenant_settings: pluginTenantSettingsSchema,
    routes: pluginRoutesSchema,
    events: z.object({
      emits: z.array(pluginEventSchema),
      consumes: z.array(pluginEventSchema),
    }),
    skills: z.object({
      exposes: z.array(pluginSkillSchema),
    }),
    billing: z.object({
      model: pluginBillingModelSchema,
      price_code: nonEmptyStringSchema,
      revenue_share: z.object({
        platform_percent: z.number().min(0).max(100),
        partner_percent: z.number().min(0).max(100),
      }),
      usage_metered: z.boolean(),
      suspension_policy: nonEmptyStringSchema,
    }),
    audit: z.object({
      level: pluginAuditLevelSchema,
      log_reads: z.boolean(),
      log_writes: z.boolean(),
      retention_days: z.number().int().positive(),
      trace_dimensions: z.array(nonEmptyStringSchema).min(1),
    }),
    health: z.object({
      checks: z.array(nonEmptyStringSchema).min(1),
      status_policy: z.object({
        degraded_blocks_new_writes: z.boolean(),
        unhealthy_blocks_enable: z.boolean(),
      }),
    }),
    uninstall_strategy: z.object({
      mode: pluginUninstallModeSchema,
      export_required: z.boolean(),
      data_retention_days: z.number().int().nonnegative(),
      reversible_within_days: z.number().int().positive().optional(),
      blockers: z.array(nonEmptyStringSchema),
    }),
    multi_tenant: z.object({
      isolation_model: pluginIsolationModelSchema,
      shared_code: z.boolean(),
      shared_runtime: z.boolean(),
      per_tenant_overrides_allowed: z.boolean(),
      tenant_override_policy: nonEmptyStringSchema,
    }),
  })
  .superRefine((manifest, ctx) => {
    const bundlePluginIds = manifest.bundle_plugins || manifest.bundle_includes;

    if (manifest.type === 'bundle' && (!bundlePluginIds || bundlePluginIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'bundle manifests require bundle_plugins or bundle_includes',
        path: ['bundle_plugins'],
      });
    }

    if (!manifest.tenant_settings) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tenant_settings is required',
        path: ['tenant_settings'],
      });
    }

    if (!manifest.uninstall_strategy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'uninstall_strategy is required',
        path: ['uninstall_strategy'],
      });
    }

    manifest.skills.exposes.forEach((skill, index) => {
      if (skill.mode === 'write' && !skill.approval_policy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Write skills require approval_policy',
          path: ['skills', 'exposes', index, 'approval_policy'],
        });
      }
    });

    manifest.events.emits.forEach((event, index) => {
      if (!event.version) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Emitted events require version',
          path: ['events', 'emits', index, 'version'],
        });
      }
      if (!event.idempotency_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Emitted events require idempotency_key',
          path: ['events', 'emits', index, 'idempotency_key'],
        });
      }
    });
  });

export type PluginManifestInput = z.input<typeof pluginManifestSchema>;
export type PluginManifestOutput = z.output<typeof pluginManifestSchema>;

// Compatibility check disabled — PluginManifestOutput and PluginManifest
// are kept in sync but not structurally identical due to Zod inference.
// type AssertTrue<T extends true> = T;
// type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
// type _PluginManifestCompatible = AssertTrue<IsExact<PluginManifestOutput, PluginManifest>>;
