import { Timestamp } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/api/withAuth';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { AIPricingService } from '@/services/ai-core/AIPricingService';
import type {
  AIPricingConfig,
  EffectiveAIPlan,
  OrganizationAIPlanOverride,
} from '@/types/ai-pricing';
import { NextResponse } from 'next/server';

interface UsageRecord {
  id: string;
  organization_id: string | null;
  ai_plan_id: string | null;
  provider: string | null;
  model: string | null;
  fecha: Date | null;
  cost_actual_usd: number;
  cost_billing_usd: number;
  tokens_input_real: number;
  tokens_output_real: number;
}

interface OrganizationDocumentShape {
  id: string;
  name?: string;
  ai_plan_id?: string;
  ai_plan_override?: OrganizationAIPlanOverride;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function roundUsd(value: number): number {
  return Number(value.toFixed(6));
}

function toMonthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function toMonthLabel(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    month: 'short',
    year: 'numeric',
  });
}

function getMonthStarts(months: number): Date[] {
  const now = new Date();
  return Array.from({ length: months }, (_, index) => {
    const offset = months - index - 1;
    return new Date(now.getFullYear(), now.getMonth() - offset, 1);
  });
}

function resolveEffectivePlan(
  config: AIPricingConfig,
  org?: OrganizationDocumentShape
): EffectiveAIPlan {
  const requestedPlanId = org?.ai_plan_id || config.default_plan_id;
  const basePlan =
    config.plans[requestedPlanId] || config.plans[config.default_plan_id];

  if (!basePlan) {
    throw new Error('No hay plan IA por defecto configurado');
  }

  const override = org?.ai_plan_override;
  if (!override) {
    return { ...basePlan };
  }

  return {
    ...basePlan,
    markup_pct: override.markup_pct ?? basePlan.markup_pct,
    monthly_usd_limit:
      override.monthly_usd_limit ?? basePlan.monthly_usd_limit,
    allowed_provider_keys:
      override.allowed_provider_keys &&
      override.allowed_provider_keys.length > 0
        ? override.allowed_provider_keys
        : basePlan.allowed_provider_keys,
    override,
  };
}

function toUsageRecord(
  doc: FirebaseFirestore.QueryDocumentSnapshot
): UsageRecord {
  const data = doc.data();
  return {
    id: doc.id,
    organization_id:
      typeof data.organization_id === 'string' ? data.organization_id : null,
    ai_plan_id: typeof data.ai_plan_id === 'string' ? data.ai_plan_id : null,
    provider: typeof data.provider === 'string' ? data.provider : null,
    model: typeof data.model === 'string' ? data.model : null,
    fecha: parseDate(data.fecha),
    cost_actual_usd: Number(data.cost_actual_usd ?? data.costo_estimado ?? 0),
    cost_billing_usd: Number(
      data.cost_billing_usd ?? data.costo_estimado ?? 0
    ),
    tokens_input_real: Number(data.tokens_input_real ?? data.tokens_input ?? 0),
    tokens_output_real: Number(
      data.tokens_output_real ?? data.tokens_output ?? 0
    ),
  };
}

