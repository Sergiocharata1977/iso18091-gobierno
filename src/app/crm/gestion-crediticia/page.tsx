'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  FileSearch,
  LayoutGrid,
  List,
  Loader2,
  RefreshCcw,
  Users,
} from 'lucide-react';

import { CreditWorkflowKanban } from '@/components/crm/CreditWorkflowKanban';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type {
  CreditWorkflow,
  CreditWorkflowStatus,
} from '@/types/crm-credit-workflow';

type ViewMode = 'list' | 'kanban';
type DueFilter = 'all' | 'overdue' | 'today' | 'this_week' | 'without_sla';

const STATUS_LABELS: Record<CreditWorkflowStatus, string> = {
  pendiente: 'Pendiente',
  en_analisis: 'En analisis',
  documentacion_pendiente: 'Documentacion pendiente',
  comite: 'Comite',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  cerrado: 'Cerrado',
};

const STATUS_BADGE_CLASSNAMES: Record<CreditWorkflowStatus, string> = {
  pendiente: 'bg-slate-100 text-slate-700',
  en_analisis: 'bg-blue-100 text-blue-700',
  documentacion_pendiente: 'bg-amber-100 text-amber-700',
  comite: 'bg-violet-100 text-violet-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  rechazado: 'bg-rose-100 text-rose-700',
  cerrado: 'bg-slate-100 text-slate-700',
};

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isDueToday(date: Date, today: Date) {
  return date.toDateString() === today.toDateString();
}

function isDueThisWeek(date: Date, today: Date) {
  const end = new Date(today);
  end.setDate(today.getDate() + 7);
  return date >= today && date <= end;
}

function matchesDueFilter(value: string | undefined, filter: DueFilter) {
  if (filter === 'all') return true;
  if (!value) return filter === 'without_sla';

  const dueDate = new Date(value);
  const now = new Date();

  if (filter === 'without_sla') return false;
  if (filter === 'overdue') return dueDate < now;
  if (filter === 'today') return isDueToday(dueDate, now);
  if (filter === 'this_week') return isDueThisWeek(dueDate, now);

  return true;
}

