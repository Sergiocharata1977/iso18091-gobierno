'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bug,
  ClipboardList,
  Loader2,
  RefreshCw,
  Target,
  Users,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type VisualStatus = 'ok' | 'atencion' | 'critico' | 'sin_asignacion';

interface UserSummary {
  personnelId: string;
  userId: string | null;
  nombreCompleto: string;
  puesto: string;
  departamento: string;
  estado: string;
  tieneAccesoSistema: boolean;
  procesosAsignados: number;
  processCompletionPct: number | null;
  registrosTotal: number;
  registrosPendientes: number;
  tareasVencidas: number;
  accionesAbiertas: number;
  accionesVencidas: number;
  indicadoresAsignados: number;
  medicionesPendientes: number;
  medicionesVencidas: number;
  eventosProximos: number;
  scoreCumplimiento: number;
  estadoVisual: VisualStatus;
}

interface ResumenResponse {
  data: UserSummary[];
  filters: {
    departamentos: string[];
    puestos: string[];
    estados: string[];
  };
  resumenGlobal: {
    totalPersonalActivo: number;
    porcentajeConPendientes: number;
    porcentajeSinAsignacion: number;
    totalAccionesVencidasGlobal: number;
  };
}

interface PanelDiagnosticsResponse {
  targetUserId: string;
  findings?: string[];
  panel_effective_context?: {
    procesos_count?: number;
    process_records_count?: number;
  };
  assignments?: {
    direct_aggregates?: { procesos_asignados?: string[] };
    granular_active?: { count?: number; procesos_asignados?: string[] };
    position_legacy?: { procesos_asignados?: string[] };
  };
}

interface PanelRepairResponse {
  success: boolean;
  changed?: boolean;
  source_applied?: string;
  message?: string;
  counts?: {
    panel_processes_after?: number;
    granular_assignments_active?: number;
  };
}

