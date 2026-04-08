'use client';

import { AICenterPanel } from '@/components/mi-panel/AICenterPanel';
import type { MiPanelUnifiedMessage } from '@/components/mi-panel/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInstalledCapabilities } from '@/hooks/useInstalledCapabilities';
import Link from 'next/link';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import {
  sendConverseRequest,
  setStoredAIConversationId,
  setStoredActiveAISessionId,
} from '@/lib/ai/converseClient';
import {
  AlertTriangle,
  Bot,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardCheck,
  HardHat,
  Loader2,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserX,
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type HseData = {
  incidentes: { abiertos: number; total: number };
  peligros: { por_nivel: Record<string, number> };
  epp: { total: number };
};

type DashboardProcess = {
  id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  estado: string;
  activo: boolean;
};

type DashboardAction = {
  id: string;
  source: 'actions' | 'crm_acciones';
  titulo: string;
  estado: string;
  processId: string | null;
  processName: string | null;
  prioridad: string | null;
  responsibleName: string | null;
  dueDate: string | null;
  createdAt: string | null;
};

type DashboardData = {
  departamento: {
    id: string;
    nombre: string | null;
    descripcion: string | null;
  } | null;
  procesos: DashboardProcess[];
  acciones_abiertas: DashboardAction[];
  total_procesos: number;
  procesos_con_alertas: number;
  open_actions_count: number;
  emptyReason: 'missing_personnel' | 'missing_department' | null;
};

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-AR');
}

