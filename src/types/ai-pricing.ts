import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

const FirestoreTimestampSchema = z.custom<Timestamp>(
  value => value instanceof Timestamp,
  'Timestamp invalido'
);

export const ProviderPricingEntrySchema = z.object({
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  label: z.string().trim().min(1),
  cost_input_per_million: z.number().nonnegative(),
  cost_output_per_million: z.number().nonnegative(),
  enabled: z.boolean(),
  notes: z.string().trim().optional(),
  updated_at: FirestoreTimestampSchema.optional(),
});

export const AIPlanDefinitionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  description: z.string().trim().min(1),
  allowed_provider_keys: z.array(z.string().trim().min(1)).default([]),
  markup_pct: z.number().min(0),
  monthly_usd_limit: z.number().min(0).nullable(),
  daily_token_limit: z.number().int().min(0).nullable(),
  hard_stop: z.boolean(),
  enabled: z.boolean(),
});

export const AIPricingConfigSchema = z.object({
  providers: z.record(z.string(), ProviderPricingEntrySchema),
  plans: z.record(z.string(), AIPlanDefinitionSchema),
  default_plan_id: z.string().trim().min(1),
  updated_at: FirestoreTimestampSchema.optional(),
  updated_by: z.string().trim().min(1).default('system'),
});

export const OrganizationAIPlanOverrideSchema = z.object({
  markup_pct: z.number().min(0).optional(),
  monthly_usd_limit: z.number().min(0).nullable().optional(),
  allowed_provider_keys: z.array(z.string().trim().min(1)).optional(),
  note: z.string().trim().optional(),
});

export type ProviderPricingEntry = z.infer<typeof ProviderPricingEntrySchema>;
export type AIPlanDefinition = z.infer<typeof AIPlanDefinitionSchema>;
export type AIPricingConfig = z.infer<typeof AIPricingConfigSchema>;
export type OrganizationAIPlanOverride = z.infer<
  typeof OrganizationAIPlanOverrideSchema
>;

export interface EffectiveAIPlan extends AIPlanDefinition {
  override?: OrganizationAIPlanOverride;
}

export const AI_PRICING_DOC_ID = 'ai_pricing';
export const AI_PRICING_COLLECTION = 'platform_config';
export const AI_PRICING_CACHE_TTL_MS = 5 * 60 * 1000;

export const DEFAULT_AI_PRICING_CONFIG: AIPricingConfig = {
  providers: {
    claude_sonnet_4_6: {
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      label: 'Claude Sonnet 4.6 (Anthropic)',
      cost_input_per_million: 3,
      cost_output_per_million: 15,
      enabled: true,
      notes: 'Precio base inicial',
    },
    claude_haiku_4_5: {
      provider: 'claude',
      model: 'claude-haiku-4-5-20251001',
      label: 'Claude Haiku 4.5 (Anthropic)',
      cost_input_per_million: 0.25,
      cost_output_per_million: 1.25,
      enabled: true,
      notes: 'Precio base inicial',
    },
    groq_llama_70b: {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      label: 'Groq Llama 70B',
      cost_input_per_million: 0.59,
      cost_output_per_million: 0.79,
      enabled: true,
      notes: 'Precio base inicial',
    },
    groq_llama_8b: {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      label: 'Groq Llama 8B',
      cost_input_per_million: 0.05,
      cost_output_per_million: 0.08,
      enabled: true,
      notes: 'Precio base inicial',
    },
  },
  plans: {
    starter: {
      id: 'starter',
      label: 'Starter',
      description: 'Groq con hard stop y limite mensual bajo.',
      allowed_provider_keys: ['groq_llama_70b', 'groq_llama_8b'],
      markup_pct: 40,
      monthly_usd_limit: 5,
      daily_token_limit: null,
      hard_stop: true,
      enabled: true,
    },
    pro: {
      id: 'pro',
      label: 'Pro',
      description: 'Groq + Claude Haiku con alertas por consumo.',
      allowed_provider_keys: [
        'groq_llama_70b',
        'groq_llama_8b',
        'claude_haiku_4_5',
      ],
      markup_pct: 30,
      monthly_usd_limit: 20,
      daily_token_limit: null,
      hard_stop: false,
      enabled: true,
    },
    enterprise: {
      id: 'enterprise',
      label: 'Enterprise',
      description: 'Acceso completo a Groq y Claude.',
      allowed_provider_keys: [
        'groq_llama_70b',
        'groq_llama_8b',
        'claude_haiku_4_5',
        'claude_sonnet_4_6',
      ],
      markup_pct: 20,
      monthly_usd_limit: 100,
      daily_token_limit: null,
      hard_stop: false,
      enabled: true,
    },
  },
  default_plan_id: 'starter',
  updated_by: 'system',
};
