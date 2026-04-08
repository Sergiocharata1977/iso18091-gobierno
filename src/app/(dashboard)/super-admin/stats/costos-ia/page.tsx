'use client';

import { PageHeader } from '@/components/design-system';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { AlertTriangle, DollarSign, Sparkles, TrendingUp } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AICostStatsResponse {
  overview: {
    totalCostMonth: number;
    totalActualCostMonth: number;
    totalCallsMonth: number;
    activeOrganizationsMonth: number;
    organizationsNearLimit: number;
  };
  byProvider: Array<{
    provider: string;
    calls: number;
    cost: number;
    actualCost: number;
  }>;
  topOrganizations: Array<{
    organizationId: string;
    name: string;
    cost: number;
    calls: number;
    planId: string;
    usagePctOfLimit: number | null;
  }>;
  monthlyTrend: Array<{
    month: string;
    billingCost: number;
    actualCost: number;
    calls: number;
  }>;
  warnings: Array<{
    organizationId: string;
    name: string;
    planId: string;
    cost: number;
    usagePctOfLimit: number | null;
  }>;
}

export default function SuperAdminAICostsPage() {
  const [stats, setStats] = useState<AICostStatsResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/super-admin/ai-pricing/stats', {
          cache: 'no-store',
        });
        const json = await response.json();
        if (response.ok && json?.success) {
          setStats(json.data);
        }
      } catch {
        setStats(null);
      }
    };

    void load();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      <PageHeader
        title="Costos IA"
        description="Gasto, margen y riesgo de consumo por tenant."
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin' },
          { label: 'Estadísticas', href: '/super-admin/stats' },
          { label: 'Costos IA' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Facturacion IA mes"
          value={`USD ${Number(stats?.overview.totalCostMonth || 0).toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          label="Costo base mes"
          value={`USD ${Number(stats?.overview.totalActualCostMonth || 0).toFixed(2)}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          label="Llamadas mes"
          value={String(stats?.overview.totalCallsMonth || 0)}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <MetricCard
          label="Orgs en alerta"
          value={String(stats?.overview.organizationsNearLimit || 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BaseCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Tendencia 6 meses
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="billingCost" stroke="#0f766e" strokeWidth={2} />
              <Line type="monotone" dataKey="actualCost" stroke="#475569" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </BaseCard>

        <BaseCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Gasto por provider
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.byProvider || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="provider" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="cost" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </BaseCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BaseCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Top tenants por costo
          </h2>
          <div className="space-y-3">
            {(stats?.topOrganizations || []).map(item => (
              <div
                key={item.organizationId}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.planId} · {item.calls} llamadas
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    USD {item.cost.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.usagePctOfLimit != null
                      ? `${item.usagePctOfLimit}% del limite`
                      : 'Sin limite'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </BaseCard>

        <BaseCard padding="md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Alertas por limite
          </h2>
          <div className="space-y-3">
            {(stats?.warnings || []).length ? (
              stats?.warnings.map(item => (
                <div
                  key={item.organizationId}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                >
                  <p className="font-medium text-amber-900">{item.name}</p>
                  <p className="text-sm text-amber-800">
                    {item.usagePctOfLimit}% del limite · USD {item.cost.toFixed(2)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No hay organizaciones arriba del 80% este mes.
              </p>
            )}
          </div>
        </BaseCard>
      </div>
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>
    </BaseCard>
  );
}
