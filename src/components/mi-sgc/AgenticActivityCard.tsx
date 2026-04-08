'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, ShieldCheck, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AgenticCenterSummary } from '@/types/agentic-center';

type SummaryResponse = {
  success?: boolean;
  data?: AgenticCenterSummary;
  error?: string;
};

const emptySummary: AgenticCenterSummary = {
  jobs_activos: 0,
  sagas_pausadas: 0,
  direct_actions_pendientes: 0,
  terminales_con_aprobacion: 0,
  personas_impactadas: 0,
};

export function AgenticActivityCard() {
  const [summary, setSummary] = useState<AgenticCenterSummary>(emptySummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadSummary = async () => {
      try {
        const response = await fetch('/api/agentic-center/summary', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }

        const payload: SummaryResponse = await response.json();
        if (payload.success && payload.data) {
          setSummary(payload.data);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[AgenticActivityCard] Error loading summary:', error);
          setSummary(emptySummary);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSummary();
    return () => controller.abort();
  }, []);

  const metrics = [
    {
      label: 'Automatizaciones activas',
      value: summary.jobs_activos,
      icon: Zap,
    },
    {
      label: 'Acciones esperando confirmacion',
      value: summary.direct_actions_pendientes + summary.sagas_pausadas,
      icon: CheckCircle2,
    },
    {
      label: 'Personas impactadas',
      value: summary.personas_impactadas,
      icon: Users,
    },
    {
      label: 'Terminales con aprobacion',
      value: summary.terminales_con_aprobacion,
      icon: ShieldCheck,
    },
  ];

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700">
            <Bot className="h-3.5 w-3.5" />
            Actividad agentica
          </div>
          <div>
            <CardTitle className="text-slate-900">
              Seguimiento operativo asistido por IA
            </CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Visualiza el pulso operativo del Centro Agentico sin salir del
              tablero ejecutivo.
            </p>
          </div>
        </div>

        <Button asChild className="shrink-0">
          <Link href="/centro-agentico">
            Abrir Centro Agentico
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-600">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {loading ? '--' : metric.value}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-slate-600">
          {loading
            ? 'Actualizando actividad operativa...'
            : 'Este bloque resume ejecucion, decisiones pendientes y alcance operativo para enlazar la vision ejecutiva con la capa de accion.'}
        </p>
      </CardContent>
    </Card>
  );
}