function statusMeta(status: VisualStatus) {
  switch (status) {
    case 'ok':
      return {
        label: 'OK',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        borderClass: 'border-l-4 border-l-emerald-500',
      };
    case 'atencion':
      return {
        label: 'Atención',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        borderClass: 'border-l-4 border-l-amber-500',
      };
    case 'critico':
      return {
        label: 'Crítico',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        borderClass: 'border-l-4 border-l-red-500',
      };
    case 'sin_asignacion':
      return {
        label: 'Sin asignaciones',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        borderClass: 'border-l-4 border-l-rose-500',
      };
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('');
}

export default function ResumenUsuariosMiSGCPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ResumenResponse | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [diagnosingUserId, setDiagnosingUserId] = useState<string | null>(null);
  const [repairingUserId, setRepairingUserId] = useState<string | null>(null);
  const [batchDiagnosing, setBatchDiagnosing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [panelDiagnosticsByUser, setPanelDiagnosticsByUser] = useState<
    Record<string, PanelDiagnosticsResponse>
  >({});

  const [q, setQ] = useState('');
  const [departamento, setDepartamento] = useState('all');
  const [puesto, setPuesto] = useState('all');
  const [estado, setEstado] = useState('all');
  const [panelIssueFilter, setPanelIssueFilter] = useState<'all' | 'issues'>(
    'all'
  );

  const canView =
    user &&
    ['admin', 'gerente', 'auditor', 'super_admin'].includes(user.rol || '');

  const refreshSummary = () => setReloadNonce(prev => prev + 1);

  useEffect(() => {
    if (authLoading) return;
    if (!canView) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (departamento !== 'all') params.set('departamento', departamento);
        if (puesto !== 'all') params.set('puesto', puesto);
        if (estado !== 'all') params.set('estado', estado);
        const res = await fetch(`/api/mi-sgc/resumen-usuarios?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando resumen');
        if (mounted) setPayload(data);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Error cargando resumen'
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [authLoading, canView, q, departamento, puesto, estado, reloadNonce]);

  const runPanelDiagnostics = async (userId: string) => {
    try {
      setDiagnosingUserId(userId);
      const res = await fetch(
        `/api/context/user/diagnostics?userId=${encodeURIComponent(userId)}&refresh=true`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en diagnóstico');

      setPanelDiagnosticsByUser(prev => ({
        ...prev,
        [userId]: data as PanelDiagnosticsResponse,
      }));

      const findingsCount = Array.isArray(data.findings)
        ? data.findings.length
        : 0;
      toast({
        title: 'Diagnóstico del panel',
        description:
          findingsCount > 0
            ? `${findingsCount} hallazgo(s) detectado(s)`
            : 'Sin hallazgos. El contexto del panel se ve consistente.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'No se pudo diagnosticar el panel',
        variant: 'destructive',
      });
    } finally {
      setDiagnosingUserId(null);
    }
  };

  const runPanelDiagnosticsSilent = async (userId: string) => {
    const res = await fetch(
      `/api/context/user/diagnostics?userId=${encodeURIComponent(userId)}&refresh=true`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en diagnóstico');
    setPanelDiagnosticsByUser(prev => ({
      ...prev,
      [userId]: data as PanelDiagnosticsResponse,
    }));
    return data as PanelDiagnosticsResponse;
  };

  const repairPanelAssignments = async (userId: string) => {
    try {
      setRepairingUserId(userId);
      const res = await fetch('/api/context/user/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          dryRun: false,
          source: 'auto',
        }),
      });
      const data = (await res.json()) as PanelRepairResponse & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Error reparando panel');

      toast({
        title: 'Panel reparado',
        description: `Fuente: ${data.source_applied || 'auto'} · Procesos en panel: ${data.counts?.panel_processes_after ?? 0}`,
      });

      await runPanelDiagnostics(userId);
      refreshSummary();
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'No se pudo reparar el panel',
        variant: 'destructive',
      });
    } finally {
      setRepairingUserId(null);
    }
  };

  const diagnoseVisibleUsers = async () => {
    const userIds = visibleItems
      .map(item => item.userId)
      .filter((id): id is string => typeof id === 'string' && !!id);

    if (userIds.length === 0) {
      toast({
        title: 'Sin usuarios',
        description:
          'No hay usuarios visibles con acceso a Mi Panel para diagnosticar.',
      });
      return;
    }

    try {
      setBatchDiagnosing(true);
      setBatchProgress({ done: 0, total: userIds.length });

      let ok = 0;
      let failed = 0;
      for (let i = 0; i < userIds.length; i += 1) {
        const userId = userIds[i];
        try {
          await runPanelDiagnosticsSilent(userId);
          ok += 1;
        } catch (error) {
          failed += 1;
          console.warn('[ResumenUsuariosMiSGCPage] diagnóstico batch falló', {
            userId,
            error,
          });
        } finally {
          setBatchProgress({ done: i + 1, total: userIds.length });
        }
      }

      toast({
        title: 'Diagnóstico batch completado',
        description: `OK: ${ok} · Errores: ${failed} · Total: ${userIds.length}`,
      });
    } finally {
      setBatchDiagnosing(false);
      setBatchProgress(null);
    }
  };

  const cards = useMemo(
    () => [
      {
        title: 'Total Personal Activo',
        value: payload?.resumenGlobal.totalPersonalActivo ?? 0,
        icon: Users,
      },
      {
        title: '% con pendientes',
        value: `${payload?.resumenGlobal.porcentajeConPendientes ?? 0}%`,
        icon: ClipboardList,
      },
      {
        title: '% sin asignación',
        value: `${payload?.resumenGlobal.porcentajeSinAsignacion ?? 0}%`,
        icon: AlertTriangle,
      },
      {
        title: 'Acciones vencidas (global)',
        value: payload?.resumenGlobal.totalAccionesVencidasGlobal ?? 0,
        icon: BarChart3,
      },
    ],
    [payload]
  );

  const visibleItems = useMemo(() => {
    const base = payload?.data || [];
    if (panelIssueFilter === 'all') return base;

    return base.filter(item => {
      if (item.estadoVisual === 'sin_asignacion') return true;
      if (!item.userId) return false;
      const diag = panelDiagnosticsByUser[item.userId];
      return Array.isArray(diag?.findings) && diag.findings.length > 0;
    });
  }, [payload, panelIssueFilter, panelDiagnosticsByUser]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-6 text-amber-800">
            No tenés permisos para ver el resumen de dashboards individuales.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6 text-red-700">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Resumen de Dashboards Individuales
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Vista gerencial del estado ISO distribuido por persona (Mi Panel).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={diagnoseVisibleUsers}
              disabled={batchDiagnosing || loading}
              title="Ejecuta diagnóstico del panel para todos los usuarios visibles"
            >
              {batchDiagnosing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bug className="mr-2 h-4 w-4" />
              )}
              Diagnosticar visibles
            </Button>
          </div>
        </div>
        {batchProgress && (
          <p className="text-xs text-slate-500 mt-2">
            Diagnóstico batch en progreso: {batchProgress.done}/
            {batchProgress.total}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{card.title}</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Buscar por nombre</Label>
            <Input
              placeholder="Ej: Juan / Calidad"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Departamento</Label>
            <Select value={departamento} onValueChange={setDepartamento}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(payload?.filters.departamentos || []).map(dep => (
                  <SelectItem key={dep} value={dep}>
                    {dep}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Puesto</Label>
            <Select value={puesto} onValueChange={setPuesto}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(payload?.filters.puestos || []).map(p => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="atencion">Atención</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
                <SelectItem value="sin_asignacion">Sin asignación</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Problemas Mi Panel</Label>
            <Select
              value={panelIssueFilter}
              onValueChange={value =>
                setPanelIssueFilter(value as 'all' | 'issues')
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="issues">
                  Solo con problemas de Mi Panel
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleItems.map(item => {
          const meta = statusMeta(item.estadoVisual);
          const critical = item.estadoVisual === 'critico';
          const diag = item.userId ? panelDiagnosticsByUser[item.userId] : null;
          const isDiagnosing = diagnosingUserId === item.userId;
          const isRepairing = repairingUserId === item.userId;
          return (
            <Card
              key={item.personnelId}
              className={`${meta.borderClass} ${critical ? 'shadow-red-100' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {initials(item.nombreCompleto)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {item.nombreCompleto}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {item.puesto} · {item.departamento}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className={meta.badgeClass}>
                      {meta.label}
                    </Badge>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {item.userId ? (
                        <>
                          <Link
                            href={`/dashboard/mi-panel?userId=${item.userId}&modo=supervisor`}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                            >
                              Ver Panel <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => runPanelDiagnostics(item.userId!)}
                            disabled={isDiagnosing || isRepairing}
                            title="Diagnosticar contexto de Mi Panel"
                          >
                            {isDiagnosing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Bug className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 border-emerald-200 text-emerald-700"
                            onClick={() => repairPanelAssignments(item.userId!)}
                            disabled={isDiagnosing || isRepairing}
                            title="Re-sincronizar asignaciones del panel"
                          >
                            {isRepairing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Wrench className="h-3 w-3" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <Badge variant="secondary">Sin usuario</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {diag && (
                  <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">
                        Diagnóstico Mi Panel
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          item.userId && runPanelDiagnostics(item.userId)
                        }
                        disabled={isDiagnosing || isRepairing}
                      >
                        <RefreshCw
                          className={`mr-1 h-3 w-3 ${isDiagnosing ? 'animate-spin' : ''}`}
                        />
                        Actualizar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        Panel procesos:{' '}
                        {diag.panel_effective_context?.procesos_count ?? 0}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Directos:{' '}
                        {diag.assignments?.direct_aggregates?.procesos_asignados
                          ?.length ?? 0}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Granulares:{' '}
                        {diag.assignments?.granular_active?.count ?? 0}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Puesto legacy:{' '}
                        {diag.assignments?.position_legacy?.procesos_asignados
                          ?.length ?? 0}
                      </Badge>
                    </div>
                    {Array.isArray(diag.findings) &&
                    diag.findings.length > 0 ? (
                      <div className="space-y-1">
                        {diag.findings.slice(0, 3).map((finding, idx) => (
                          <p key={idx} className="text-xs text-amber-700">
                            {finding}
                          </p>
                        ))}
                        {diag.findings.length > 3 && (
                          <p className="text-xs text-slate-500">
                            +{diag.findings.length - 3} hallazgo(s) más
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-700">
                        Sin hallazgos de consistencia en el panel.
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Procesos</p>
                    <span className="text-sm font-semibold">
                      {item.procesosAsignados}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${item.processCompletionPct ?? 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Completitud registros: {item.processCompletionPct ?? 0}%
                  </p>
                  {item.procesosAsignados === 0 && (
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      Sin procesos asignados
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-slate-500">Tareas pendientes</p>
                    <p className="text-xl font-bold">
                      {item.registrosPendientes}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Vencidas: {item.tareasVencidas}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-slate-500">Acciones abiertas</p>
                    <p className="text-xl font-bold">{item.accionesAbiertas}</p>
                    <p className="text-xs text-red-600 mt-1">
                      Vencidas: {item.accionesVencidas}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-slate-500">Indicadores</p>
                    <p className="text-xl font-bold">
                      {item.indicadoresAsignados}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Mediciones pend.: {item.medicionesPendientes}
                    </p>
                    <p className="text-xs text-red-600">
                      Vencidas: {item.medicionesVencidas}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-slate-500">
                      Cumplimiento individual
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Target className="h-4 w-4 text-emerald-600" />
                      <p className="text-xl font-bold">
                        {item.scoreCumplimiento}%
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Eventos próximos: {item.eventosProximos}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {visibleItems.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            No hay usuarios que coincidan con los filtros
            {panelIssueFilter === 'issues'
              ? ' (o todavía no fueron diagnosticados).'
              : '.'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