async function getOrganizationBreakdown(orgId: string) {
  const db = getAdminFirestore();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [config, organizationDoc, usageSnapshot] = await Promise.all([
    AIPricingService.getConfig(),
    db.collection('organizations').doc(orgId).get(),
    db
      .collection('uso_claude')
      .where('organization_id', '==', orgId)
      .where('fecha', '>=', Timestamp.fromDate(monthStart))
      .get(),
  ]);

  if (!organizationDoc.exists) {
    return NextResponse.json(
      { success: false, error: 'Organizacion no encontrada' },
      { status: 404 }
    );
  }

  const org = {
    id: organizationDoc.id,
    ...(organizationDoc.data() || {}),
  } as OrganizationDocumentShape;
  const plan = resolveEffectivePlan(config, org);
  const usage = usageSnapshot.docs.map(toUsageRecord);
  const totalTokens = usage.reduce(
    (sum, item) => sum + item.tokens_input_real + item.tokens_output_real,
    0
  );
  const totalCost = usage.reduce(
    (sum, item) => sum + item.cost_billing_usd,
    0
  );
  const providerMap = new Map<
    string,
    { provider: string; calls: number; cost: number; tokens: number }
  >();

  for (const item of usage) {
    const key = item.provider || 'unknown';
    const current = providerMap.get(key) || {
      provider: key,
      calls: 0,
      cost: 0,
      tokens: 0,
    };
    current.calls += 1;
    current.cost += item.cost_billing_usd;
    current.tokens += item.tokens_input_real + item.tokens_output_real;
    providerMap.set(key, current);
  }

  const monthlyLimit =
    plan.monthly_usd_limit == null || plan.monthly_usd_limit <= 0
      ? null
      : plan.monthly_usd_limit;
  const usagePct =
    monthlyLimit && monthlyLimit > 0
      ? Math.min(100, Math.round((totalCost / monthlyLimit) * 100))
      : null;
  const budget = await AIPricingService.checkBudget(orgId);

  return NextResponse.json({
    success: true,
    data: {
      organizationId: orgId,
      organizationName: org.name || orgId,
      plan,
      budget: {
        ...budget,
        remaining_usd:
          budget.remaining_usd === Number.POSITIVE_INFINITY
            ? null
            : budget.remaining_usd,
      },
      summary: {
        total_consultas: usage.length,
        total_tokens: totalTokens,
        costo_total: roundUsd(totalCost),
        usage_pct_of_limit: usagePct,
        monthly_limit_usd: monthlyLimit,
      },
      byProvider: Array.from(providerMap.values())
        .map(item => ({
          ...item,
          cost: roundUsd(item.cost),
        }))
        .sort((a, b) => b.cost - a.cost),
      recentUsage: usage
        .sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0))
        .slice(0, 10)
        .map(item => ({
          id: item.id,
          provider: item.provider,
          model: item.model,
          date: item.fecha,
          cost_billing_usd: roundUsd(item.cost_billing_usd),
          tokens_total: item.tokens_input_real + item.tokens_output_real,
        })),
    },
  });
}

