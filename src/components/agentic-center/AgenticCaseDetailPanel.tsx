'use client';

import type { AgenticCaseViewModel } from '@/components/agentic-center/agenticCenterPresentation';
import ProcessLogTimeline from '@/components/agentic-center/ProcessLogTimeline';
import {
  getPriorityClasses,
  getStatusLabel,
  getTypeClasses,
  getTypeLabel,
} from '@/components/agentic-center/agenticCenterPresentation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { FilePenLine, History, Play, UserRound } from 'lucide-react';

interface AgenticCaseDetailPanelProps {
  item: AgenticCaseViewModel | null;
}

export default function AgenticCaseDetailPanel({
  item,
}: AgenticCaseDetailPanelProps) {
  if (!item) {
    return (
      <Card className="h-full rounded-[28px] border-slate-200 bg-white/90 shadow-sm">
        <CardContent className="flex h-full min-h-[720px] items-center justify-center p-8 text-center text-sm text-slate-500">
          Selecciona un caso del tablero para ver su detalle operativo.
        </CardContent>
      </Card>
    );
  }

  const caseItem = item.caseItem;

  return (
    <Card className="h-full rounded-[28px] border-slate-200 bg-white/95 shadow-sm">
      <CardHeader className="space-y-4 border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={getTypeClasses(item.type)}>
            {getTypeLabel(item.type)}
          </Badge>
          <Badge variant="outline" className={getPriorityClasses(item.priority)}>
            Prioridad {item.priority}
          </Badge>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            {getStatusLabel(item.columnId)}
          </Badge>
        </div>
        <div>
          <CardTitle className="text-2xl leading-tight text-slate-950">
            {caseItem.titulo}
          </CardTitle>
          <p className="mt-2 text-sm leading-6 text-slate-600">{caseItem.descripcion}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Responsable
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">{item.owner}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Fecha
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatDate(caseItem.timestamp, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FilePenLine className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-950">Resumen ejecutivo</h3>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {item.summary}
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Problema detectado
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{caseItem.evento_detectado.tipo}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {caseItem.evento_detectado.descripcion}
            </p>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700">
              Accion propuesta
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{item.proposedAction}</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {caseItem.accion_propuesta?.descripcion_negocio ?? 'Sin descripcion ampliada disponible.'}
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Registro afectado
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">{item.recordLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Origen
            </p>
            <p className="mt-1 text-sm font-medium capitalize text-slate-900">{item.origin}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Area
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">{item.area}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Trazabilidad
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">{item.traceabilityLabel}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-950">Responsable y canal</h3>
          </div>
          <p className="mt-3 text-sm text-slate-900">{item.owner}</p>
          <p className="mt-1 text-sm text-slate-600">
            {caseItem.persona_target?.puesto ?? 'Sin cargo visible'} · canal{' '}
            {caseItem.persona_target?.canal ?? 'sin definir'}
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-950">Registro del proceso</h3>
          </div>
          <ProcessLogTimeline items={caseItem.workflow_pasos} />
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" className="w-full">
            Ignorar
          </Button>
          <Button className="w-full bg-slate-950 text-white hover:bg-slate-800">
            <Play className="mr-2 h-4 w-4" />
            Ejecutar accion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
