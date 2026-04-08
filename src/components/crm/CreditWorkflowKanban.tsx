'use client';

import Link from 'next/link';
import { ArrowUpRight, CalendarClock, FileSearch } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  KANBAN_DEFAULTS,
  type KanbanColumnConfig,
} from '@/types/kanbanSchema';
import type {
  CreditWorkflow,
  CreditWorkflowStatus,
} from '@/types/crm-credit-workflow';
import { useEffect, useState } from 'react';

type CreditWorkflowColumn = {
  status: CreditWorkflowStatus;
  label: string;
  accent: string;
  chipClassName: string;
};

function buildAccent(color: string) {
  return color.includes('border-') ? color : `border-slate-200 ${color}`;
}

function buildChipClassName(color: string) {
  if (color.includes('text-')) return color;

  if (color.includes('slate')) return `${color} text-slate-700`;
  if (color.includes('blue')) return `${color} text-blue-700`;
  if (color.includes('amber')) return `${color} text-amber-700`;
  if (color.includes('violet')) return `${color} text-violet-700`;
  if (color.includes('emerald')) return `${color} text-emerald-700`;
  if (color.includes('rose')) return `${color} text-rose-700`;

  return `${color} text-slate-700`;
}

function mapColumns(columns: KanbanColumnConfig[]): CreditWorkflowColumn[] {
  return columns.map(column => ({
    status: column.id as CreditWorkflowStatus,
    label: column.title,
    accent: buildAccent(column.color),
    chipClassName: buildChipClassName(column.color),
  }));
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export interface CreditWorkflowKanbanProps {
  workflows: CreditWorkflow[];
  emptyMessage?: string;
}

export function CreditWorkflowKanban({
  workflows,
  emptyMessage = 'No hay workflows para mostrar con los filtros actuales.',
}: CreditWorkflowKanbanProps) {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const [columns, setColumns] = useState<CreditWorkflowColumn[]>(() =>
    mapColumns(KANBAN_DEFAULTS.crm_scoring)
  );

  useEffect(() => {
    if (!orgId) return;

    let isMounted = true;

    const loadColumns = async () => {
      try {
        const response = await fetch(
          `/api/kanban-schemas/crm_scoring?organization_id=${orgId}`
        );

        if (!response.ok) return;

        const payload = await response.json();
        const remoteColumns = payload?.data?.columns;

        if (isMounted && Array.isArray(remoteColumns)) {
          setColumns(mapColumns(remoteColumns));
        }
      } catch {
        // Fallback silencioso a defaults
      }
    };

    void loadColumns();

    return () => {
      isMounted = false;
    };
  }, [orgId]);

  if (workflows.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 bg-slate-50">
        <CardContent className="p-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-6 md:grid-cols-2">
      {columns.filter(column => column.status !== 'cerrado').map(column => {
        const items = workflows.filter(workflow => workflow.status === column.status);

        return (
          <div key={column.status} className="flex min-h-[16rem] flex-col gap-3">
            <div
              className={`rounded-2xl border px-4 py-3 shadow-sm ${column.accent}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {column.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {items.length} caso{items.length === 1 ? '' : 's'}
                  </p>
                </div>
                <Badge className={column.chipClassName}>{items.length}</Badge>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                  Sin casos en esta columna
                </div>
              ) : (
                items.map(workflow => (
                  <Card
                    key={workflow.id}
                    className="rounded-2xl border border-slate-200 shadow-sm"
                  >
                    <CardHeader className="space-y-3 p-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base text-slate-900">
                            {workflow.oportunidad_nombre}
                          </CardTitle>
                          <p className="truncate text-sm text-slate-500">
                            {workflow.cliente_nombre}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {workflow.assigned_to_user_name || 'Sin analista'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 pt-0 text-sm">
                      <div className="space-y-1 text-slate-600">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-slate-400" />
                          <span>SLA: {formatDate(workflow.sla_due_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileSearch className="h-4 w-4 text-slate-400" />
                          <span>
                            Ultima actualizacion: {formatDate(workflow.updated_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          href={`/crm/oportunidades/${workflow.oportunidad_id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Abrir caso
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={`/crm/clientes/${workflow.crm_organizacion_id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Abrir analisis
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
