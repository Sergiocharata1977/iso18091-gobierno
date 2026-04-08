'use client';

import type { AgenticCenterDemoScenario } from '../../../content/agentic-center/demo-scenarios';
import AgenticCenterManualLab from '@/components/agentic-center/AgenticCenterManualLab';
import AgenticKanbanBoard from '@/components/agentic-center/AgenticKanbanBoard';
import AgenticKpiRow from '@/components/agentic-center/AgenticKpiRow';
import CaseTypeTabs, {
  type AgenticPrimaryFilter,
} from '@/components/agentic-center/CaseTypeTabs';
import {
  buildCaseViewModel,
  type AgenticCaseViewModel,
} from '@/components/agentic-center/agenticCenterPresentation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import type { AgenticCenterCase, AgenticCenterSummary } from '@/types/agentic-center';
import { AlertTriangle, Filter, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface CasesResponse {
  success: boolean;
  error?: string;
  data?: {
    organizationId: string;
    generatedAt: string;
    casos: AgenticCenterCase[];
  };
}

interface SummaryResponse {
  success: boolean;
  error?: string;
  data?: AgenticCenterSummary;
}

interface AgenticCenterCaseViewProps {
  demoScenarios: AgenticCenterDemoScenario[];
}

export default function AgenticCenterCaseView({
  demoScenarios,
}: AgenticCenterCaseViewProps) {
  const [summary, setSummary] = useState<AgenticCenterSummary | null>(null);
  const [cases, setCases] = useState<AgenticCenterCase[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primaryFilter, setPrimaryFilter] = useState<AgenticPrimaryFilter>('todos');
  const [priorityFilter, setPriorityFilter] = useState('todas');
  const [ownerFilter, setOwnerFilter] = useState('todos');
  const [originFilter, setOriginFilter] = useState('todos');
  const [areaFilter, setAreaFilter] = useState('todas');

  async function loadData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [summaryRes, casesRes] = await Promise.all([
        fetch('/api/agentic-center/summary', { cache: 'no-store' }),
        fetch('/api/agentic-center/cases', { cache: 'no-store' }),
      ]);

      const [summaryJson, casesJson] = (await Promise.all([
        summaryRes.json(),
        casesRes.json(),
      ])) as [SummaryResponse, CasesResponse];

      if (!summaryJson.success) {
        throw new Error(summaryJson.error ?? 'No se pudo cargar el resumen ejecutivo.');
      }

      if (!casesJson.success) {
        throw new Error(casesJson.error ?? 'No se pudo cargar la narrativa de casos.');
      }

      const nextCases = casesJson.data?.casos ?? [];

      setSummary(summaryJson.data ?? null);
      setCases(nextCases);
      setGeneratedAt(casesJson.data?.generatedAt ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Ocurrio un error inesperado al cargar el Centro Agentico.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const viewModels = useMemo(
    () => cases.map(caseItem => buildCaseViewModel(caseItem)),
    [cases]
  );

  const typeCounts = useMemo(
    () => ({
      todos: viewModels.length,
      alerta: viewModels.filter(item => item.type === 'alerta').length,
      'accion-sugerida': viewModels.filter(item => item.type === 'accion-sugerida').length,
      'cambio-registro': viewModels.filter(item => item.type === 'cambio-registro').length,
    }),
    [viewModels]
  );

  const ownerOptions = useMemo(
    () => ['todos', ...new Set(viewModels.map(item => item.owner))],
    [viewModels]
  );
  const originOptions = useMemo(
    () => ['todos', ...new Set(viewModels.map(item => item.origin))],
    [viewModels]
  );
  const areaOptions = useMemo(
    () => ['todas', ...new Set(viewModels.map(item => item.area))],
    [viewModels]
  );

  const filteredCases = useMemo(
    () =>
      viewModels.filter(item => {
        if (primaryFilter !== 'todos' && item.type !== primaryFilter) return false;
        if (priorityFilter !== 'todas' && item.priority !== priorityFilter) return false;
        if (ownerFilter !== 'todos' && item.owner !== ownerFilter) return false;
        if (originFilter !== 'todos' && item.origin !== originFilter) return false;
        if (areaFilter !== 'todas' && item.area !== areaFilter) return false;
        return true;
      }),
    [areaFilter, originFilter, ownerFilter, primaryFilter, priorityFilter, viewModels]
  );

  const selectedCase: AgenticCaseViewModel | null =
    filteredCases.length === 0
      ? null
      : filteredCases[0] ?? null;

  const selectedScenario =
    demoScenarios.find(item => item.id === selectedCase?.caseItem.id) ?? null;

  if (loading) {
    return (
      <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.08),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
        <div className="flex w-full flex-col gap-6 px-4 py-6 md:px-6">
          <Skeleton className="h-32 rounded-[28px]" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-[680px] rounded-[28px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.08),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="flex w-full flex-col gap-5 px-4 py-6 md:px-6 lg:py-8">
        <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">
                  Centro operativo
                </Badge>
                {generatedAt ? (
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                    Actualizado{' '}
                    {formatDate(generatedAt, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Centro de Ejecucion IA
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gestion centralizada de alertas, acciones sugeridas y cambios de registro.
                Un unico tablero operativo, con casos clasificados, estado visible y trazabilidad.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Casos visibles
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{filteredCases.length}</p>
              </div>
              <Button
                className="gap-2"
                onClick={() => void loadData(true)}
                type="button"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar vista
              </Button>
            </div>
          </div>
        </section>

        {error ? (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {summary ? <AgenticKpiRow summary={summary} casesOpen={viewModels.length} /> : null}

        <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Clasificacion principal
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Sistema Kanban de casos IA
                </h2>
              </div>
              {selectedScenario ? (
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  {selectedScenario.businessImpact}
                </p>
              ) : null}
            </div>

            <CaseTypeTabs
              value={primaryFilter}
              onChange={setPrimaryFilter}
              counts={typeCounts}
            />

            <div className="grid gap-3 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las prioridades</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder="Responsable" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option === 'todos' ? 'Todos los responsables' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  {originOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option === 'todos' ? 'Todos los origenes' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent>
                  {areaOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option === 'todas' ? 'Todas las areas' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
                <Filter className="mr-2 h-4 w-4" />
                {filteredCases.length} visibles
              </div>
            </div>
          </div>
        </section>

        <section>
          {filteredCases.length > 0 ? (
            <AgenticKanbanBoard items={filteredCases} />
          ) : (
            <Card className="rounded-[28px] border-slate-200 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950">Sin resultados</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-slate-600">
                Los filtros actuales no devuelven casos. Ajusta prioridad, responsable,
                origen o area para recuperar el tablero.
              </CardContent>
            </Card>
          )}
        </section>

        <details className="group rounded-[24px] border border-slate-200 bg-white/80 p-1 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-[20px] px-4 py-3 text-sm font-medium text-slate-700">
            Laboratorio manual y acceso tecnico secundario
            <span className="text-xs text-slate-500 group-open:hidden">Expandir</span>
            <span className="hidden text-xs text-slate-500 group-open:inline">Ocultar</span>
          </summary>
          <div className="border-t border-slate-200 p-4">
            <AgenticCenterManualLab />
          </div>
        </details>
      </div>
    </div>
  );
}
