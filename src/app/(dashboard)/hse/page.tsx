'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  HardHat,
  Leaf,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface HseDashboardData {
  incidentes: {
    total: number;
    abiertos: number;
    cerrados: number;
    por_tipo: Record<string, number>;
  };
  peligros: {
    total: number;
    por_nivel: Record<string, number>;
  };
  aspectos: {
    total: number;
    significativos: number;
  };
  requisitos: {
    total: number;
    por_estado: Record<string, number>;
  };
  objetivos: {
    total: number;
    por_estado: Record<string, number>;
  };
  epp: {
    total: number;
  };
}

interface KpiCardProps {
  label: string;
  value: number | string;
  subText?: string;
  icon: ReactNode;
  colorClass: string;
}

type ChartDatum = Record<string, string | number> & {
  key: string;
  label: string;
  value: number;
};

function KpiCard({ label, value, subText, icon, colorClass }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-100">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      {subText ? <p className="mt-1 text-xs text-slate-400">{subText}</p> : null}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-800" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded-lg bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  {
    href: '/hse/incidentes',
    label: 'Incidentes SST',
    desc: 'ISO 45001 · Clausula 10.2',
    color: 'text-rose-400',
    bg: 'bg-rose-900/20 border-rose-800/40 hover:border-rose-700',
  },
  {
    href: '/hse/peligros',
    label: 'Identificacion de Peligros',
    desc: 'ISO 45001 · Clausula 6.1',
    color: 'text-orange-400',
    bg: 'bg-orange-900/20 border-orange-800/40 hover:border-orange-700',
  },
  {
    href: '/hse/epp',
    label: 'EPP Registrados',
    desc: 'Control de equipos de proteccion',
    color: 'text-violet-400',
    bg: 'bg-violet-900/20 border-violet-800/40 hover:border-violet-700',
  },
  {
    href: '/hse/aspectos-ambientales',
    label: 'Aspectos Ambientales',
    desc: 'ISO 14001 · Clausula 6.1.2',
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/20 border-emerald-800/40 hover:border-emerald-700',
  },
  {
    href: '/hse/requisitos-legales',
    label: 'Requisitos Legales',
    desc: 'ISO 14001/45001 · Clausula 6.1.3',
    color: 'text-blue-400',
    bg: 'bg-blue-900/20 border-blue-800/40 hover:border-blue-700',
  },
  {
    href: '/hse/objetivos-ambientales',
    label: 'Objetivos Ambientales',
    desc: 'ISO 14001 · Clausula 6.2',
    color: 'text-amber-400',
    bg: 'bg-amber-900/20 border-amber-800/40 hover:border-amber-700',
  },
];

const RISK_LEVEL_COLORS: Record<string, string> = {
  alto: '#f43f5e',
  critico: '#f43f5e',
  medio: '#f97316',
  moderado: '#f97316',
  bajo: '#22c55e',
  desconocido: '#94a3b8',
};

const REQUIREMENT_STATUS_ORDER = ['cumplido', 'parcial', 'incumplido', 'no_aplica'] as const;

const REQUIREMENT_STATUS_COLORS: Record<(typeof REQUIREMENT_STATUS_ORDER)[number], string> = {
  cumplido: '#22c55e',
  parcial: '#f97316',
  incumplido: '#f43f5e',
  no_aplica: '#94a3b8',
};

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function toChartEntries(record: Record<string, number>): ChartDatum[] {
  return Object.entries(record).map(([key, value]) => ({
    key,
    label: formatLabel(key),
    value,
  }));
}

