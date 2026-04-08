'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { daysForFrequency } from '@/hooks/mi-panel/useProcessDetail';
import type { UserPrivateTask } from '@/types/private-sections';
import type { ProcessDefinition, ProcessRecord } from '@/types/procesos';
import type { QualityIndicator, QualityObjective } from '@/types/quality';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock3,
  FileText,
  Activity,
  CheckCircle2,
  CalendarX,
  Plus,
  BarChart,
  LayoutList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalSummaryViewProps {
  processes: ProcessDefinition[];
  processRecords: ProcessRecord[];
  indicators: QualityIndicator[];
  objectives: QualityObjective[];
  tasks: UserPrivateTask[];
  chatSessionCount: number;
  onSelectProcess: (processId: string) => void;
}

type StatusTone = 'green' | 'yellow' | 'red';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in (value as Record<string, unknown>) &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isIndicatorOverdue(indicator: QualityIndicator, now: number) {
  if (indicator.status !== 'activo') return false;
  const lastMeasurement = toDate(indicator.last_measurement_date);
  if (!lastMeasurement) return true;
  return (
    now - lastMeasurement.getTime() >
    daysForFrequency(indicator.measurement_frequency) * 86400000
  );
}

function isObjectiveOverdue(objective: QualityObjective, now: number) {
  if (objective.status === 'atrasado') return true;
  if (objective.status === 'completado' || objective.status === 'cancelado')
    return false;
  const dueDate = toDate(objective.due_date);
  return !!dueDate && dueDate.getTime() < now;
}

function isTaskPending(task: UserPrivateTask) {
  return task.status !== 'completed';
}

function isTaskOverdue(task: UserPrivateTask, now: number) {
  if (!isTaskPending(task)) return false;
  const dueDate = toDate(task.due_date);
  return !!dueDate && dueDate.getTime() < now;
}

function formatDateLabel(value: unknown) {
  const parsed = toDate(value);
  return parsed ? parsed.toLocaleDateString('es-AR') : 'Sin fecha';
}

