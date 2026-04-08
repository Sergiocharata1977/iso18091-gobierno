'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ProcessDefinition, ProcessRecord } from '@/types/procesos';
import type { QualityIndicator } from '@/types/quality';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';

interface ProcessSidebarProps {
  processes: ProcessDefinition[];
  processRecords: ProcessRecord[];
  indicators: QualityIndicator[];
  selectedProcessId: string | null;
  onSelectProcess: (id: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

type ProcessStatus = 'green' | 'yellow' | 'red';

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
  return null;
}

function getProcessStats(
  processId: string,
  records: ProcessRecord[],
  indicators: QualityIndicator[]
) {
  const now = new Date();
  const processRecords = records.filter(
    record => record.processId === processId
  );

  let pendingCount = 0;
  let overdueCount = 0;

  processRecords.forEach(record => {
    if (record.estado === 'completado') return;

    const dueDate = parseDate(record.fecha_vencimiento);
    if (dueDate && dueDate.getTime() < now.getTime()) {
      overdueCount += 1;
      return;
    }

    pendingCount += 1;
  });

  const indicatorCount = indicators.filter(
    indicator => indicator.process_definition_id === processId
  ).length;

  let status: ProcessStatus = 'green';
  if (overdueCount > 0) status = 'red';
  else if (pendingCount > 0) status = 'yellow';

  return {
    indicatorCount,
    overdueCount,
    pendingCount,
    recordCount: processRecords.length,
    status,
  };
}

function getStatusMeta(status: ProcessStatus) {
  switch (status) {
    case 'red':
      return {
        dotClassName: 'bg-red-500',
        label: 'Vencidos',
        panelClassName: 'border-red-200 bg-red-50/60',
      };
    case 'yellow':
      return {
        dotClassName: 'bg-amber-400',
        label: 'Pendientes',
        panelClassName: 'border-amber-200 bg-amber-50/60',
      };
    default:
      return {
        dotClassName: 'bg-emerald-500',
        label: 'Sin vencidos',
        panelClassName: 'border-emerald-200 bg-emerald-50/60',
      };
  }
}

function buildTooltip(
  process: ProcessDefinition,
  stats: ReturnType<typeof getProcessStats>
) {
  return [
    `${process.codigo} ${process.nombre}`.trim(),
    `${stats.recordCount} registros`,
    `${stats.overdueCount} vencidos`,
    `${stats.indicatorCount} indicadores`,
  ].join(' | ');
}

export function ProcessSidebar({
  processes,
  processRecords,
  indicators,
  selectedProcessId,
  onSelectProcess,
  collapsed,
  onToggleCollapse,
}: ProcessSidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col border-r border-slate-200 bg-slate-50/70',
        collapsed ? 'w-20' : 'w-full max-w-sm min-w-[300px]'
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
        {!collapsed ? (
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Procesos asignados
            </p>
            <p className="text-xs text-slate-500">
              {processes.length} procesos visibles
            </p>
          </div>
        ) : (
          <span className="mx-auto text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            ISO
          </span>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label={
            collapsed
              ? 'Expandir sidebar de procesos'
              : 'Colapsar sidebar de procesos'
          }
          className="h-8 w-8 shrink-0 rounded-full text-slate-600"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div
          className={cn(
            'space-y-3 p-3',
            collapsed && 'flex flex-col items-center'
          )}
        >
          {processes.map(process => {
            const stats = getProcessStats(
              process.id,
              processRecords,
              indicators
            );
            const status = getStatusMeta(stats.status);
            const isSelected = selectedProcessId === process.id;

            return (
              <button
                key={process.id}
                type="button"
                title={buildTooltip(process, stats)}
                onClick={() => onSelectProcess(process.id)}
                className={cn(
                  'w-full text-left transition-transform hover:-translate-y-0.5',
                  collapsed && 'flex justify-center'
                )}
              >
                <Card
                  className={cn(
                    'border-slate-200 shadow-sm transition-colors',
                    status.panelClassName,
                    isSelected && 'border-emerald-500 ring-2 ring-emerald-200',
                    collapsed
                      ? 'flex h-12 w-12 items-center justify-center rounded-2xl p-0'
                      : 'p-4'
                  )}
                >
                  {collapsed ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-4 w-4 rounded-full',
                        status.dotClassName
                      )}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'mt-1 h-3 w-3 shrink-0 rounded-full',
                            status.dotClassName
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold uppercase tracking-wide text-slate-900">
                            {process.codigo} {process.nombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            {status.label}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span>
                          {stats.recordCount} reg | {stats.overdueCount} venc
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>{stats.indicatorCount} indicadores</span>
                      </div>
                    </div>
                  )}
                </Card>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-slate-200 p-3">
        <Button
          type="button"
          variant={selectedProcessId === null ? 'default' : 'outline'}
          onClick={() => onSelectProcess(null)}
          title="Ver resumen global"
          className={cn(
            'w-full justify-start gap-2',
            collapsed && 'h-12 justify-center px-0'
          )}
        >
          <BarChart3 className="h-4 w-4" />
          {!collapsed ? <span>Resumen global</span> : null}
        </Button>
      </div>
    </aside>
  );
}
