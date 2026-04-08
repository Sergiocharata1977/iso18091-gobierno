'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { authFetch } from '@/lib/api/authFetch';
import type {
  GovMaturityAssessment,
  GovMaturityStrategicSummary,
} from '@/types/gov-madurez';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Loader2,
  Radar,
  RefreshCcw,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type MadurezResponse = {
  success?: boolean;
  data?: GovMaturityAssessment[];
  strategic_summary?: GovMaturityStrategicSummary | null;
  error?: string;
};

const estadoClasses: Record<GovMaturityAssessment['estado'], string> = {
  borrador: 'border-amber-200 bg-amber-50 text-amber-700',
  finalizado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const estadoLabels: Record<GovMaturityAssessment['estado'], string> = {
  borrador: 'Borrador',
  finalizado: 'Finalizado',
};

function renderNivel(level: number) {
  const rounded = Math.max(1, Math.min(4, Math.round(level)));

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map(item => (
        <Star
          key={item}
          className={
            item <= rounded
              ? 'h-4 w-4 fill-amber-400 text-amber-400'
              : 'h-4 w-4 text-slate-300'
          }
        />
      ))}
      <span className="ml-2 text-sm font-medium text-slate-700">
        {level.toFixed(2)}/4
      </span>
    </div>
  );
}

function TrendBadge({ trend }: { trend: GovMaturityStrategicSummary['trend'] }) {
  const isUp = trend.trend_direction === 'mejorando';
  const isDown = trend.trend_direction === 'empeorando';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : ArrowRight;
  const className = isUp
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : isDown
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';
  const prefix = trend.global_score_delta > 0 ? '+' : '';
  const arrow = isUp ? '↑' : isDown ? '↓' : '→';
  const comparisonText =
    trend.periods_analyzed > 0
      ? 'respecto al trimestre anterior'
      : 'sin comparativa previa';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${className}`}
    >
      <Icon className="h-4 w-4" />
      <span>
        {arrow} {prefix}
        {trend.global_score_delta.toFixed(1)} pts {comparisonText}
      </span>
    </div>
  );
}

export default function GobiernoMadurezPage() {
  const [diagnosticos, setDiagnosticos] = useState<GovMaturityAssessment[]>([]);
  const [strategicSummary, setStrategicSummary] =
    useState<GovMaturityStrategicSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDiagnosticos = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const response = await authFetch('/api/gobierno/madurez', {
          cache: 'no-store',
        });
        const json = (await response.json()) as MadurezResponse;

        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error || 'No se pudo cargar el historial');
        }

        setDiagnosticos(json.data);
        setStrategicSummary(json.strategic_summary ?? null);
        setError(null);
      } catch (fetchError) {
        setDiagnosticos([]);
        setStrategicSummary(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'No se pudo cargar el historial'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadDiagnosticos();
  }, [loadDiagnosticos]);

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="ISO 18091"
          title="Madurez institucional"
          description="Historial de diagnosticos para seguimiento del desarrollo del sistema de gestion de calidad municipal."
          breadcrumbs={[
            { label: 'Gobierno', href: '/gobierno/panel' },
            { label: 'Madurez ISO 18091' },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => void loadDiagnosticos('refresh')}
                disabled={loading || refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Actualizar
              </Button>
              <Button asChild className="bg-[#2563eb] hover:bg-[#1d4ed8]">
                <Link href="/gobierno/madurez/nuevo">
                  <Radar className="mr-2 h-4 w-4" />
                  Iniciar diagnostico
                </Link>
              </Button>
            </>
          }
        />

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radar className="h-5 w-5 text-[#2563eb]" />
                Tendencia ISO 18091
              </CardTitle>
              <CardDescription>
                Ultimo analisis estrategico consolidado para la organizacion.
              </CardDescription>
            </div>
            {strategicSummary ? (
              <TrendBadge trend={strategicSummary.trend} />
            ) : (
              <Badge className="w-fit border-slate-200 bg-slate-100 text-slate-600">
                Sin analisis estrategico
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-[160px] items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#2563eb]" />
                Cargando analisis estrategico...
              </div>
            ) : strategicSummary ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Reporte</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {strategicSummary.title}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Score global</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {typeof strategicSummary.global_score === 'number'
                        ? strategicSummary.global_score.toFixed(1)
                        : 'Sin score'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Confianza del analisis</p>
                    <p className="mt-1 font-semibold capitalize text-slate-900">
                      {strategicSummary.confidence_level || 'Sin dato'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Contexto completo:{' '}
                      {typeof strategicSummary.context_completeness_pct === 'number'
                        ? `${strategicSummary.context_completeness_pct}%`
                        : 'Sin dato'}
                    </p>
                  </div>
                </div>

                {strategicSummary.executive_alerts.length > 0 ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-700" />
                      <h2 className="text-lg font-semibold text-amber-900">
                        Alertas ISO 18091
                      </h2>
                    </div>
                    <div className="mt-4 space-y-3">
                      {strategicSummary.executive_alerts.map(alert => (
                        <div
                          key={alert.id}
                          className="rounded-2xl border border-amber-200 bg-white/80 p-4"
                        >
                          <p className="font-medium text-slate-900">{alert.title}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            {alert.recommended_action || 'Sin accion recomendada.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                    El ultimo analisis estrategico no presenta alertas ejecutivas altas o criticas.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 text-lg font-semibold text-slate-800">
                  Aun no hay tendencia estrategica disponible
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Cuando exista un analisis estrategico real, aqui se mostraran la tendencia ISO 18091 y las alertas ejecutivas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#2563eb]" />
                Diagnosticos anteriores
              </CardTitle>
              <CardDescription>
                Revisa evaluador, nivel global y estado de cada corrida.
              </CardDescription>
            </div>
            <Badge className="w-fit border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
              {diagnosticos.length} registros
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#2563eb]" />
                Cargando diagnosticos...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : diagnosticos.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 text-lg font-semibold text-slate-800">
                  Aun no realizaste un diagnostico de madurez ISO 18091
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Inicia la primera evaluacion para registrar evidencias y oportunidades de mejora.
                </p>
                <Button asChild className="mt-6 bg-[#2563eb] hover:bg-[#1d4ed8]">
                  <Link href="/gobierno/madurez/nuevo">
                    Iniciar diagnostico
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {diagnosticos.map(diagnostico => (
                  <Card
                    key={diagnostico.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/60 shadow-none"
                  >
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">Fecha</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {new Date(diagnostico.fecha).toLocaleDateString('es-AR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <Badge className={estadoClasses[diagnostico.estado]}>
                          {estadoLabels[diagnostico.estado]}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Evaluador</p>
                        <p className="mt-1 font-medium text-slate-800">
                          {diagnostico.evaluador}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Nivel global</p>
                        <div className="mt-2">{renderNivel(diagnostico.nivel_global)}</div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        {diagnostico.dimensiones.length} dimensiones evaluadas
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