export function GlobalSummaryView({
  processes,
  processRecords,
  indicators,
  objectives,
  tasks,
  chatSessionCount,
  onSelectProcess,
}: GlobalSummaryViewProps) {
  const now = Date.now();
  const activeRecords = processRecords.filter(
    record => record.estado !== 'completado'
  );
  const overdueRecords = activeRecords.filter(record => {
    const dueDate = toDate(record.fecha_vencimiento);
    return !!dueDate && dueDate.getTime() < now;
  });
  const overdueIndicators = indicators.filter(indicator =>
    isIndicatorOverdue(indicator, now)
  );
  const pendingTasks = tasks.filter(isTaskPending);
  const overdueObjectives = objectives.filter(objective =>
    isObjectiveOverdue(objective, now)
  );
  const overdueTasks = tasks.filter(task => isTaskOverdue(task, now));

  const kpis = [
    {
      label: 'TOTAL PROCESOS',
      value: processes.length,
      detail: 'Asignados en consola',
      icon: Activity,
      color: 'text-slate-900',
      bgColor: 'bg-slate-50 text-slate-500',
    },
    {
      label: 'REGISTROS ACTIVOS',
      value: activeRecords.length,
      detail: `${processRecords.length} totales en historial`,
      icon: FileText,
      color: 'text-slate-900',
      bgColor: 'bg-slate-50 text-slate-500',
    },
    {
      label: 'REG. VENCIDOS',
      value: overdueRecords.length,
      detail: 'Requieren accion inmediata',
      icon: CalendarX,
      color: overdueRecords.length > 0 ? 'text-red-600' : 'text-slate-900',
      bgColor:
        overdueRecords.length > 0
          ? 'bg-red-50 text-red-600'
          : 'bg-slate-50 text-slate-500',
    },
    {
      label: 'IND. VENCIDOS',
      value: overdueIndicators.length,
      detail: 'Mediciones atrasadas',
      icon: BarChart,
      color:
        overdueIndicators.length > 0 ? 'text-orange-500' : 'text-slate-900',
      bgColor:
        overdueIndicators.length > 0
          ? 'bg-orange-50 text-orange-600'
          : 'bg-slate-50 text-slate-500',
    },
    {
      label: 'TAREAS PENDIENTES',
      value: pendingTasks.length,
      detail: `${overdueTasks.length} tareas vencidas`,
      icon: CheckCircle2,
      color: pendingTasks.length > 0 ? 'text-blue-600' : 'text-slate-900',
      bgColor:
        pendingTasks.length > 0
          ? 'bg-blue-50 text-blue-600'
          : 'bg-slate-50 text-slate-500',
    },
  ];

  const urgentAlerts = [
    ...overdueRecords.map(record => ({
      id: `record-${record.id}`,
      title: record.titulo,
      detail: `Registro vencido en el proceso ${processes.find(process => process.id === record.processId)?.nombre || 'desconocido'}`,
      dateLabel: formatDateLabel(record.fecha_vencimiento),
      actionProcessId: record.processId,
    })),
    ...overdueIndicators.map(indicator => ({
      id: `indicator-${indicator.id}`,
      title: indicator.name,
      detail: 'Indicador sin medición actualizada al día de hoy',
      dateLabel: formatDateLabel(indicator.last_measurement_date),
      actionProcessId: indicator.process_definition_id,
    })),
    ...overdueObjectives.map(objective => ({
      id: `objective-${objective.id}`,
      title: objective.title,
      detail: 'Objetivo de calidad marcado como atrasado',
      dateLabel: formatDateLabel(objective.due_date),
      actionProcessId: objective.process_definition_id,
    })),
    ...overdueTasks.map(task => ({
      id: `task-${task.id}`,
      title: task.title,
      detail: 'Tarea personal crítica pendiente de ejecucion',
      dateLabel: formatDateLabel(task.due_date),
      actionProcessId: null,
    })),
  ].slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER SECTION & CTA */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Visión General
            </h2>
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-emerald-700 font-medium"
            >
              <Bot className="h-3.5 w-3.5 mr-1 inline" /> {chatSessionCount}{' '}
              sesiones IA
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Resumen de indicadores, procesos y tareas pendientes.
          </p>
        </div>
        <div>
          <Button className="rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 shadow-md transition-transform hover:scale-105">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Registro
          </Button>
        </div>
      </section>

      {/* KPIs ROW */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-wider text-slate-400">
                {kpi.label}
              </span>
              <div className={cn('p-2 rounded-xl', kpi.bgColor)}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p
                className={cn(
                  'text-4xl font-black mb-1 tracking-tighter',
                  kpi.color
                )}
              >
                {kpi.value}
              </p>
              <p className="text-xs font-medium text-slate-500">{kpi.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 grid-cols-1 xl:grid-cols-3">
        {/* LISTA DE PROCESOS (MODERNA) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-slate-400" />
              Estado por Proceso
            </h3>
            <span className="text-xs font-medium text-slate-500">
              {processes.length} procesos configurados
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {processes.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No hay procesos asignados para mostrar.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {processes.map(process => {
                  const records = processRecords.filter(
                    record => record.processId === process.id
                  );
                  const activeCount = records.filter(
                    record => record.estado !== 'completado'
                  ).length;
                  const overdueCount = records.filter(record => {
                    if (record.estado === 'completado') return false;
                    const dueDate = toDate(record.fecha_vencimiento);
                    return !!dueDate && dueDate.getTime() < now;
                  }).length;

                  return (
                    <div
                      key={process.id}
                      onClick={() => onSelectProcess(process.id)}
                      className="group flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                            overdueCount > 0
                              ? 'bg-red-50 border-red-100 text-red-600'
                              : activeCount > 0
                                ? 'bg-amber-50 border-amber-100 text-amber-600'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          )}
                        >
                          <Activity className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {process.nombre}
                          </p>
                          <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                            {process.codigo || 'Sin código'} • Responsable:{' '}
                            {process.responsable || 'No asignado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 ml-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-semibold text-slate-700">
                            {records.length}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">
                            Total
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              'text-xs font-bold',
                              overdueCount > 0
                                ? 'text-red-600'
                                : 'text-emerald-600'
                            )}
                          >
                            {overdueCount > 0
                              ? `${overdueCount} vencidos`
                              : '0 vencidos'}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">
                            {activeCount} regs. activos
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ALERTAS URGENTES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Atención Requerida
            </h3>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {urgentAlerts.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-900">
                  Todo al día
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  No hay alertas urgentes pendientes.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {urgentAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white hover:bg-red-50/30 transition-colors group"
                  >
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-red-700 transition-colors line-clamp-2">
                      {alert.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {alert.detail}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 text-[10px] font-bold">
                        <Clock3 className="w-3 h-3 mr-1" /> Vencido:{' '}
                        {alert.dateLabel}
                      </span>
                      {alert.actionProcessId && (
                        <button
                          onClick={() =>
                            onSelectProcess(alert.actionProcessId!)
                          }
                          className="text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-blue-600 transition-colors flex items-center"
                        >
                          Ir al proceso <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {urgentAlerts.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <span className="text-xs font-medium text-slate-500">
                  Mostrando {urgentAlerts.length} tareas urgentes
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