function formatStatusLabel(status: string): string {
  const normalized = status.replaceAll('_', ' ').trim();
  if (!normalized) return 'Sin estado';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'success' {
  const normalized = status.trim().toLowerCase();
  if (
    ['activo', 'active', 'completada', 'completed', 'ok'].includes(normalized)
  ) {
    return 'success';
  }
  if (
    ['draft', 'borrador', 'planificada', 'programada', 'en_control'].includes(
      normalized
    )
  ) {
    return 'secondary';
  }
  return 'default';
}

function buildDepartmentAnalysisPrompt(data: DashboardData): string {
  const processLines = data.procesos
    .slice(0, 12)
    .map(
      process =>
        `- ${process.codigo ? `${process.codigo} · ` : ''}${process.nombre} (${formatStatusLabel(process.estado)})`
    )
    .join('\n');

  const actionLines = data.acciones_abiertas
    .slice(0, 10)
    .map(
      action =>
        `- ${action.titulo}${action.processName ? ` · Proceso: ${action.processName}` : ''}${action.dueDate ? ` · Vence: ${formatDate(action.dueDate)}` : ''}`
    )
    .join('\n');

  return `Analiza la situacion operativa del departamento ${data.departamento?.nombre || 'sin nombre'}.

Contexto:
- Total de procesos: ${data.total_procesos}
- Controles/acciones abiertas: ${data.open_actions_count}
- Procesos con alertas: ${data.procesos_con_alertas}

Procesos del departamento:
${processLines || '- Sin procesos asignados'}

Acciones abiertas:
${actionLines || '- Sin acciones abiertas'}

Necesito un analisis breve y accionable con:
1. Riesgos inmediatos.
2. Prioridades de esta semana.
3. Recomendaciones concretas para el gerente/jefe.
4. Si falta informacion critica, indicala explicitamente.`;
}

export default function MiDepartamentoPage() {
  const { user } = useAuth();
  const { hasCapability, loading: capLoading } = useInstalledCapabilities();
  const hasHse = !capLoading && hasCapability('pack_hse');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [hseData, setHseData] = useState<HseData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [assigningDefault, setAssigningDefault] = useState(false);
  const [bootstrappingAI, setBootstrappingAI] = useState(false);
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [aiConversationId, setAiConversationId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<MiPanelUnifiedMessage[]>([]);
  const [expandedProcessId, setExpandedProcessId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/departamentos/mi-dashboard', {
        cache: 'no-store',
      });
      const json = (await response.json()) as DashboardData & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          json.error || 'No se pudo cargar el panel del departamento'
        );
      }

      setDashboard(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error cargando el dashboard'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!user?.organization_id || !hasHse) return;
    void fetch(
      `/api/hse/dashboard?organization_id=${encodeURIComponent(user.organization_id)}`,
      { cache: 'no-store' }
    )
      .then(r => r.json())
      .then((json: { success: boolean; data: HseData }) => {
        if (json.success) setHseData(json.data);
      })
      .catch(() => {}); // silencioso — la tarjeta HSE simplemente no aparece
  }, [user?.organization_id, hasHse]);

  const latestActions = useMemo(
    () => dashboard?.acciones_abiertas.slice(0, 6) || [],
    [dashboard]
  );

  const actionsByProcess = useMemo(() => {
    const grouped = new Map<string, DashboardAction[]>();

    dashboard?.acciones_abiertas.forEach(action => {
      if (!action.processId) return;
      const current = grouped.get(action.processId) || [];
      current.push(action);
      grouped.set(action.processId, current);
    });

    return grouped;
  }, [dashboard]);

  const bootstrapDepartmentAnalysis = useCallback(async () => {
    if (!dashboard || !user?.id || !user.organization_id) return;
    if (aiSessionId && aiConversationId) return;

    try {
      setBootstrappingAI(true);

      const sessionResponse = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'assistant',
          module: 'mi-departamento',
        }),
      });
      const sessionJson = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(
          sessionJson.error || 'No se pudo crear la sesion de analisis'
        );
      }

      const createdSessionId =
        typeof sessionJson?.session?.id === 'string'
          ? sessionJson.session.id
          : null;

      if (!createdSessionId) {
        throw new Error('La sesion IA no devolvio un id valido');
      }

      const prompt = buildDepartmentAnalysisPrompt(dashboard);
      const aiResponse = await sendConverseRequest({
        channel: 'chat',
        message: prompt,
        organizationId: user.organization_id,
        sessionId: createdSessionId,
        pathname: '/mi-departamento',
      });

      const normalizedMessages: MiPanelUnifiedMessage[] = Array.isArray(
        aiResponse.messages
      )
        ? aiResponse.messages
            .filter(Boolean)
            .map(message => ({
              id: message.id,
              role:
                message.role === 'assistant' || message.role === 'system'
                  ? message.role
                  : 'user',
              channel:
                message.channel === 'voice' || message.channel === 'whatsapp'
                  ? message.channel
                  : 'chat',
              content: message.content || '',
              traceId: message.traceId,
              timestamp: message.timestamp,
            }))
        : [];

      setAiSessionId(createdSessionId);
      setAiConversationId(aiResponse.conversationId || null);
      setAiMessages(normalizedMessages);
      setStoredActiveAISessionId(user.id, createdSessionId);
      if (aiResponse.conversationId) {
        setStoredAIConversationId(createdSessionId, aiResponse.conversationId);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar el analisis con IA'
      );
    } finally {
      setBootstrappingAI(false);
    }
  }, [aiConversationId, aiSessionId, dashboard, user]);

  const handleSetupContexto = useCallback(async () => {
    try {
      setAssigningDefault(true);
      setError(null);
      const res = await fetch('/api/admin/setup-usuario-contexto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_uid: user?.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo configurar el contexto');
      }
      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error configurando el contexto'
      );
    } finally {
      setAssigningDefault(false);
    }
  }, [loadDashboard, user?.id]);

  const handleAssignDefault = useCallback(async () => {
    try {
      setAssigningDefault(true);
      setError(null);
      const res = await fetch('/api/departamentos/asignar-default', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo asignar el departamento');
      }
      // Recargar el dashboard con el nuevo departamento asignado
      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error asignando departamento'
      );
    } finally {
      setAssigningDefault(false);
    }
  }, [loadDashboard]);

  const handleOpenAnalysis = useCallback(async () => {
    setSheetOpen(true);
    if (!aiSessionId || !aiConversationId) {
      await bootstrapDepartmentAnalysis();
    }
  }, [aiConversationId, aiSessionId, bootstrapDepartmentAnalysis]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="flex h-[60vh] items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando panel departamental...
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <Card className="mx-auto mt-16 max-w-2xl border-red-200">
          <CardContent className="flex flex-col gap-4 p-8">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
            <div>
              <Button variant="outline" onClick={() => void loadDashboard()}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasDepartment = Boolean(dashboard?.departamento?.id);

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-6">
      <PageHeader
        title="Mi Departamento"
        description="Vista operativa del area asignada al usuario actual."
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Mi Departamento' },
        ]}
        actions={
          hasDepartment ? (
            <Button
              onClick={() => void handleOpenAnalysis()}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={bootstrappingAI}
            >
              {bootstrappingAI ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Analizar con Don Cándido
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      {!hasDepartment ? (
        dashboard?.emptyReason === 'missing_personnel' ? (
          // Sin registro de personal — no hay nada que auto-asignar
          <Card className="border-dashed border-slate-300 bg-white">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <div className="rounded-full bg-amber-100 p-4">
                <UserX className="h-8 w-8 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  Sin registro de personal vinculado
                </h2>
                <p className="max-w-xl text-sm text-slate-500">
                  Tu usuario no tiene un perfil de personal asociado en el
                  sistema. Pedile al administrador que cree tu ficha en{' '}
                  <strong>RRHH → Personal</strong> y la vincule a tu cuenta.
                </p>
              </div>
              <Button variant="outline" onClick={() => void loadDashboard()}>
                <Loader2
                  className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : 'hidden'}`}
                />
                Actualizar
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Tiene personal pero sin departamento — puede auto-asignarse
          <Card className="border-dashed border-slate-300 bg-white">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <div className="rounded-full bg-slate-100 p-4">
                <Building2 className="h-8 w-8 text-slate-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">
                  Sin departamento asignado
                </h2>
                <p className="max-w-xl text-sm text-slate-500">
                  Tu perfil de personal existe pero todavía no tiene un
                  departamento vinculado. Podés asignarte al departamento de{' '}
                  <strong>Gerencia General</strong> para empezar a operar, o
                  pedile al administrador que configure tu área.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button
                  onClick={() => void handleAssignDefault()}
                  disabled={assigningDefault}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {assigningDefault ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  {assigningDefault
                    ? 'Asignando...'
                    : 'Asignarme a Gerencia General'}
                </Button>
                <Button variant="outline" onClick={() => void loadDashboard()}>
                  Actualizar datos
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          {dashboard?.total_procesos === 0 && (
            <Card className="border border-sky-200 bg-sky-50">
              <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                  <div>
                    <p className="font-medium text-sky-900">
                      Sin procesos configurados
                    </p>
                    <p className="text-sm text-sky-700">
                      Hay departamento asignado pero no hay procesos, objetivos ni
                      indicadores. Podés generar el contexto operativo completo en
                      un click.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => void handleSetupContexto()}
                  disabled={assigningDefault}
                  className="shrink-0 bg-sky-600 hover:bg-sky-700"
                >
                  {assigningDefault ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  {assigningDefault ? 'Generando...' : 'Generar contexto operativo'}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Total Procesos
                </CardTitle>
                <BriefcaseBusiness className="h-4 w-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {dashboard?.total_procesos || 0}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {dashboard?.departamento?.nombre || 'Departamento'} bajo
                  seguimiento.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Controles Abiertos
                </CardTitle>
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {dashboard?.open_actions_count || 0}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Acciones correctivas o seguimientos pendientes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Procesos con Alertas
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-slate-900">
                  {dashboard?.procesos_con_alertas || 0}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Procesos del area con acciones abiertas vinculadas.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr,1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">
                  Procesos del departamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard?.procesos.length ? (
                  dashboard.procesos.map(process => (
                    <Collapsible
                      key={process.id}
                      open={expandedProcessId === process.id}
                      onOpenChange={open =>
                        setExpandedProcessId(open ? process.id : null)
                      }
                    >
                      <div className="rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
                        <CollapsibleTrigger asChild>
                          <button className="flex w-full items-start justify-between gap-4 p-4 text-left">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-medium text-slate-900">
                                  {process.nombre}
                                </h3>
                                {process.codigo ? (
                                  <span className="text-xs text-slate-400">
                                    {process.codigo}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm text-slate-500">
                                {process.descripcion || 'Sin descripcion cargada.'}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <Badge variant={getStatusVariant(process.estado)}>
                                {formatStatusLabel(process.estado)}
                              </Badge>
                              <ChevronDown
                                className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${
                                  expandedProcessId === process.id ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="border-t border-slate-100 px-4 py-4 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                          {(() => {
                            const processActions =
                              actionsByProcess.get(process.id) || [];
                            const latestDueDate = processActions
                              .map(action => action.dueDate)
                              .filter((value): value is string => Boolean(value))
                              .sort()[0] || null;

                            return (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                  <div className="rounded-lg bg-slate-50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Estado operativo
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-900">
                                      {process.activo ? 'Activo y visible' : 'Inactivo'}
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Alertas vinculadas
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-900">
                                      {processActions.length} abiertas
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Proximo vencimiento
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-900">
                                      {latestDueDate ? formatDate(latestDueDate) : 'Sin fecha'}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Resumen
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {process.descripcion ||
                                      'Este proceso no tiene descripcion cargada. Conviene completar objetivo, alcance y responsable para que el area tenga contexto operativo.'}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Acciones abiertas
                                  </p>
                                  {processActions.length ? (
                                    <div className="space-y-2">
                                      {processActions.slice(0, 3).map(action => (
                                        <div
                                          key={action.id}
                                          className="rounded-lg border border-slate-200 px-3 py-2"
                                        >
                                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                            <p className="text-sm font-medium text-slate-900">
                                              {action.titulo}
                                            </p>
                                            <span className="text-xs text-slate-500">
                                              {action.dueDate
                                                ? `Vence ${formatDate(action.dueDate)}`
                                                : 'Sin vencimiento'}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-500">
                                            {formatStatusLabel(action.estado)}
                                            {action.responsibleName
                                              ? ` · Responsable: ${action.responsibleName}`
                                              : ''}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-500">
                                      No hay acciones abiertas vinculadas a este proceso.
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No hay procesos asociados a este departamento.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">
                  Ultimas acciones abiertas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestActions.length ? (
                  latestActions.map(action => (
                    <div
                      key={action.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">
                            {action.titulo}
                          </p>
                          <p className="text-sm text-slate-500">
                            {action.processName || 'Proceso no identificado'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {action.dueDate
                              ? `Vence ${formatDate(action.dueDate)}`
                              : 'Sin vencimiento'}
                          </p>
                        </div>
                        <Badge variant={getStatusVariant(action.estado)}>
                          {formatStatusLabel(action.estado)}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No hay acciones abiertas para este departamento.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tarjeta HSE — solo si pack_hse está activo */}
          {hasHse && hseData && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Seguridad HSE
                </CardTitle>
                <Link
                  href="/hse"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  Ver dashboard HSE →
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                    <p className={`text-2xl font-bold ${hseData.incidentes.abiertos > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {hseData.incidentes.abiertos}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">Incidentes abiertos</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                    <p className={`text-2xl font-bold ${(hseData.peligros.por_nivel['critico'] ?? 0) > 0 ? 'text-orange-600' : 'text-slate-700'}`}>
                      {hseData.peligros.por_nivel['critico'] ?? 0}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">Peligros críticos</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 text-center shadow-sm">
                    <p className="text-2xl font-bold text-violet-600">
                      <HardHat className="inline h-5 w-5 mr-1 mb-0.5" />
                      {hseData.epp.total}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">EPP registrados</p>
                  </div>
                </div>
                {hseData.incidentes.abiertos > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {hseData.incidentes.abiertos} incidente{hseData.incidentes.abiertos !== 1 ? 's' : ''} abierto{hseData.incidentes.abiertos !== 1 ? 's' : ''} requiriendo atención.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-3xl"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-600" />
              Don Cándido
            </SheetTitle>
            <SheetDescription>
              Analisis contextual del departamento actual.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {hasDepartment ? (
              bootstrappingAI && !aiSessionId ? (
                <div className="flex h-48 items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Preparando analisis inicial...
                </div>
              ) : (
                <AICenterPanel
                  sessionId={aiSessionId}
                  conversationId={aiConversationId}
                  title={`Analisis de ${dashboard?.departamento?.nombre || 'departamento'}`}
                  initialMessages={aiMessages}
                  initialMeta={
                    aiConversationId
                      ? {
                          id: aiConversationId,
                          status: 'active',
                        }
                      : null
                  }
                  allowCreateConversation
                  allowNewConversation
                  openChatHref="/historial-conversaciones"
                />
              )
            ) : (
              <p className="text-sm text-slate-500">
                Asigna un departamento al usuario para habilitar el analisis IA.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
