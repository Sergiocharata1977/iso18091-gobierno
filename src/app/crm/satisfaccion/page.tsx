'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Loader2,
  MessageSquareHeart,
  RefreshCcw,
  SmilePlus,
  ThumbsDown,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

type PeriodFilter = 'month' | 'quarter' | 'year';

interface DashboardResponse {
  success?: boolean;
  data?: {
    total: number;
    npsScore: number;
    promoters: number;
    passives: number;
    detractors: number;
    distribution: Array<{ score: number; count: number }>;
    recentResponses: Array<{
      id: string;
      surveyId: string;
      clientName: string;
      clientEmail: string | null;
      comments: string | null;
      npsScore: number | null;
      createdAt: string;
    }>;
  };
  error?: string;
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  month: 'Ultimo mes',
  quarter: 'Ultimo trimestre',
  year: 'Este ano',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function CRMSatisfaccionPage() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse['data'] | null>(null);

  const organizationId = user?.organization_id;

  const loadDashboard = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!organizationId) {
        setError('No se encontro la organizacion activa.');
        setLoading(false);
        return;
      }

      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const params = new URLSearchParams({
          period,
          organization_id: organizationId,
        });
        const response = await fetch(`/api/crm/satisfaccion?${params.toString()}`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as DashboardResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || 'No se pudo cargar el dashboard NPS');
        }

        setData(payload.data);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar el dashboard NPS'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [organizationId, period]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!organizationId) {
      setLoading(false);
      return;
    }

    void loadDashboard();
  }, [authLoading, loadDashboard, organizationId]);

  const metrics = useMemo(
    () => ({
      npsScore: data?.npsScore ?? 0,
      total: data?.total ?? 0,
      promoters: data?.promoters ?? 0,
      passives: data?.passives ?? 0,
      detractors: data?.detractors ?? 0,
    }),
    [data]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge className="bg-emerald-100 text-emerald-700">Satisfaccion</Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Dashboard NPS de clientes
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  Seguimiento del Net Promoter Score con distribucion de puntajes y
                  ultimas respuestas del portal cliente.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={period} onValueChange={value => setPeriod(value as PeriodFilter)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => void loadDashboard('refresh')}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Actualizar
              </Button>

              <Link href="/crm">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Volver a CRM
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border border-slate-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">NPS Score</p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">
                  {metrics.npsScore}
                </p>
              </div>
              <MessageSquareHeart className="h-8 w-8 text-slate-300" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Promotores</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-700">
                  {metrics.promoters}
                </p>
              </div>
              <SmilePlus className="h-8 w-8 text-emerald-300" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Pasivos</p>
                <p className="mt-1 text-3xl font-semibold text-amber-700">
                  {metrics.passives}
                </p>
              </div>
              <Users className="h-8 w-8 text-amber-300" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Detractores</p>
                <p className="mt-1 text-3xl font-semibold text-rose-700">
                  {metrics.detractors}
                </p>
              </div>
              <ThumbsDown className="h-8 w-8 text-rose-300" />
            </CardContent>
          </Card>
        </section>

        {error ? (
          <Card className="rounded-2xl border border-rose-200 bg-rose-50">
            <CardContent className="p-5 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900">
                Distribucion de scores 0-10
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.distribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="score" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                    contentStyle={{
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900">
                Resumen del periodo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Formula NPS
                </p>
                <p className="mt-2 text-sm leading-6">
                  % promotores (9-10) menos % detractores (0-6)
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">
                  Respuestas analizadas
                </p>
                <p className="mt-2 text-3xl font-semibold">{metrics.total}</p>
              </div>
              <p>
                Periodo activo: <span className="font-medium text-slate-900">{PERIOD_LABELS[period]}</span>
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">
              Ultimas 20 respuestas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentResponses ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                No hay respuestas con NPS en el periodo seleccionado.
              </div>
            ) : (
              data?.recentResponses.map(response => (
                <div
                  key={response.id}
                  className="grid gap-4 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[minmax(0,2fr)_auto]"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">
                        {response.clientName}
                      </h2>
                      <Badge className="bg-slate-100 text-slate-700">
                        NPS {response.npsScore ?? '-'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {response.clientEmail || 'Sin email'}
                    </p>
                    <p className="text-sm leading-6 text-slate-600">
                      {response.comments || 'Sin comentarios adicionales.'}
                    </p>
                  </div>

                  <div className="flex items-start justify-between gap-4 text-sm text-slate-500 lg:flex-col lg:items-end">
                    <span>{formatDate(response.createdAt)}</span>
                    <span className="font-medium text-slate-900">
                      Encuesta #{response.surveyId.slice(0, 8)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