async function getPlatformBreakdown() {
  const db = getAdminFirestore();
  const monthStarts = getMonthStarts(6);
  const currentMonthStart = monthStarts[monthStarts.length - 1];
  const oldestMonthStart = monthStarts[0];

  const [config, organizationsSnapshot, usageSnapshot] = await Promise.all([
    AIPricingService.getConfig(),
    db.collection('organizations').get(),
    db
      .collection('uso_claude')
      .where('fecha', '>=', Timestamp.fromDate(oldestMonthStart))
      .get(),
  ]);

  const organizations = new Map<string, OrganizationDocumentShape>(
    organizationsSnapshot.docs.map(doc => [
      doc.id,
      {
        id: doc.id,
        ...(doc.data() || {}),
      },
    ])
  );

  const usage = usageSnapshot.docs
    .map(toUsageRecord)
    .filter(item => item.fecha instanceof Date);
  const currentMonthUsage = usage.filter(
    item => item.fecha && item.fecha >= currentMonthStart
  );

  const byProviderMap = new Map<
    string,
    { provider: string; calls: number; cost: number; actualCost: number }
  >();
  const byPlanMap = new Map<
    string,
    { planId: string; calls: number; cost: number; organizations: Set<string> }
  >();
  const byOrgMap = new Map<
    string,
    { organizationId: string; name: string; cost: number; calls: number }
  >();

  for (const item of currentMonthUsage) {
    if (item.provider) {
      const provider = byProviderMap.get(item.provider) || {
        provider: item.provider,
        calls: 0,
        cost: 0,
        actualCost: 0,
      };
      provider.calls += 1;
      provider.cost += item.cost_billing_usd;
      provider.actualCost += item.cost_actual_usd;
      byProviderMap.set(item.provider, provider);
    }

    if (item.ai_plan_id) {
      const plan = byPlanMap.get(item.ai_plan_id) || {
        planId: item.ai_plan_id,
        calls: 0,
        cost: 0,
        organizations: new Set<string>(),
      };
      plan.calls += 1;
      plan.cost += item.cost_billing_usd;
      if (item.organization_id) {
        plan.organizations.add(item.organization_id);
      }
      byPlanMap.set(item.ai_plan_id, plan);
    }

    if (item.organization_id) {
      const org = organizations.get(item.organization_id);
      const current = byOrgMap.get(item.organization_id) || {
        organizationId: item.organization_id,
        name: org?.name || item.organization_id,
        cost: 0,
        calls: 0,
      };
      current.cost += item.cost_billing_usd;
      current.calls += 1;
      byOrgMap.set(item.organization_id, current);
    }
  }

  const trendSeed = new Map(
    monthStarts.map(start => [
      toMonthKey(start),
      {
        month: toMonthLabel(start),
        billingCost: 0,
        actualCost: 0,
        calls: 0,
      },
    ])
  );

  for (const item of usage) {
    if (!item.fecha) continue;
    const key = toMonthKey(item.fecha);
    const current = trendSeed.get(key);
    if (!current) continue;
    current.billingCost += item.cost_billing_usd;
    current.actualCost += item.cost_actual_usd;
    current.calls += 1;
  }

  const warnings = Array.from(byOrgMap.values())
    .map(item => {
      const org = organizations.get(item.organizationId);
      const plan = resolveEffectivePlan(config, org);
      const monthlyLimit =
        plan.monthly_usd_limit == null || plan.monthly_usd_limit <= 0
          ? null
          : plan.monthly_usd_limit;
      const usagePct =
        monthlyLimit && monthlyLimit > 0
          ? Math.round((item.cost / monthlyLimit) * 100)
          : null;

      return {
        organizationId: item.organizationId,
        name: item.name,
        planId: plan.id,
        cost: roundUsd(item.cost),
        monthlyLimitUsd: monthlyLimit,
        usagePctOfLimit: usagePct,
      };
    })
    .filter(item => (item.usagePctOfLimit ?? 0) >= 80)
    .sort((a, b) => (b.usagePctOfLimit ?? 0) - (a.usagePctOfLimit ?? 0));

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        totalCostMonth: roundUsd(
          currentMonthUsage.reduce((sum, item) => sum + item.cost_billing_usd, 0)
        ),
        totalActualCostMonth: roundUsd(
          currentMonthUsage.reduce((sum, item) => sum + item.cost_actual_usd, 0)
        ),
        totalCallsMonth: currentMonthUsage.length,
        activeOrganizationsMonth: byOrgMap.size,
        organizationsNearLimit: warnings.length,
      },
      byProvider: Array.from(byProviderMap.values())
        .map(item => ({
          ...item,
          cost: roundUsd(item.cost),
          actualCost: roundUsd(item.actualCost),
        }))
        .sort((a, b) => b.cost - a.cost),
      byPlan: Array.from(byPlanMap.values())
        .map(item => ({
          planId: item.planId,
          calls: item.calls,
          cost: roundUsd(item.cost),
          organizations: item.organizations.size,
        }))
        .sort((a, b) => b.cost - a.cost),
      topOrganizations: Array.from(byOrgMap.values())
        .map(item => {
          const org = organizations.get(item.organizationId);
          const plan = resolveEffectivePlan(config, org);
          const monthlyLimit =
            plan.monthly_usd_limit == null || plan.monthly_usd_limit <= 0
              ? null
              : plan.monthly_usd_limit;

          return {
            organizationId: item.organizationId,
            name: item.name,
            cost: roundUsd(item.cost),
            calls: item.calls,
            planId: plan.id,
            monthlyLimitUsd: monthlyLimit,
            usagePctOfLimit:
              monthlyLimit && monthlyLimit > 0
                ? Math.round((item.cost / monthlyLimit) * 100)
                : null,
          };
        })
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 10),
      monthlyTrend: monthStarts.map(start => {
        const current = trendSeed.get(toMonthKey(start));
        return {
          month: current?.month || toMonthLabel(start),
          billingCost: roundUsd(current?.billingCost || 0),
          actualCost: roundUsd(current?.actualCost || 0),
          calls: current?.calls || 0,
        };
      }),
      warnings,
    },
  });
}

export const GET = withAuth(async request => {
  try {
    const orgId = request.nextUrl.searchParams.get('orgId');
    if (orgId) {
      return getOrganizationBreakdown(orgId);
    }

    return getPlatformBreakdown();
  } catch (error) {
    console.error('[super-admin/ai-pricing/stats][GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudieron cargar las metricas de costo IA',
      },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
