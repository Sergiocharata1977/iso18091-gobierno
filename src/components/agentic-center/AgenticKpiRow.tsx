'use client';

import type { AgenticCenterSummary } from '@/types/agentic-center';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock3, PlayCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface AgenticKpiRowProps {
  summary: AgenticCenterSummary;
  casesOpen: number;
}

const tones = {
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
} as const;

export default function AgenticKpiRow({ summary, casesOpen }: AgenticKpiRowProps) {
  const items = [
    {
      label: 'Casos abiertos',
      value: casesOpen,
      help: 'Activos en el tablero unificado',
      icon: Sparkles,
      tone: tones.slate,
    },
    {
      label: 'Pendientes',
      value: summary.sagas_pausadas + summary.direct_actions_pendientes,
      help: 'Esperando revision o aprobacion',
      icon: Clock3,
      tone: tones.amber,
    },
    {
      label: 'En ejecucion',
      value: summary.jobs_activos,
      help: 'Procesos corriendo ahora',
      icon: PlayCircle,
      tone: tones.sky,
    },
    {
      label: 'Completados',
      value: Math.max(summary.personas_impactadas - summary.direct_actions_pendientes, 0),
      help: 'Casos con cierre operativo visible',
      icon: CheckCircle2,
      tone: tones.emerald,
    },
    {
      label: 'Requieren aprobacion',
      value: Math.max(summary.direct_actions_pendientes, summary.terminales_con_aprobacion),
      help: 'Validacion humana pendiente',
      icon: ShieldAlert,
      tone: tones.rose,
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border-slate-200 bg-white/95 shadow-sm">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{item.help}</p>
              </div>
              <div className={`rounded-2xl border p-3 ${item.tone}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
