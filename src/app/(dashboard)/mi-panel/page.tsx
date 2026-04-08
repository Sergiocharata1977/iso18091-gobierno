'use client';

'use client';

import { ConfigurationPanel } from '@/components/mi-panel/ConfigurationPanel';
import { ContextHelpButton } from '@/components/docs/ContextHelpButton';
import { GlobalSummaryView } from '@/components/mi-panel/GlobalSummaryView';
import { MiPanelHeader } from '@/components/mi-panel/MiPanelHeader';
import { ProcessCanvasTab } from '@/components/mi-panel/ProcessCanvasTab';
import { ProcessDefinitionTab } from '@/components/mi-panel/ProcessDefinitionTab';
import { StrategicAnalysisSummaryCard } from '@/components/strategic-analysis/StrategicAnalysisSummaryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignmentEditor } from '@/hooks/mi-panel/useAssignmentEditor';
import { useAssignmentHierarchy } from '@/hooks/mi-panel/useAssignmentHierarchy';
import type { ProcessDefinition, ProcessRecord } from '@/types/procesos';
import type { QualityIndicator, QualityObjective } from '@/types/quality';
import type { Department, Position } from '@/types/rrhh';
import type { StrategicAnalysisReport } from '@/types/strategic-analysis';
import {
  BarChart3,
  FileText,
  LayoutGrid,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Workflow,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ProcessTab = 'canvas' | 'definicion' | 'metricas';
type LinkedModule = 'mejoras' | 'auditorias' | 'nc' | null | undefined;
type MiPanelProcess = ProcessDefinition & {
  modulo_vinculado?: LinkedModule;
};

interface MiPanelContext {
  user?: {
    email?: string;
    rol?: string;
    organization_id?: string | null;
  };
  personnel?: {
    id?: string;
    nombres?: string;
    apellidos?: string;
    email?: string;
    foto?: string;
    puesto?: string;
    puesto_id?: string;
    departamento?: string;
    departamento_id?: string;
    procesos_asignados?: string[];
    objetivos_asignados?: string[];
    indicadores_asignados?: string[];
  } | null;
  procesos?: ProcessDefinition[];
  processRecords?: ProcessRecord[];
  tasks?: {
    id: string;
    title: string;
    description?: string;
    type: 'task' | 'finding_review' | 'audit_preparation' | 'document_review';
    status: 'pending' | 'in_progress' | 'review' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: Date;
    created_at: Date;
    updated_at: Date;
  }[];
  ai?: {
    sessions?: Array<{ id?: string }>;
  } | null;
}

function parseDate(value: unknown) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function PendingView({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
      Pendiente: {name}
    </div>
  );
}

function resolveSystemModuleHref(modulo: LinkedModule) {
  if (modulo === 'auditorias') return '/mejoras/auditorias';
  if (modulo === 'nc') return '/mejoras/hallazgos';
  if (modulo === 'mejoras') return '/mejoras';
  return '/procesos/registros';
}

function ProcessSidebar({
  collapsed,
  processes,
  selectedProcessId,
  onSelect,
}: {
  collapsed: boolean;
  processes: Array<{ id: string; nombre: string; codigo?: string }>;
  selectedProcessId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {!collapsed ? (
        <>
          <Button
            type="button"
            variant="ghost"
            className="justify-start"
            onClick={() => onSelect(null)}
          >
            Vista global
          </Button>
          <div className="space-y-1">
            {processes.length === 0 ? (
              <PendingView name="ProcessSidebar" />
            ) : (
              processes.map(process => (
                <button
                  key={process.id}
                  type="button"
                  onClick={() => onSelect(process.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selectedProcessId === process.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">{process.nombre}</div>
                  <div
                    className={`text-xs ${selectedProcessId === process.id ? 'text-slate-200' : 'text-slate-500'}`}
                  >
                    {process.codigo || 'Sin codigo'}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Workflow className="h-5 w-5 text-slate-500" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Proc
          </span>
        </div>
      )}
    </div>
  );
}

export default function MiPanelPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<MiPanelContext | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(
    null
  );
  const [selectedTab, setSelectedTab] = useState<ProcessTab>('canvas');
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableProcesses, setAvailableProcesses] = useState<
    ProcessDefinition[]
  >([]);
  const [availableObjectives, setAvailableObjectives] = useState<
    QualityObjective[]
  >([]);
  const [availableIndicators, setAvailableIndicators] = useState<
    QualityIndicator[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [latestStrategicReport, setLatestStrategicReport] =
    useState<StrategicAnalysisReport | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;

    const loadContext = async () => {
      try {
        setLoading(true);
        setError(null);
        const search = new URLSearchParams(window.location.search);
        const params = new URLSearchParams();
        const canSupervisorView = [
          'admin',
          'gerente',
          'auditor',
          'super_admin',
        ].includes(user.rol || '');

        if (
          search.get('modo') === 'supervisor' &&
          search.get('userId') &&
          canSupervisorView
        ) {
          params.set('userId', search.get('userId') || '');
        }
        if (refreshNonce > 0) params.set('refresh', 'true');

        const res = await fetch(
          `/api/context/user${params.toString() ? `?${params}` : ''}`
        );
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.error || 'No se pudo cargar Mi Panel');
        if (mounted) setContext(json.data || null);
      } catch (contextError) {
        if (mounted)
          setError(
            contextError instanceof Error
              ? contextError.message
              : 'Error cargando Mi Panel'
          );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadContext();
    return () => {
      mounted = false;
    };
  }, [authLoading, refreshNonce, user]);

  useEffect(() => {
    let mounted = true;

    const loadLatestStrategicReport = async () => {
      try {
        const res = await fetch('/api/strategic-analysis/reports?limit=1');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) {
          const reports = Array.isArray(json.reports) ? json.reports : [];
          setLatestStrategicReport(reports[0] ?? null);
        }
      } catch {
        if (mounted) setLatestStrategicReport(null);
      }
    };

    void loadLatestStrategicReport();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const canEdit = ['admin', 'gerente', 'jefe', 'super_admin'].includes(
      user?.rol || ''
    );
    if (!canEdit || context === null) return;
    let mounted = true;

    const extractArray = (json: unknown): unknown[] => {
      if (Array.isArray(json)) return json;
      if (json && typeof json === 'object') {
        const payload = json as Record<string, unknown>;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload.results)) return payload.results;
        if (Array.isArray(payload.positions)) return payload.positions;
        if (Array.isArray(payload.departments)) return payload.departments;
        if (Array.isArray(payload.definitions)) return payload.definitions;
      }
      return [];
    };

    const normalizeProcess = (process: unknown): ProcessDefinition | null => {
      if (!process || typeof process !== 'object') return null;
      const raw = process as Record<string, unknown>;
      const id = String(raw.id || '').trim();
      if (!id) return null;

      return {
        ...(raw as unknown as ProcessDefinition),
        id,
        codigo: String(raw.codigo || raw.process_code || ''),
        nombre: String(raw.nombre || raw.name || ''),
        objetivo: String(raw.objetivo || raw.objective || ''),
        alcance: String(raw.alcance || raw.scope || ''),
        responsable: String(raw.responsable || raw.responsible || ''),
        estado:
          raw.estado === 'inactivo' || raw.activo === false
            ? 'inactivo'
            : 'activo',
        createdAt: (parseDate(raw.createdAt || raw.created_at) ||
          new Date()) as Date,
        updatedAt: (parseDate(raw.updatedAt || raw.updated_at) ||
          new Date()) as Date,
      };
    };

    const safeFetch = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return [];
      return extractArray(await res.json());
    };

    const loadCatalogs = async () => {
      try {
        setCatalogLoading(true);
        const [pos, deps, procs, objs, inds] = await Promise.all([
          safeFetch('/api/positions'),
          safeFetch('/api/rrhh/departments?limit=200'),
          safeFetch('/api/process-definitions'),
          safeFetch('/api/quality/objectives'),
          safeFetch('/api/quality/indicators'),
        ]);
        if (!mounted) return;
        setPositions(pos as Position[]);
        setDepartments(deps as Department[]);
        setAvailableProcesses(
          procs
            .map(normalizeProcess)
            .filter((process): process is ProcessDefinition => !!process)
        );
        setAvailableObjectives(objs as QualityObjective[]);
        setAvailableIndicators(inds as QualityIndicator[]);
      } catch {
        if (mounted)
          setError(
            prev => prev || 'No se pudieron cargar catalogos para configuracion'
          );
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    };

    void loadCatalogs();
    return () => {
      mounted = false;
    };
  }, [context, user?.rol]);

  const hierarchy = useAssignmentHierarchy({
    availableProcesses,
    availableObjectives,
    availableIndicators,
  });

  const canEdit = ['admin', 'gerente', 'jefe', 'super_admin'].includes(
    user?.rol || ''
  );
  const editorInitialValue = useMemo(
    () => ({
      puesto_id: context?.personnel?.puesto_id || '',
      departamento_id: context?.personnel?.departamento_id || '',
      procesos_asignados: context?.personnel?.procesos_asignados || [],
      objetivos_asignados: context?.personnel?.objetivos_asignados || [],
      indicadores_asignados: context?.personnel?.indicadores_asignados || [],
    }),
    [context]
  );
  const assignmentEditor = useAssignmentEditor({
    personnelId: context?.personnel?.id,
    initialValue: editorInitialValue,
    positions,
    departments,
    hierarchy,
    canEdit,
  });

  const fullName =
    `${context?.personnel?.nombres || user?.email?.split('@')[0] || 'Usuario'} ${context?.personnel?.apellidos || ''}`.trim();
  const processRecords = context?.processRecords || [];
  const overdueRecords = useMemo(
    () =>
      processRecords.filter(record => {
        const dueDate = parseDate(record.fecha_vencimiento);
        return (
          record.estado !== 'completado' && !!dueDate && dueDate < new Date()
        );
      }).length,
    [processRecords]
  );
  const assignedProcesses = useMemo(() => {
    const catalogMap = new Map(
      hierarchy.processNodes.map(node => [node.process.id, node.process])
    );
    const contextProcesses = context?.procesos || [];
    const ids = new Set([
      ...contextProcesses.map(process => process.id),
      ...assignmentEditor.assignmentEditor.procesos_asignados,
    ]);
    return Array.from(ids)
      .map(
        id =>
          contextProcesses.find(process => process.id === id) ||
          catalogMap.get(id)
      )
      .filter((process): process is ProcessDefinition => !!process);
  }, [
    assignmentEditor.assignmentEditor.procesos_asignados,
    context?.procesos,
    hierarchy.processNodes,
  ]);
  const selectedProcess =
    (assignedProcesses.find(process => process.id === selectedProcessId) as
      | MiPanelProcess
      | undefined) || null;
  const selectedProcessRecords = processRecords.filter(
    record => record.processId === selectedProcessId
  );
  const selectedProcessStats = useMemo(
    () => ({
      totalRecords: selectedProcessRecords.length,
      pendingRecords: selectedProcessRecords.filter(
        record => record.estado === 'pendiente'
      ).length,
      completedRecords: selectedProcessRecords.filter(
        record => record.estado === 'completado'
      ).length,
      overdueRecords: selectedProcessRecords.filter(record => {
        const dueDate = parseDate(record.fecha_vencimiento);
        return (
          record.estado !== 'completado' && !!dueDate && dueDate < new Date()
        );
      }).length,
    }),
    [selectedProcessRecords]
  );
  const selectedProcessObjectives = useMemo(
    () =>
      selectedProcessId
        ? availableObjectives.filter(
            objective => objective.process_definition_id === selectedProcessId
          )
        : [],
    [availableObjectives, selectedProcessId]
  );
  const selectedProcessIndicators = useMemo(
    () =>
      selectedProcessId
        ? availableIndicators.filter(
            indicator => indicator.process_definition_id === selectedProcessId
          )
        : [],
    [availableIndicators, selectedProcessId]
  );

  useEffect(() => {
    if (
      selectedProcessId &&
      !assignedProcesses.some(process => process.id === selectedProcessId)
    ) {
      setSelectedProcessId(null);
    }
  }, [assignedProcesses, selectedProcessId]);

  if (authLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-slate-500">
        Cargando Mi Panel...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const sidebar = (
    <ProcessSidebar
      collapsed={sidebarCollapsed}
      processes={assignedProcesses}
      selectedProcessId={selectedProcessId}
      onSelect={id => {
        setSelectedProcessId(id);
        setSidebarMobileOpen(false);
      }}
    />
  );

  return (
    <div className="space-y-5 bg-slate-100 p-4 md:p-6">
      <MiPanelHeader
        fullName={fullName}
        position={context?.personnel?.puesto}
        department={context?.personnel?.departamento}
        avatarUrl={context?.personnel?.foto}
        role={context?.user?.rol || user?.rol}
        organizationLabel={
          context?.user?.organization_id ||
          user?.organization_id ||
          'sin organizacion'
        }
        overdueRecords={overdueRecords}
        canEdit={canEdit}
        refreshing={loading}
        onRefresh={() => setRefreshNonce(prev => prev + 1)}
        onConfigure={() => setConfigPanelOpen(true)}
        actions={<ContextHelpButton route="/mi-panel" />}
      />

      <div className="flex items-center justify-between xl:hidden">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => setSidebarMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
          Procesos
        </Button>
      </div>

      <div className="flex gap-5">
        <aside
          className={`hidden shrink-0 xl:block ${sidebarCollapsed ? 'w-20' : 'w-[280px]'}`}
        >
          <div className="mb-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(prev => !prev)}
              aria-label="Alternar sidebar"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
          {sidebar}
        </aside>

        <main className="min-w-0 flex-1 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {selectedProcess ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-950">
                      {selectedProcess.nombre}
                    </h2>
                    <Badge variant="outline">{selectedProcess.codigo}</Badge>
                    <Badge
                      variant={
                        selectedProcess.estado === 'activo'
                          ? 'success'
                          : 'secondary'
                      }
                    >
                      {selectedProcess.estado}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {selectedProcess.objetivo ||
                      'Sin objetivo definido para este proceso.'}
                  </p>
                </div>
                <div className="text-sm text-slate-500">
                  {selectedProcessRecords.length} registros vinculados
                </div>
              </div>

              <Tabs
                value={selectedTab}
                onValueChange={value => setSelectedTab(value as ProcessTab)}
              >
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-slate-100">
                  <TabsTrigger value="canvas" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Canvas
                  </TabsTrigger>
                  <TabsTrigger value="definicion" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Definicion
                  </TabsTrigger>
                  <TabsTrigger value="metricas" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Metricas
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {selectedTab === 'canvas' ? (
                <ProcessCanvasTab
                  processId={selectedProcess.id}
                  processName={selectedProcess.nombre}
                  stats={selectedProcessStats}
                  hasSystemModule={Boolean(selectedProcess.modulo_vinculado)}
                  systemModuleHref={resolveSystemModuleHref(
                    selectedProcess.modulo_vinculado
                  )}
                />
              ) : null}
              {selectedTab === 'definicion' ? (
                <ProcessDefinitionTab
                  processDefinition={selectedProcess}
                  objectives={selectedProcessObjectives}
                  indicators={selectedProcessIndicators}
                />
              ) : null}
              {selectedTab === 'metricas' ? (
                <PendingView name="ProcessMetricsView" />
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <StrategicAnalysisSummaryCard
                report={latestStrategicReport}
                compact
              />
              <GlobalSummaryView
                processes={assignedProcesses}
                processRecords={processRecords}
                indicators={availableIndicators.filter(indicator =>
                  assignedProcesses.some(
                    process => process.id === indicator.process_definition_id
                  )
                )}
                objectives={availableObjectives.filter(objective =>
                  assignedProcesses.some(
                    process => process.id === objective.process_definition_id
                  )
                )}
                tasks={context?.tasks || []}
                chatSessionCount={context?.ai?.sessions?.length || 0}
                onSelectProcess={processId => setSelectedProcessId(processId)}
              />
            </div>
          )}
        </main>
      </div>

      <Sheet open={sidebarMobileOpen} onOpenChange={setSidebarMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-4">
          <SheetHeader>
            <SheetTitle>Procesos</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{sidebar}</div>
        </SheetContent>
      </Sheet>

      <ConfigurationPanel
        open={configPanelOpen}
        onOpenChange={setConfigPanelOpen}
        onSaveSuccess={() => setRefreshNonce(prev => prev + 1)}
        canEdit={canEdit}
        assignmentEditor={assignmentEditor.assignmentEditor}
        positions={positions}
        departments={departments}
        selectedPosition={assignmentEditor.selectedPosition}
        inferredDepartment={assignmentEditor.inferredDepartment}
        inheritedDepartment={assignmentEditor.departmentInheritedFromPosition}
        onPuestoChange={assignmentEditor.setPuestoId}
        onDepartamentoChange={assignmentEditor.setDepartamentoId}
        currentPuesto={context?.personnel?.puesto}
        currentDepartamento={context?.personnel?.departamento}
        assignmentCounts={assignmentEditor.assignmentCounts}
        hierarchy={hierarchy}
        catalogLoading={catalogLoading}
        hasUnsavedChanges={assignmentEditor.hasUnsavedChanges}
        saveLoading={assignmentEditor.saveLoading}
        saveMessage={assignmentEditor.saveMessage}
        saveState={assignmentEditor.saveState}
        onToggleProcess={assignmentEditor.toggleProcess}
        onToggleObjective={assignmentEditor.toggleObjective}
        onToggleIndicator={assignmentEditor.toggleIndicator}
        onSave={assignmentEditor.saveProcesos}
        onSavePuesto={assignmentEditor.savePuesto}
      />
    </div>
  );
}
