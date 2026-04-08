'use client';

import { PageHeader } from '@/components/design-system';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Bot,
  DollarSign,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

interface ProviderPricingEntry {
  provider: string;
  model: string;
  label: string;
  cost_input_per_million: number;
  cost_output_per_million: number;
  enabled: boolean;
  notes?: string;
}

interface AIPlanDefinition {
  id: string;
  label: string;
  description: string;
  allowed_provider_keys: string[];
  markup_pct: number;
  monthly_usd_limit: number | null;
  daily_token_limit: number | null;
  hard_stop: boolean;
  enabled: boolean;
}

interface AIPricingConfigResponse {
  providers: Record<string, ProviderPricingEntry>;
  plans: Record<string, AIPlanDefinition>;
  default_plan_id: string;
  updated_by?: string;
}

const EMPTY_PROVIDER: ProviderPricingEntry = {
  provider: 'groq',
  model: '',
  label: '',
  cost_input_per_million: 0,
  cost_output_per_million: 0,
  enabled: true,
  notes: '',
};

const EMPTY_PLAN: AIPlanDefinition = {
  id: '',
  label: '',
  description: '',
  allowed_provider_keys: [],
  markup_pct: 0,
  monthly_usd_limit: null,
  daily_token_limit: null,
  hard_stop: false,
  enabled: true,
};

function createProviderKey() {
  return `custom_provider_${Date.now()}`;
}

function createPlanKey() {
  return `custom_plan_${Date.now()}`;
}

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed <= 0 ? null : parsed;
}

