import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  AIPricingConfig,
  AIPricingConfigSchema,
  AI_PRICING_CACHE_TTL_MS,
  AI_PRICING_COLLECTION,
  AI_PRICING_DOC_ID,
  DEFAULT_AI_PRICING_CONFIG,
  EffectiveAIPlan,
  OrganizationAIPlanOverride,
  OrganizationAIPlanOverrideSchema,
  type ProviderPricingEntry,
} from '@/types/ai-pricing';
import { CLAUDE_PRICING } from '@/types/claude';

interface CachedConfig {
  config: AIPricingConfig;
  expiresAt: number;
}

interface OrganizationAIConfigDocument {
  ai_plan_id?: string;
  ai_plan_override?: OrganizationAIPlanOverride;
}

interface UsageSummaryForBudget {
  monthlyCost: number;
  dailyTokens: number;
}

function roundUsd(value: number): number {
  return Number(value.toFixed(6));
}

function normalizeNullableLimit(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  return value <= 0 ? null : value;
}

function buildFallbackConfig(): AIPricingConfig {
  return {
    ...DEFAULT_AI_PRICING_CONFIG,
    providers: Object.fromEntries(
      Object.entries(DEFAULT_AI_PRICING_CONFIG.providers).map(([key, provider]) => [
        key,
        {
          ...provider,
          updated_at: Timestamp.now(),
        },
      ])
    ),
    updated_at: Timestamp.now(),
  };
}

function calculateProviderBaseCost(
  provider: ProviderPricingEntry,
  tokensInput: number,
  tokensOutput: number
): number {
  const inputCost =
    (tokensInput / 1_000_000) * provider.cost_input_per_million;
  const outputCost =
    (tokensOutput / 1_000_000) * provider.cost_output_per_million;
  return inputCost + outputCost;
}

export class AIPricingService {
  private static cache: CachedConfig | null = null;

  static invalidateCache(): void {
    this.cache = null;
  }