export default function HseDashboardPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [data, setData] = useState<HseDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/hse/dashboard?organization_id=${encodeURIComponent(orgId)}`,
          { cache: 'no-store' }
        );
        const json = (await res.json()) as {
          success: boolean;
          data: HseDashboardData;
          error?: string;
        };

        if (!res.ok || !json.success) {
          throw new Error(json.error ?? 'Error al cargar dashboard');
        }

        setData(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        </div>
      </div>
    );
  }

  const d = data!;
  const peligrosCriticos = d.peligros.por_nivel.critico ?? 0;
  const requisitosNoCumple =
    d.requisitos.por_estado.no_cumple ?? d.requisitos.por_estado.incumplido ?? 0;
  const incidentesPorTipo = toChartEntries(d.incidentes.por_tipo);
  const peligrosPorNivel = toChartEntries(d.peligros.por_nivel);
  const hasRequisitosData = Object.keys(d.requisitos.por_estado).length > 0;
  const requisitosPorEstado = [
    REQUIREMENT_STATUS_ORDER.reduce<Record<string, string | number>>(
      (acc, status) => {
        acc[status] = d.requisitos.por_estado[status] ?? 0;
        return acc;
      },
      { name: 'Requisitos' }
    ),
  ];

  const kpis: KpiCardProps[] = [
    {
      label: 'Total Incidentes',
      value: d.incidentes.total,
      subText: `${d.incidentes.abiertos} abiertos`,
      icon: <AlertTriangle className="h-5 w-5" />,
      colorClass: 'bg-rose-900/40 text-rose-400',
    },
    {
      label: 'Incidentes Cerrados',
      value: d.incidentes.cerrados,
      icon: <CheckCircle className="h-5 w-5" />,
      colorClass: 'bg-emerald-900/40 text-emerald-400',
    },
    {
      label: 'Peligros Criticos',
      value: peligrosCriticos,
      icon: <AlertOctagon className="h-5 w-5" />,
      colorClass: 'bg-red-900/40 text-red-400',
    },
    {
      label: 'Aspectos Significativos',
      value: d.aspectos.significativos,
      icon: <Leaf className="h-5 w-5" />,
      colorClass: 'bg-amber-900/40 text-amber-400',
    },
    {
      label: 'Requisitos Legales',
      value: d.requisitos.total,
      subText: `${requisitosNoCumple} sin cumplir`,
      icon: <Scale className="h-5 w-5" />,
      colorClass: 'bg-blue-900/40 text-blue-400',
    },
    {
      label: 'EPP Registrados',
      value: d.epp.total,
      icon: <HardHat className="h-5 w-5" />,
      colorClass: 'bg-violet-900/40 text-violet-400',
    },
  ];

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900/40 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-100">Dashboard HSE</h1>
              <p className="mt-0.5 text-sm text-slate-400">ISO 14001 · ISO 45001</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-700/50 bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-300 md:self-auto">
            Pack HSE
          </span>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {kpis.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <section className="mb-10 space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900/50 text-slate-100">
              <CardHeader>
                <CardTitle className="text-lg text-slate-100">Incidentes por tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {incidentesPorTipo.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-400">
                    Sin datos de incidentes
                  </div>
                ) : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={incidentesPorTipo}
                        layout="vertical"
                        margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={110}
                          tick={{ fill: '#cbd5e1', fontSize: 12 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(244, 63, 94, 0.08)' }}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: 16,
                            color: '#e2e8f0',
                          }}
                        />
                        <Bar dataKey="value" fill="#f43f5e" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50 text-slate-100">
              <CardHeader>
                <CardTitle className="text-lg text-slate-100">
                  Peligros por nivel de riesgo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {peligrosPorNivel.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-400">
                    Sin datos de peligros
                  </div>
                ) : (
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={peligrosPorNivel}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="45%"
                          innerRadius={38}
                          outerRadius={72}
                          paddingAngle={2}
                        >
                          {peligrosPorNivel.map(entry => (
                            <Cell
                              key={entry.key}
                              fill={RISK_LEVEL_COLORS[entry.key] ?? RISK_LEVEL_COLORS.desconocido}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: 16,
                            color: '#e2e8f0',
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          wrapperStyle={{ color: '#cbd5e1', paddingTop: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-800 bg-slate-900/50 text-slate-100">
            <CardHeader>
              <CardTitle className="text-lg text-slate-100">
                Cumplimiento de requisitos legales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasRequisitosData ? (
                <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-400">
                  Sin datos de requisitos
                </div>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={requisitosPorEstado}
                      margin={{ top: 12, right: 20, left: 0, bottom: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#cbd5e1', fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: 16,
                          color: '#e2e8f0',
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                      {REQUIREMENT_STATUS_ORDER.map(status => (
                        <Bar
                          key={status}
                          dataKey={status}
                          name={formatLabel(status)}
                          stackId="requisitos"
                          fill={REQUIREMENT_STATUS_COLORS[status]}
                          label={{ position: 'center', fill: '#f8fafc', fontSize: 11 }}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
            Acceso rapido
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center justify-between rounded-2xl border px-5 py-4 transition ${link.bg}`}
              >
                <div>
                  <p className={`font-semibold ${link.color}`}>{link.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{link.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
