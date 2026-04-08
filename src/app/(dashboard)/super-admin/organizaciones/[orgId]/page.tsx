'use client';

import { PageHeader } from '@/components/design-system/layout';
import { EntityDetailHeader } from '@/components/design-system/patterns/cards/EntityDetailHeader';
import { KPIStatCard } from '@/components/design-system/patterns/cards/KPIStatCard';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type { OrganizationAIPlanOverride } from '@/types/ai-pricing';
import {
  ArrowLeft,
  Bot,
  Building2,
  Globe,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

interface Organization {
  id: string;
  name: string;
  plan?: string;
  ai_plan_id?: string;
  ai_plan_override?: OrganizationAIPlanOverride;
  tenant_type?: string | null;
  tenantType?: string | null;
  settings?: {
    timezone?: string;
    currency?: string;
    language?: string;
  };
  features?: {
    private_sections?: boolean;
    ai_assistant?: boolean;
    max_users?: number;
  };
  created_at?: unknown;
  updated_at?: unknown;
}

interface OrganizationUser {
  id: string;
  email?: string;
  nombre?: string;
  rol?: string;
  activo?: boolean;
}

interface OrgMaturitySummary {
  organizationId: string;
  maturityLevel: string;
  maturityScore: number;
  companySize: string;
  lastUpdated: string | null;
}

interface ProviderPricingSummary {
  label: string;
  provider: string;
  model: string;
}

interface AIPlanSummary {
  id: string;
  label: string;
  description: string;
  monthly_usd_limit: number | null;
  hard_stop: boolean;
}

interface AIPricingConfigSummary {
  default_plan_id: string;
  providers: Record<string, ProviderPricingSummary>;
  plans: Record<string, AIPlanSummary>;
}

interface OrgAIUsageSummary {
  summary: {
    total_consultas: number;
    total_tokens: number;
    costo_total: number;
    usage_pct_of_limit: number | null;
    monthly_limit_usd: number | null;
  };
  budget: {
    allowed: boolean;
    warning: boolean;
    remaining_usd: number | null;
    plan_id: string;
  };
  byProvider: Array<{
    provider: string;
    calls: number;
    cost: number;
    tokens: number;
  }>;
}

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds?: unknown }).seconds === 'number'
  ) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: unknown) {
  const date = normalizeDate(value);
  return date ? date.toLocaleDateString('es-AR') : 'Sin registro';
}