  static async getConfig(): Promise<AIPricingConfig> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.config;
    }

    const fallbackConfig = buildFallbackConfig();

    try {
      const db = getAdminFirestore();
      const ref = db.collection(AI_PRICING_COLLECTION).doc(AI_PRICING_DOC_ID);
      const snapshot = await ref.get();

      if (!snapshot.exists) {
        this.cache = {
          config: fallbackConfig,
          expiresAt: now + AI_PRICING_CACHE_TTL_MS,
        };
        return fallbackConfig;
      }

      const parsed = AIPricingConfigSchema.safeParse(snapshot.data());
      if (!parsed.success) {
        console.error(
          '[AIPricingService] Config invalida en Firestore, usando fallback:',
          parsed.error.flatten()
        );
        this.cache = {
          config: fallbackConfig,
          expiresAt: now + AI_PRICING_CACHE_TTL_MS,
        };
        return fallbackConfig;
      }

      this.cache = {
        config: parsed.data,
        expiresAt: now + AI_PRICING_CACHE_TTL_MS,
      };
      return parsed.data;
    } catch (error) {
      console.error(
        '[AIPricingService] Error leyendo platform_config/ai_pricing, usando fallback hardcodeado:',
        error
      );

      const claudeFallback = buildFallbackConfig();
      claudeFallback.providers.claude_sonnet_4_6.cost_input_per_million =
        CLAUDE_PRICING.INPUT_PER_MILLION;
      claudeFallback.providers.claude_sonnet_4_6.cost_output_per_million =
        CLAUDE_PRICING.OUTPUT_PER_MILLION;

      this.cache = {
        config: claudeFallback,
        expiresAt: now + AI_PRICING_CACHE_TTL_MS,
      };
      return claudeFallback;
    }
  }

  static async getOrgPlan(orgId: string): Promise<EffectiveAIPlan> {
    const [config, orgConfig] = await Promise.all([
      this.getConfig(),
      this.getOrganizationAIConfig(orgId),
    ]);

    const requestedPlanId = orgConfig.ai_plan_id || config.default_plan_id;
    const basePlan =
      config.plans[requestedPlanId] || config.plans[config.default_plan_id];

    if (!basePlan) {
      throw new Error('No hay plan IA configurado por defecto');
    }

    const override = orgConfig.ai_plan_override;
    if (!override) {
      return {
        ...basePlan,
        monthly_usd_limit: normalizeNullableLimit(basePlan.monthly_usd_limit),
        daily_token_limit: normalizeNullableLimit(basePlan.daily_token_limit),
      };
    }

    return {
      ...basePlan,
      markup_pct: override.markup_pct ?? basePlan.markup_pct,
      monthly_usd_limit: normalizeNullableLimit(
        override.monthly_usd_limit ?? basePlan.monthly_usd_limit
      ),
      daily_token_limit: normalizeNullableLimit(basePlan.daily_token_limit),
      allowed_provider_keys:
        override.allowed_provider_keys?.length &&
        override.allowed_provider_keys.length > 0
          ? override.allowed_provider_keys
          : basePlan.allowed_provider_keys,
      override,
    };
  }

  static async getCost(
    orgId: string,
    providerKey: string,
    tokensInput: number,
    tokensOutput: number
  ): Promise<{
    cost_actual_usd: number;
    cost_billing_usd: number;
    plan_id: string;
  }> {
    const [config, plan] = await Promise.all([
      this.getConfig(),
      this.getOrgPlan(orgId),
    ]);

    const provider = config.providers[providerKey];
    if (!provider || !provider.enabled) {
      throw new Error(`Provider IA no disponible: ${providerKey}`);
    }

    const costActual = calculateProviderBaseCost(
      provider,
      tokensInput,
      tokensOutput
    );
    const costBilling = costActual * (1 + plan.markup_pct / 100);

    return {
      cost_actual_usd: roundUsd(costActual),
      cost_billing_usd: roundUsd(costBilling),
      plan_id: plan.id,
    };
  }

  static async checkBudget(orgId: string): Promise<{
    allowed: boolean;
    warning: boolean;
    remaining_usd: number;
    plan_id: string;
  }> {
    const [plan, usage] = await Promise.all([
      this.getOrgPlan(orgId),
      this.getUsageSummaryForBudget(orgId),
    ]);

    const monthlyLimit = normalizeNullableLimit(plan.monthly_usd_limit);
    const dailyTokenLimit = normalizeNullableLimit(plan.daily_token_limit);

    const exceededDailyTokens =
      dailyTokenLimit != null && usage.dailyTokens >= dailyTokenLimit;
    const monthlyWarning =
      monthlyLimit != null && usage.monthlyCost >= monthlyLimit * 0.8;
    const dailyWarning =
      dailyTokenLimit != null && usage.dailyTokens >= dailyTokenLimit * 0.8;

    if (monthlyLimit == null) {
      return {
        allowed: !plan.hard_stop || !exceededDailyTokens,
        warning: dailyWarning,
        remaining_usd: Number.POSITIVE_INFINITY,
        plan_id: plan.id,
      };
    }

    const remaining = roundUsd(Math.max(0, monthlyLimit - usage.monthlyCost));
    const exceededMonthlyUsd = usage.monthlyCost >= monthlyLimit;
    const warning = monthlyWarning || dailyWarning;
    const allowed =
      !plan.hard_stop || (!exceededMonthlyUsd && !exceededDailyTokens);

    return {
      allowed,
      warning,
      remaining_usd: remaining,
      plan_id: plan.id,
    };
  }

  static async isProviderAllowed(
    orgId: string,
    providerKey: string
  ): Promise<boolean> {
    const [config, plan] = await Promise.all([
      this.getConfig(),
      this.getOrgPlan(orgId),
    ]);

    const provider = config.providers[providerKey];
    if (!provider || !provider.enabled) {
      return false;
    }

    return plan.allowed_provider_keys.includes(providerKey);
  }

  private static async getOrganizationAIConfig(
    orgId: string
  ): Promise<OrganizationAIConfigDocument> {
    const db = getAdminFirestore();
    const snapshot = await db.collection('organizations').doc(orgId).get();

    if (!snapshot.exists) {
      return {};
    }

    const data = snapshot.data() || {};
    const overrideResult = OrganizationAIPlanOverrideSchema.safeParse(
      data.ai_plan_override
    );

    return {
      ai_plan_id:
        typeof data.ai_plan_id === 'string' && data.ai_plan_id.trim().length > 0
          ? data.ai_plan_id
          : undefined,
      ai_plan_override: overrideResult.success ? overrideResult.data : undefined,
    };
  }

  private static async getUsageSummaryForBudget(
    orgId: string
  ): Promise<UsageSummaryForBudget> {
    const db = getAdminFirestore();
    const now = new Date();
    const monthStart = Timestamp.fromDate(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );
    const dayStart = Timestamp.fromDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate())
    );

    const usageSnapshot = await db
      .collection('uso_claude')
      .where('organization_id', '==', orgId)
      .where('fecha', '>=', monthStart)
      .get();

    let monthlyCost = 0;
    let dailyTokens = 0;

    for (const doc of usageSnapshot.docs) {
      const data = doc.data();
      monthlyCost += Number(data.cost_billing_usd ?? data.costo_estimado ?? 0);

      const fecha =
        data.fecha instanceof Timestamp
          ? data.fecha.toDate()
          : data.fecha?.toDate?.() ?? null;

      if (fecha && fecha >= dayStart.toDate()) {
        dailyTokens += Number(data.tokens_input_real ?? data.tokens_input ?? 0);
        dailyTokens += Number(
          data.tokens_output_real ?? data.tokens_output ?? 0
        );
      }
    }

    return {
      monthlyCost: roundUsd(monthlyCost),
      dailyTokens,
    };
  }
}