export default function SuperAdminIAPricingPage() {
  const [config, setConfig] = useState<AIPricingConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const providerEntries = useMemo(
    () => Object.entries(config?.providers || {}),
    [config?.providers]
  );
  const planEntries = useMemo(
    () => Object.entries(config?.plans || {}),
    [config?.plans]
  );

  const loadConfig = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const response = await fetch('/api/super-admin/ai-pricing', {
        cache: 'no-store',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setMessage(json?.error || 'No se pudo cargar la configuracion IA.');
        return;
      }
      setConfig(json.data);
    } catch {
      setMessage('Error de red cargando la configuracion IA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/super-admin/ai-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setMessage(json?.error || 'No se pudo guardar la configuracion.');
        return;
      }
      setConfig(json.data);
      setMessage('Configuracion IA guardada.');
    } catch {
      setMessage('Error de red guardando la configuracion IA.');
    } finally {
      setSaving(false);
    }
  };

  const updateProvider = (
    providerKey: string,
    patch: Partial<ProviderPricingEntry>
  ) => {
    setConfig(current =>
      current
        ? {
            ...current,
            providers: {
              ...current.providers,
              [providerKey]: {
                ...current.providers[providerKey],
                ...patch,
              },
            },
          }
        : current
    );
  };

  const removeProvider = (providerKey: string) => {
    setConfig(current => {
      if (!current) return current;
      const providers = { ...current.providers };
      delete providers[providerKey];
      const plans = Object.fromEntries(
        Object.entries(current.plans).map(([planKey, plan]) => [
          planKey,
          {
            ...plan,
            allowed_provider_keys: plan.allowed_provider_keys.filter(
              key => key !== providerKey
            ),
          },
        ])
      );
      return { ...current, providers, plans };
    });
  };

  const addProvider = () => {
    const providerKey = createProviderKey();
    setConfig(current =>
      current
        ? {
            ...current,
            providers: {
              ...current.providers,
              [providerKey]: EMPTY_PROVIDER,
            },
          }
        : current
    );
  };

  const updatePlan = (planKey: string, patch: Partial<AIPlanDefinition>) => {
    setConfig(current =>
      current
        ? {
            ...current,
            plans: {
              ...current.plans,
              [planKey]: {
                ...current.plans[planKey],
                ...patch,
              },
            },
          }
        : current
    );
  };

  const removePlan = (planKey: string) => {
    setConfig(current => {
      if (!current) return current;
      if (Object.keys(current.plans).length <= 1) return current;
      const plans = { ...current.plans };
      delete plans[planKey];
      const remainingDefault =
        current.default_plan_id === planKey
          ? Object.keys(plans)[0] || ''
          : current.default_plan_id;
      return {
        ...current,
        plans,
        default_plan_id: remainingDefault,
      };
    });
  };

  const addPlan = () => {
    const planKey = createPlanKey();
    setConfig(current =>
      current
        ? {
            ...current,
            plans: {
              ...current.plans,
              [planKey]: {
                ...EMPTY_PLAN,
                id: planKey,
                label: 'Nuevo plan',
              },
            },
          }
        : current
    );
  };

  const togglePlanProvider = (planKey: string, providerKey: string) => {
    if (!config) return;
    const plan = config.plans[planKey];
    const exists = plan.allowed_provider_keys.includes(providerKey);
    updatePlan(planKey, {
      allowed_provider_keys: exists
        ? plan.allowed_provider_keys.filter(key => key !== providerKey)
        : [...plan.allowed_provider_keys, providerKey],
    });
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-600">Cargando precios IA...</div>;
  }

  if (!config) {
    return (
      <div className="p-8">
        <BaseCard padding="md" className="border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            {message || 'No se pudo cargar la configuracion IA.'}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => void loadConfig()}>
            Reintentar
          </Button>
        </BaseCard>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      <PageHeader
        title="Precios IA"
        description="Costos base de proveedores y planes por tier para cada tenant."
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin' },
          { label: 'Precios IA' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadConfig()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
            <Button onClick={saveConfig} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        }
      />

      {message && (
        <BaseCard
          padding="md"
          className={
            message.includes('guardada')
              ? 'border border-emerald-200 bg-emerald-50'
              : 'border border-amber-200 bg-amber-50'
          }
        >
          <p
            className={`text-sm ${
              message.includes('guardada')
                ? 'text-emerald-800'
                : 'text-amber-800'
            }`}
          >
            {message}
          </p>
        </BaseCard>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Proveedores activos"
          value={String(
            providerEntries.filter(([, provider]) => provider.enabled).length
          )}
          icon={<Bot className="h-5 w-5" />}
        />
        <MetricCard
          label="Planes activos"
          value={String(planEntries.filter(([, plan]) => plan.enabled).length)}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <MetricCard
          label="Plan por defecto"
          value={config.plans[config.default_plan_id]?.label || 'Sin definir'}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          label="Markup promedio"
          value={`${Math.round(
            planEntries.reduce((sum, [, plan]) => sum + plan.markup_pct, 0) /
              Math.max(planEntries.length, 1)
          )}%`}
          icon={<Bot className="h-5 w-5" />}
        />
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="providers">Proveedores</TabsTrigger>
          <TabsTrigger value="plans">Planes</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <BaseCard padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Costos base de API
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Lo que paga la plataforma a cada provider por millon de
                  tokens.
                </p>
              </div>
              <Button variant="outline" onClick={addProvider}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar proveedor
              </Button>
            </div>
          </BaseCard>

          <div className="grid gap-4">
            {providerEntries.map(([providerKey, provider]) => (
              <BaseCard key={providerKey} padding="lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {providerKey}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {provider.label || 'Proveedor sin nombre'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>Activo</span>
                      <Switch
                        checked={provider.enabled}
                        onCheckedChange={checked =>
                          updateProvider(providerKey, { enabled: checked })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProvider(providerKey)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Label">
                    <Input
                      value={provider.label}
                      onChange={event =>
                        updateProvider(providerKey, {
                          label: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Provider">
                    <Input
                      value={provider.provider}
                      onChange={event =>
                        updateProvider(providerKey, {
                          provider: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Modelo">
                    <Input
                      value={provider.model}
                      onChange={event =>
                        updateProvider(providerKey, {
                          model: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Costo input /M">
                    <Input
                      type="number"
                      step="0.01"
                      value={provider.cost_input_per_million}
                      onChange={event =>
                        updateProvider(providerKey, {
                          cost_input_per_million:
                            Number(event.target.value) || 0,
                        })
                      }
                    />
                  </Field>
                  <Field label="Costo output /M">
                    <Input
                      type="number"
                      step="0.01"
                      value={provider.cost_output_per_million}
                      onChange={event =>
                        updateProvider(providerKey, {
                          cost_output_per_million:
                            Number(event.target.value) || 0,
                        })
                      }
                    />
                  </Field>
                  <Field label="Notas" className="md:col-span-2 xl:col-span-3">
                    <Textarea
                      value={provider.notes || ''}
                      onChange={event =>
                        updateProvider(providerKey, {
                          notes: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </BaseCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <BaseCard padding="lg">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Tiers por tenant
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Markup, limites, hard stop y modelos permitidos.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Plan por defecto</Label>
                <Select
                  value={config.default_plan_id}
                  onValueChange={value =>
                    setConfig(current =>
                      current ? { ...current, default_plan_id: value } : current
                    )
                  }
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Seleccionar plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {planEntries.map(([planKey, plan]) => (
                      <SelectItem key={planKey} value={planKey}>
                        {plan.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={addPlan}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar plan
              </Button>
            </div>
          </BaseCard>

          <div className="grid gap-4 xl:grid-cols-2">
            {planEntries.map(([planKey, plan]) => (
              <BaseCard key={planKey} padding="lg" className="h-full">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {planKey}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">
                      {plan.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>Activo</span>
                      <Switch
                        checked={plan.enabled}
                        onCheckedChange={checked =>
                          updatePlan(planKey, { enabled: checked })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePlan(planKey)}
                      disabled={planEntries.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="ID tecnico">
                    <Input
                      value={plan.id}
                      disabled
                      readOnly
                    />
                  </Field>
                  <Field label="Nombre">
                    <Input
                      value={plan.label}
                      onChange={event =>
                        updatePlan(planKey, { label: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Markup %">
                    <Input
                      type="number"
                      step="1"
                      value={plan.markup_pct}
                      onChange={event =>
                        updatePlan(planKey, {
                          markup_pct: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </Field>
                  <Field label="Limite mensual USD">
                    <Input
                      type="number"
                      step="1"
                      value={plan.monthly_usd_limit ?? ''}
                      placeholder="Sin limite"
                      onChange={event =>
                        updatePlan(planKey, {
                          monthly_usd_limit: toNullableNumber(
                            event.target.value
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="Limite diario tokens">
                    <Input
                      type="number"
                      step="1000"
                      value={plan.daily_token_limit ?? ''}
                      placeholder="Sin limite"
                      onChange={event =>
                        updatePlan(planKey, {
                          daily_token_limit: toNullableNumber(
                            event.target.value
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="Al llegar al limite">
                    <div className="flex h-10 items-center justify-between rounded-md border px-3">
                      <span className="text-sm text-slate-700">
                        {plan.hard_stop ? 'Cortar llamadas' : 'Solo alertar'}
                      </span>
                      <Switch
                        checked={plan.hard_stop}
                        onCheckedChange={checked =>
                          updatePlan(planKey, { hard_stop: checked })
                        }
                      />
                    </div>
                  </Field>
                  <Field label="Descripcion" className="md:col-span-2">
                    <Textarea
                      value={plan.description}
                      onChange={event =>
                        updatePlan(planKey, {
                          description: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    Modelos habilitados
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {providerEntries.map(([providerKey, provider]) => (
                      <label
                        key={`${planKey}-${providerKey}`}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3"
                      >
                        <Checkbox
                          checked={plan.allowed_provider_keys.includes(
                            providerKey
                          )}
                          onCheckedChange={() =>
                            togglePlanProvider(planKey, providerKey)
                          }
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {provider.label || providerKey}
                          </p>
                          <p className="text-xs text-slate-500">
                            {provider.provider} · {provider.model}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </BaseCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <BaseCard padding="md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>
    </BaseCard>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