export default function OrganizacionDetailPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [maturity, setMaturity] = useState<OrgMaturitySummary | null>(null);
  const [aiPricing, setAiPricing] = useState<AIPricingConfigSummary | null>(null);
  const [aiUsage, setAiUsage] = useState<OrgAIUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrganization = useCallback(async () => {
    setLoading(true);
    try {
      const [orgRes, usersRes, maturityRes, aiPricingRes, aiUsageRes] = await Promise.all([
        fetch(`/api/super-admin/organizations/${params.orgId}`, { cache: 'no-store' }),
        fetch(`/api/super-admin/organizations/${params.orgId}/users`, { cache: 'no-store' }),
        fetch('/api/super-admin/maturity', { cache: 'no-store' }),
        fetch('/api/super-admin/ai-pricing', { cache: 'no-store' }),
        fetch(`/api/super-admin/ai-pricing/stats?orgId=${params.orgId}`, { cache: 'no-store' }),
      ]);

      const [orgData, usersData, maturityData, aiPricingData, aiUsageData] = await Promise.all([
        orgRes.json(),
        usersRes.json(),
        maturityRes.json(),
        aiPricingRes.json(),
        aiUsageRes.json(),
      ]);

      if (orgData.organization) {
        setOrganization(orgData.organization);
      }

      setUsers(usersData.users || []);
      setMaturity(
        (maturityData.organizations || []).find(
          (item: OrgMaturitySummary) => item.organizationId === params.orgId
        ) || null
      );
      setAiPricing(aiPricingData?.success ? aiPricingData.data : null);
      setAiUsage(aiUsageData?.success ? aiUsageData.data : null);
    } catch (error) {
      console.error('Error al cargar organizacion:', error);
    } finally {
      setLoading(false);
    }
  }, [params.orgId]);

  useEffect(() => {
    if (user && user.rol !== 'super_admin') {
      router.push('/dashboard');
      return;
    }

    if (params.orgId) {
      void loadOrganization();
    }
  }, [loadOrganization, params.orgId, router, user]);

  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      await loadOrganization();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/organizations/${params.orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organization),
      });

      if (!res.ok) throw new Error('Error al guardar');

      await loadOrganization();
      alert('Organizacion actualizada correctamente');
    } catch (error) {
      console.error('Error al guardar organizacion:', error);
      alert('No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Estas seguro de eliminar esta organizacion? Esta accion no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch(`/api/super-admin/organizations/${params.orgId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      router.push('/super-admin/organizaciones');
    } catch (error) {
      console.error('Error al eliminar organizacion:', error);
      alert('No se pudo eliminar la organizacion');
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(member => member.activo !== false).length;
  const maxUsers = organization?.features?.max_users || 0;
  const userOccupancy = maxUsers > 0 ? Math.min(100, Math.round((totalUsers / maxUsers) * 100)) : 0;
  const tenantType = organization?.tenant_type || organization?.tenantType || 'single tenant';
  const selectedAiPlanId =
    organization?.ai_plan_id || aiPricing?.default_plan_id || '';
  const selectedAiPlan =
    (selectedAiPlanId && aiPricing?.plans[selectedAiPlanId]) || null;
  const selectedOverrideProviders =
    organization?.ai_plan_override?.allowed_provider_keys || [];
  const usagePct = aiUsage?.summary.usage_pct_of_limit ?? null;

  const updateAiOverride = (patch: Partial<OrganizationAIPlanOverride>) => {
    if (!organization) return;

    setOrganization({
      ...organization,
      ai_plan_override: {
        ...(organization.ai_plan_override || {}),
        ...patch,
      },
    });
  };

  const clearAiOverrideField = (field: keyof OrganizationAIPlanOverride) => {
    if (!organization?.ai_plan_override) return;

    const nextOverride = { ...organization.ai_plan_override };
    delete nextOverride[field];

    setOrganization({
      ...organization,
      ai_plan_override: nextOverride,
    });
  };

  const toggleOverrideProvider = (providerKey: string) => {
    const current = selectedOverrideProviders;
    const next = current.includes(providerKey)
      ? current.filter(item => item !== providerKey)
      : [...current, providerKey];

    updateAiOverride({ allowed_provider_keys: next });
  };

  const headerTags = useMemo(
    () => [
      { label: organization?.plan || 'Sin plan', color: 'blue' as const },
      { label: tenantType, color: 'green' as const },
      {
        label: maturity?.maturityLevel || 'Inicial',
        color: maturity?.maturityScore && maturity.maturityScore >= 70 ? ('purple' as const) : ('gray' as const),
      },
    ],
    [maturity?.maturityLevel, maturity?.maturityScore, organization?.plan, tenantType]
  );

  if (loading) {
    return (
      <div className="ledger-shell min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10">
          <div className="ledger-panel rounded-[28px] px-8 py-10 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
            <p className="mt-4 text-sm text-slate-600">Cargando organizacion...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <BaseCard className="border-amber-200 bg-amber-50 text-amber-900">
          No se encontro la organizacion.
        </BaseCard>
      </div>
    );
  }

  return (
    <div className="ledger-shell min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Ficha de organizacion"
          description="El detalle operativo y de configuracion vive aca. La vista global queda como monitor de entrada."
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Organizaciones', href: '/super-admin/organizaciones' },
            { label: organization.name },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push('/super-admin/organizaciones')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button variant="outline" onClick={() => void refreshMetrics()} disabled={refreshing}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
              <Button className="ledger-primary-button border-0" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          }
        />

        <section className="ledger-panel rounded-[28px] p-4 md:p-6">
          <EntityDetailHeader
            name={organization.name}
            subtitle={organization.id}
            tags={headerTags}
            stats={[
              { label: 'USUARIOS', value: `${activeUsers}/${maxUsers || '-'} ` },
              { label: 'MADUREZ', value: `${maturity?.maturityScore || 0}%` },
              { label: 'TAMANO', value: maturity?.companySize || 'Sin dato' },
            ]}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPIStatCard
              label="USUARIOS ACTIVOS"
              value={String(activeUsers)}
              progress={{
                value: userOccupancy,
                label: maxUsers ? `${totalUsers} de ${maxUsers} ocupados` : 'Sin limite definido',
                color: userOccupancy >= 85 ? 'warning' : 'success',
              }}
              subtext={`Total cargados: ${totalUsers}`}
              icon={<Users className="h-5 w-5" />}
            />
            <KPIStatCard
              label="MADUREZ GLOBAL"
              value={`${maturity?.maturityScore || 0}%`}
              trend={{
                value: maturity?.maturityLevel || 'Inicial',
                direction: (maturity?.maturityScore || 0) >= 60 ? 'up' : 'neutral',
              }}
              subtext={`Actualizado: ${formatDate(maturity?.lastUpdated)}`}
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <KPIStatCard
              label="TENANCY"
              value={tenantType}
              subtext="Aislamiento operativo de datos"
              icon={<Building2 className="h-5 w-5" />}
            />
            <KPIStatCard
              label="IDIOMA / ZONA"
              value={organization.settings?.language || 'es'}
              subtext={organization.settings?.timezone || 'Sin timezone'}
              icon={<Globe className="h-5 w-5" />}
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <BaseCard className="ledger-panel border-white/60 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Configuracion base
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  Datos estructurales de la organizacion
                </h2>
              </div>
              <BaseBadge variant="outline">Single view</BaseBadge>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Nombre">
                <Input
                  value={organization.name}
                  onChange={e => setOrganization({ ...organization, name: e.target.value })}
                />
              </Field>
              <Field label="Plan">
                <Input
                  value={organization.plan || ''}
                  onChange={e => setOrganization({ ...organization, plan: e.target.value })}
                />
              </Field>
              <Field label="Zona horaria">
                <Input
                  value={organization.settings?.timezone || ''}
                  onChange={e =>
                    setOrganization({
                      ...organization,
                      settings: {
                        ...organization.settings,
                        timezone: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Moneda">
                <Input
                  value={organization.settings?.currency || ''}
                  onChange={e =>
                    setOrganization({
                      ...organization,
                      settings: {
                        ...organization.settings,
                        currency: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Idioma">
                <Input
                  value={organization.settings?.language || ''}
                  onChange={e =>
                    setOrganization({
                      ...organization,
                      settings: {
                        ...organization.settings,
                        language: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Maximo de usuarios">
                <Input
                  type="number"
                  value={organization.features?.max_users || 0}
                  onChange={e =>
                    setOrganization({
                      ...organization,
                      features: {
                        ...organization.features,
                        max_users: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </Field>
            </div>
          </BaseCard>

          <div className="grid gap-6">
            <BaseCard className="ledger-panel border-white/60 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Estado operativo
              </p>
              <div className="mt-5 space-y-4">
                <ToggleRow
                  label="Secciones privadas"
                  description="Controla si la organizacion trabaja con areas internas segregadas."
                  checked={organization.features?.private_sections || false}
                  onChange={checked =>
                    setOrganization({
                      ...organization,
                      features: {
                        ...organization.features,
                        private_sections: checked,
                      },
                    })
                  }
                />
                <ToggleRow
                  label="Asistente IA"
                  description="Habilita el apoyo contextual dentro de la operacion de la organizacion."
                  checked={organization.features?.ai_assistant || false}
                  onChange={checked =>
                    setOrganization({
                      ...organization,
                      features: {
                        ...organization.features,
                        ai_assistant: checked,
                      },
                    })
                  }
                />
              </div>
            </BaseCard>

            <BaseCard className="ledger-panel border-white/60 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Lectura de organizacion
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    Lo que conviene ver aca y no en la grilla global
                  </h2>
                </div>
                <BaseBadge variant="success">Detalle</BaseBadge>
              </div>
              <div className="mt-5 grid gap-3">
                <InfoRow label="Creada" value={formatDate(organization.created_at)} />
                <InfoRow label="Ultima actualizacion" value={formatDate(organization.updated_at)} />
                <InfoRow label="Usuarios cargados" value={String(totalUsers)} />
                <InfoRow label="Usuarios activos" value={String(activeUsers)} />
                <InfoRow label="Nivel de madurez" value={maturity?.maturityLevel || 'Inicial'} />
              </div>
              <Button
                variant="outline"
                className="mt-5 w-full"
                onClick={() => router.push(`/super-admin/organizaciones/${params.orgId}/usuarios`)}
              >
                <Users className="mr-2 h-4 w-4" />
                Ver usuarios de la organizacion
              </Button>
            </BaseCard>
          </div>
        </section>

        <BaseCard className="ledger-panel border-white/60 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Resumen funcional
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Capas que deberian convivir tambien en comparativas futuras
              </h2>
            </div>
            <Bot className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryBox
              title="Configuracion"
              description="Plan, idioma, moneda, timezone y limites operativos."
            />
            <SummaryBox
              title="Uso"
              description="Cantidad de usuarios, ocupacion, activacion y madurez actual."
            />
            <SummaryBox
              title="Comparacion futura"
              description="Estos mismos ejes pueden repetirse despues en vistas comparativas globales."
            />
          </div>
        </BaseCard>

        <BaseCard className="ledger-panel border-white/60 shadow-[0_12px_32px_rgba(25,28,29,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                IA y consumo
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Plan asignado, override y lectura mensual
              </h2>
            </div>
            <BaseBadge
              variant={
                aiUsage?.budget.warning
                  ? 'warning'
                  : aiUsage?.budget.allowed === false
                    ? 'destructive'
                    : 'success'
              }
            >
              {aiUsage?.budget.allowed === false
                ? 'Presupuesto agotado'
                : aiUsage?.budget.warning
                  ? 'Cerca del limite'
                  : 'Dentro de presupuesto'}
            </BaseBadge>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <Field label="Plan IA asignado">
                <Select
                  value={selectedAiPlanId}
                  onValueChange={value =>
                    setOrganization({
                      ...organization,
                      ai_plan_id: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plan IA" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(aiPricing?.plans || {}).map(([planKey, plan]) => (
                      <SelectItem key={planKey} value={planKey}>
                        {plan.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Override markup %">
                  <Input
                    type="number"
                    placeholder={
                      selectedAiPlan ? `${selectedAiPlan.label} hereda markup` : 'Heredar'
                    }
                    value={organization.ai_plan_override?.markup_pct ?? ''}
                    onChange={e =>
                      updateAiOverride({
                        markup_pct:
                          e.target.value.trim() === ''
                            ? undefined
                            : Number(e.target.value) || 0,
                      })
                    }
                  />
                  <button
                    type="button"
                    className="text-xs text-slate-500 underline"
                    onClick={() => clearAiOverrideField('markup_pct')}
                  >
                    Heredar valor del plan
                  </button>
                </Field>
                <Field label="Override limite mensual USD">
                  <Input
                    type="number"
                    placeholder={
                      selectedAiPlan?.monthly_usd_limit != null
                        ? String(selectedAiPlan.monthly_usd_limit)
                        : 'Sin limite'
                    }
                    value={organization.ai_plan_override?.monthly_usd_limit ?? ''}
                    onChange={e =>
                      updateAiOverride({
                        monthly_usd_limit:
                          e.target.value.trim() === ''
                            ? undefined
                            : Number(e.target.value) <= 0
                              ? null
                              : Number(e.target.value),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="text-xs text-slate-500 underline"
                    onClick={() => clearAiOverrideField('monthly_usd_limit')}
                  >
                    Heredar valor del plan
                  </button>
                </Field>
              </div>

              <Field label="Nota interna del override">
                <Textarea
                  value={organization.ai_plan_override?.note || ''}
                  placeholder="Acuerdo comercial, motivo del override, fecha."
                  onChange={e =>
                    updateAiOverride({
                      note: e.target.value || undefined,
                    })
                  }
                />
              </Field>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-medium text-slate-700">
                    Modelos override
                  </Label>
                  <button
                    type="button"
                    className="text-xs text-slate-500 underline"
                    onClick={() => clearAiOverrideField('allowed_provider_keys')}
                  >
                    Heredar modelos del plan
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(aiPricing?.providers || {}).map(([providerKey, provider]) => (
                    <label
                      key={providerKey}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3"
                    >
                      <Checkbox
                        checked={selectedOverrideProviders.includes(providerKey)}
                        onCheckedChange={() => toggleOverrideProvider(providerKey)}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {provider.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {provider.provider} · {provider.model}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white/80 p-5">
              <InfoRow
                label="Plan efectivo"
                value={selectedAiPlan?.label || selectedAiPlanId || 'Sin plan'}
              />
              <InfoRow
                label="Consultas este mes"
                value={String(aiUsage?.summary.total_consultas || 0)}
              />
              <InfoRow
                label="Costo este mes"
                value={`USD ${Number(aiUsage?.summary.costo_total || 0).toFixed(2)}`}
              />
              <InfoRow
                label="Tokens este mes"
                value={String(aiUsage?.summary.total_tokens || 0)}
              />
              <InfoRow
                label="Remanente"
                value={
                  aiUsage?.budget.remaining_usd == null
                    ? 'Sin limite'
                    : `USD ${Number(aiUsage?.budget.remaining_usd || 0).toFixed(2)}`
                }
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>Consumo mensual</span>
                  <span>
                    {usagePct != null
                      ? `${usagePct}%`
                      : aiUsage?.summary.monthly_limit_usd == null
                        ? 'Sin limite'
                        : '0%'}
                  </span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      (usagePct || 0) >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(usagePct || 0, 100)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {aiUsage?.summary.monthly_limit_usd == null
                    ? 'Este tenant no tiene limite mensual efectivo.'
                    : `Limite efectivo: USD ${Number(
                        aiUsage?.summary.monthly_limit_usd || 0
                      ).toFixed(2)}`}
                </p>
              </div>

              {aiUsage?.byProvider?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Distribucion por provider
                  </p>
                  {aiUsage.byProvider.map(item => (
                    <div
                      key={item.provider}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-slate-900">
                        {item.provider}
                      </span>
                      <span className="text-slate-600">
                        USD {item.cost.toFixed(2)} · {item.calls} llamadas
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div>
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/75 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function SummaryBox({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