export default function GestionCrediticiaPage() {
  const { user, loading: authLoading } = useAuth();
  const [workflows, setWorkflows] = useState<CreditWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [analystFilter, setAnalystFilter] = useState<string>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');

  const organizationId = user?.organization_id;

  const loadWorkflows = useCallback(
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
          organization_id: organizationId,
          activo: 'true',
        });

        const response = await fetch(
          `/api/crm/credit-workflows?${params.toString()}`,
          {
            cache: 'no-store',
          }
        );
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(
            json.error ||
              'No se pudieron cargar los casos de gestion crediticia.'
          );
        }

        setWorkflows(Array.isArray(json.data) ? json.data : []);
        setError(null);
      } catch (err) {
        console.error('[gestion-crediticia] Error loading workflows:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los workflows crediticios.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [organizationId]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!organizationId) {
      setLoading(false);
      return;
    }

    void loadWorkflows();
  }, [authLoading, loadWorkflows, organizationId]);

  const analystOptions = useMemo(() => {
    const options = workflows
      .map(workflow => workflow.assigned_to_user_name?.trim())
      .filter((value): value is string => Boolean(value));

    return Array.from(new Set(options)).sort((a, b) => a.localeCompare(b));
  }, [workflows]);

  const filteredWorkflows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workflows.filter(workflow => {
      if (statusFilter !== 'all' && workflow.status !== statusFilter) {
        return false;
      }

      if (analystFilter === 'unassigned' && workflow.assigned_to_user_name) {
        return false;
      }

      if (
        analystFilter !== 'all' &&
        analystFilter !== 'unassigned' &&
        workflow.assigned_to_user_name !== analystFilter
      ) {
        return false;
      }

      if (!matchesDueFilter(workflow.sla_due_at, dueFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        workflow.oportunidad_nombre,
        workflow.cliente_nombre,
        workflow.assigned_to_user_name,
        workflow.stage_origin_name,
        workflow.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [analystFilter, dueFilter, search, statusFilter, workflows]);

  const metrics = useMemo(() => {
    const overdueCount = workflows.filter(
      workflow => workflow.sla_due_at && new Date(workflow.sla_due_at) < new Date()
    ).length;

    return {
      active: workflows.length,
      analysis: workflows.filter(workflow => workflow.status === 'en_analisis')
        .length,
      committee: workflows.filter(workflow => workflow.status === 'comite').length,
      overdue: overdueCount,
    };
  }, [workflows]);

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
              <Badge className="bg-emerald-100 text-emerald-700">
                Gestion Crediticia
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Bandeja operativa de analisis crediticio
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  Cola por tenant para operar workflows activos sin separar el caso
                  de su oportunidad comercial. Desde aca el analista puede filtrar,
                  priorizar y saltar al caso o al analisis del cliente.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => void loadWorkflows('refresh')}
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
                <p className="text-sm text-slate-500">Casos activos</p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">
                  {metrics.active}
                </p>
              </div>
              <Briefcase className="h-8 w-8 text-slate-300" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">En analisis</p>
                <p className="mt-1 text-3xl font-semibold text-blue-700">
                  {metrics.analysis}
                </p>
              </div>
              <FileSearch className="h-8 w-8 text-blue-300" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">En comite</p>
                <p className="mt-1 text-3xl font-semibold text-violet-700">
                  {metrics.committee}
                </p>
              </div>
              <Users className="h-8 w-8 text-violet-300" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">SLA vencido</p>
                <p className="mt-1 text-3xl font-semibold text-rose-700">
                  {metrics.overdue}
                </p>
              </div>
              <CalendarClock className="h-8 w-8 text-rose-300" />
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Buscar caso
                </label>
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Oportunidad, cliente, analista..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Estado
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(STATUS_LABELS)
                      .filter(([status]) => status !== 'cerrado')
                      .map(([status, label]) => (
                        <SelectItem key={status} value={status}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Analista
                </label>
                <Select value={analystFilter} onValueChange={setAnalystFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los analistas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {analystOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Vencimiento
                </label>
                <Select
                  value={dueFilter}
                  onValueChange={value => setDueFilter(value as DueFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="overdue">Vencidos</SelectItem>
                    <SelectItem value="today">Vence hoy</SelectItem>
                    <SelectItem value="this_week">Esta semana</SelectItem>
                    <SelectItem value="without_sla">Sin SLA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                <List className="h-4 w-4" />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  viewMode === 'kanban'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <Card className="rounded-2xl border border-rose-200 bg-rose-50">
            <CardContent className="flex items-start gap-3 p-5 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">No se pudo abrir la bandeja</p>
                <p className="mt-1">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!error && filteredWorkflows.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <CardContent className="p-10 text-center">
              <p className="text-base font-medium text-slate-700">
                No hay casos activos con los filtros seleccionados.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Ajusta estado, analista o vencimiento para revisar otra cola.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!error && filteredWorkflows.length > 0 && viewMode === 'kanban' ? (
          <CreditWorkflowKanban workflows={filteredWorkflows} />
        ) : null}

        {!error && filteredWorkflows.length > 0 && viewMode === 'list' ? (
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-slate-900">
                  Casos activos
                </CardTitle>
                <p className="text-sm text-slate-500">
                  {filteredWorkflows.length} workflow
                  {filteredWorkflows.length === 1 ? '' : 's'} en la cola actual.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredWorkflows.map(workflow => (
                <div
                  key={workflow.id}
                  className="grid gap-4 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">
                        {workflow.oportunidad_nombre}
                      </h2>
                      <Badge className={STATUS_BADGE_CLASSNAMES[workflow.status]}>
                        {STATUS_LABELS[workflow.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {workflow.cliente_nombre}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                      <span>
                        Analista:{' '}
                        {workflow.assigned_to_user_name || 'Sin asignar'}
                      </span>
                      <span>Origen: {workflow.stage_origin_name}</span>
                      <span>SLA: {formatDate(workflow.sla_due_at)}</span>
                      <span>Actualizado: {formatDate(workflow.updated_at)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-900">
                        Evaluacion vigente:
                      </span>{' '}
                      {workflow.evaluacion_id_vigente || 'Sin evaluacion asociada'}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Notas:</span>{' '}
                      {workflow.notes || 'Sin notas operativas.'}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <Link href={`/crm/oportunidades/${workflow.oportunidad_id}`}>
                      <Button variant="outline" className="w-full lg:w-auto">
                        Abrir caso
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/crm/clientes/${workflow.crm_organizacion_id}`}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 lg:w-auto">
                        Abrir analisis
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
