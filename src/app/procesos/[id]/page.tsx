'use client';

import {
  ModulePageShell,
  ModuleStatePanel,
  PageHeader,
} from '@/components/design-system';
import { ProcessDefinitionForm } from '@/components/procesos/ProcessDefinition';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ProcessDefinitionFormData } from '@/lib/validations/procesos';
import { ProcessService } from '@/services/procesos/ProcessService';
import { ProcessDefinition } from '@/types/procesos';
import type { ActionResult, TerminalActionLog } from '@/types/terminal-action-log';
import { getAuth } from 'firebase/auth';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Edit,
  FileText,
  Loader2,
  Monitor,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const processId = params.id as string;

  const [process, setProcess] = useState<ProcessDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    entradas: false,
    salidas: false,
    controles: false,
    indicadores: false,
    documentos: false,
  });

  const [actividadDigitalOpen, setActividadDigitalOpen] = useState(false);
  const [actividadLogs, setActividadLogs] = useState<TerminalActionLog[]>([]);
  const [actividadLoading, setActividadLoading] = useState(false);
  const [actividadLoaded, setActividadLoaded] = useState(false);

  useEffect(() => {
    const fetchProcess = async () => {
      try {
        const data = await ProcessService.getById(processId);
        setProcess(data);
      } catch (error) {
        console.error('Error al cargar proceso:', error);
      } finally {
        setLoading(false);
      }
    };

    if (processId) {
      fetchProcess();
    }
  }, [processId]);

  const handleFormSubmit = async (data: ProcessDefinitionFormData) => {
    setIsLoading(true);
    try {
      // Transform array fields from objects to strings
      const transformedData: Partial<
        Omit<ProcessDefinition, 'id' | 'createdAt'>
      > = {
        ...data,
        entradas: data.entradas.map(e => (typeof e === 'string' ? e : e.value)),
        salidas: data.salidas.map(s => (typeof s === 'string' ? s : s.value)),
        controles: data.controles.map(c =>
          typeof c === 'string' ? c : c.value
        ),
        indicadores: data.indicadores.map(i =>
          typeof i === 'string' ? i : i.value
        ),
        documentos: data.documentos.map(d =>
          typeof d === 'string' ? d : d.value
        ),
      };

      await ProcessService.update(processId, transformedData);
      const updatedProcess = await ProcessService.getById(processId);
      setProcess(updatedProcess);
      setEditing(false);
    } catch (error) {
      console.error('Error al actualizar proceso:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormCancel = () => {
    setEditing(false);
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleToggleActividadDigital = async () => {
    const nextOpen = !actividadDigitalOpen;
    setActividadDigitalOpen(nextOpen);

    if (nextOpen && !actividadLoaded) {
      setActividadLoading(true);
      try {
        const token = await getAuth().currentUser?.getIdToken();
        const res = await fetch(
          `/api/admin/procesos/${processId}/terminal-activity`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (res.ok) {
          const json = (await res.json()) as {
            success: boolean;
            data?: TerminalActionLog[];
          };
          setActividadLogs(json.data ?? []);
        } else {
          setActividadLogs([]);
        }
      } catch (err) {
        console.error('[ActividadDigital] Error al cargar logs:', err);
        setActividadLogs([]);
      } finally {
        setActividadLoading(false);
        setActividadLoaded(true);
      }
    }
  };

  const getResultBadgeClass = (result: ActionResult): string => {
    switch (result) {
      case 'success':
        return 'bg-emerald-100 text-emerald-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-orange-100 text-orange-800';
    }
  };

  const getResultLabel = (result: ActionResult): string => {
    switch (result) {
      case 'success':
        return 'Exitoso';
      case 'blocked':
        return 'Bloqueado';
      case 'pending_approval':
        return 'Pend. aprobación';
      case 'error':
        return 'Error';
    }
  };

  const formatTimestamp = (ts: TerminalActionLog['timestamp']): string => {
    try {
      const date = ts.toDate();
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(ts);
    }
  };

  const renderArrayField = (
    title: string,
    items: string[] | undefined,
    section: string
  ) => {
    const safeItems = items || [];

    return (
      <Collapsible
        open={openSections[section]}
        onOpenChange={() => toggleSection(section)}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto hover:bg-emerald-50/50 transition-colors duration-200"
          >
            <span className="font-medium text-gray-800">
              {title} ({safeItems.length})
            </span>
            {openSections[section] ? (
              <ChevronDown className="h-4 w-4 text-emerald-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-emerald-600" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-2">
            {safeItems.length > 0 ? (
              safeItems.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gradient-to-r from-emerald-50/30 to-white rounded-lg shadow-sm border border-emerald-100/30 hover:shadow-md transition-all duration-200"
                >
                  {item}
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic p-3 bg-gray-50/50 rounded-lg">
                No hay elementos definidos
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (loading) {
    return (
      <ModulePageShell maxWidthClassName="max-w-5xl">
        <ModuleStatePanel
          icon={<Loader2 className="h-10 w-10 animate-spin text-emerald-600" />}
          title="Cargando proceso"
          description="Estamos armando la definicion del proceso y su actividad digital."
        />
      </ModulePageShell>
    );
  }

  if (!process) {
    return (
      <ModulePageShell maxWidthClassName="max-w-5xl">
        <ModuleStatePanel
          icon={<FileText className="h-10 w-10 text-slate-300" />}
          title="Proceso no encontrado"
          description="El proceso que buscas no existe o fue eliminado."
          actions={
            <Button onClick={() => router.push('/procesos/definiciones')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al listado
            </Button>
          }
        />
      </ModulePageShell>
    );
  }

  if (editing) {
    return (
      <ModulePageShell maxWidthClassName="max-w-6xl">
        <div className="space-y-6">
          <div className="mx-auto max-w-6xl">
            <PageHeader
              eyebrow="Procesos"
              title={`Editar ${process.nombre}`}
              description="Actualiza la definicion del proceso, sus entradas, controles e indicadores."
              breadcrumbs={[
                { label: 'Procesos', href: '/procesos' },
                { label: 'Definiciones', href: '/procesos/definiciones' },
                { label: process.nombre, href: `/procesos/${processId}` },
                { label: 'Editar' },
              ]}
            />
            <div className="mb-6">
              <button
                onClick={() => setEditing(false)}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                ← Volver al detalle
              </button>
            </div>
            <ProcessDefinitionForm
              initialData={process}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isLoading={isLoading}
            />
          </div>
        </div>
      </ModulePageShell>
    );
  }

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Procesos"
          title={process.nombre}
          description={`Codigo ${process.codigo}. Vista integral del proceso, sus indicadores, documentos y controles.`}
          breadcrumbs={[
            { label: 'Procesos', href: '/procesos' },
            { label: 'Definiciones', href: '/procesos/definiciones' },
            { label: process.nombre },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  process.estado === 'activo'
                    ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                    : 'bg-gray-100 text-gray-800 shadow-sm'
                }
              >
                {process.estado === 'activo' ? 'Activo' : 'Inactivo'}
              </Badge>
              <Button
                variant="outline"
                onClick={() => router.push('/procesos/definiciones')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button
                onClick={() => setEditing(true)}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          }
        />
        {/* Header con navegación */}
        <div className="hidden items-center justify-between p-6 bg-gradient-to-r from-white to-emerald-50/20 rounded-xl shadow-lg border border-emerald-100/30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/procesos/definiciones')}
              className="hover:bg-emerald-50 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {process.nombre}
              </h1>
              <p className="text-emerald-700 font-medium">
                Código: {process.codigo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                process.estado === 'activo'
                  ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                  : 'bg-gray-100 text-gray-800 shadow-sm'
              }
            >
              {process.estado === 'activo' ? 'Activo' : 'Inactivo'}
            </Badge>
            <Button
              onClick={() => setEditing(true)}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </div>
        </div>

        {/* Contenido del proceso */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información principal */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-emerald-50/30">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent border-b border-emerald-100/50">
                <CardTitle className="text-emerald-800">
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="p-4 bg-white/60 rounded-lg shadow-sm border border-emerald-100/30">
                  <h3 className="font-medium text-gray-900 mb-2">Objetivo</h3>
                  <p className="mt-1 text-gray-600">{process.objetivo}</p>
                </div>
                <div className="p-4 bg-white/60 rounded-lg shadow-sm border border-emerald-100/30">
                  <h3 className="font-medium text-gray-900 mb-2">Alcance</h3>
                  <p className="mt-1 text-gray-600">{process.alcance}</p>
                </div>
                <div className="p-4 bg-white/60 rounded-lg shadow-sm border border-emerald-100/30">
                  <h3 className="font-medium text-gray-900 mb-2">
                    Responsable
                  </h3>
                  <p className="mt-1 text-gray-600">{process.responsable}</p>
                </div>
              </CardContent>
            </Card>

            {/* Secciones colapsables */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-emerald-50/20">
              <CardContent className="p-0">
                {renderArrayField('Entradas', process.entradas, 'entradas')}
                {renderArrayField('Salidas', process.salidas, 'salidas')}
                {renderArrayField('Controles', process.controles, 'controles')}
                {renderArrayField(
                  'Indicadores',
                  process.indicadores,
                  'indicadores'
                )}
                {renderArrayField(
                  'Documentos',
                  process.documentos,
                  'documentos'
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel lateral */}
          <div className="space-y-6">
            {/* Registro de Procesos */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-emerald-50/30">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent border-b border-emerald-100/50">
                <CardTitle className="text-emerald-800">
                  Registro de Procesos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {/* Documentos Relacionados */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Documentos Relacionados
                  </h4>
                  <div className="space-y-1">
                    {process.documentos && process.documentos.length > 0 ? (
                      process.documentos.slice(0, 3).map((doc, index) => (
                        <div
                          key={index}
                          className="p-2 bg-white/60 rounded border border-emerald-100/30 hover:bg-emerald-50/50 cursor-pointer transition-colors"
                        >
                          <span className="text-sm text-gray-600">{doc}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 bg-gray-50/50 rounded text-sm text-gray-500 italic">
                        No hay documentos definidos
                      </div>
                    )}
                    {process.documentos && process.documentos.length > 3 && (
                      <div className="text-xs text-emerald-600 cursor-pointer hover:text-emerald-700">
                        +{process.documentos.length - 3} más...
                      </div>
                    )}
                  </div>
                </div>

                {/* Puntos de la Norma */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Puntos de la Norma
                  </h4>
                  <div className="space-y-1">
                    <div className="p-2 bg-white/60 rounded border border-emerald-100/30 hover:bg-emerald-50/50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">
                        ISO 9001:2015 - Cláusula 4.4
                      </span>
                    </div>
                    <div className="p-2 bg-white/60 rounded border border-emerald-100/30 hover:bg-emerald-50/50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">
                        ISO 9001:2015 - Cláusula 8.1
                      </span>
                    </div>
                  </div>
                </div>

                {/* Objetivos de Calidad */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Objetivos de Calidad
                  </h4>
                  <div className="space-y-1">
                    <div className="p-2 bg-white/60 rounded border border-emerald-100/30 hover:bg-emerald-50/50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">
                        Mejorar satisfacción del cliente
                      </span>
                    </div>
                    <div className="p-2 bg-white/60 rounded border border-emerald-100/30 hover:bg-emerald-50/50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">
                        Reducir tiempo de entrega
                      </span>
                    </div>
                    <div className="text-xs text-emerald-600 cursor-pointer hover:text-emerald-700">
                      +2 más...
                    </div>
                  </div>
                </div>

                {/* Indicadores de Calidad */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Indicadores de Calidad
                  </h4>
                  <div className="space-y-1">
                    <div className="p-2 bg-white/60 rounded border border-emerald-100/30 hover:bg-emerald-50/50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">
                        Tiempo promedio de entrega
                      </span>
                    </div>
                    <div className="p-2 bg-white/60 rounded border border-emerald-100/30 hover:bg-emerald-50/50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">
                        Nivel de satisfacción
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mediciones */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Mediciones
                  </h4>
                  <div className="space-y-1">
                    <div className="p-2 bg-white/60 rounded border border-emerald-100/30 hover:bg-emerald-50/50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">
                        Medición Q1 2024
                      </span>
                    </div>
                    <div className="p-2 bg-white/60 rounded border border-emerald-100/30 hover:bg-emerald-50/50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">
                        Medición Q2 2024
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón para ver todos los registros */}
                <div className="pt-4 border-t border-emerald-100/30">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
                    onClick={() => router.push(`/procesos/registros`)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Ver Todos los Registros
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-emerald-50/20">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent border-b border-emerald-100/50">
                <CardTitle className="text-emerald-800">
                  Información del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="p-3 bg-white/60 rounded-lg shadow-sm border border-emerald-100/30">
                  <p className="text-sm text-gray-500 mb-1">Creado</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(process.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="p-3 bg-white/60 rounded-lg shadow-sm border border-emerald-100/30">
                  <p className="text-sm text-gray-500 mb-1">
                    Última actualización
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(process.updatedAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="p-3 bg-white/60 rounded-lg shadow-sm border border-emerald-100/30">
                  <p className="text-sm text-gray-500 mb-1">ID</p>
                  <p className="text-sm font-mono break-all text-gray-700">
                    {process.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actividad digital — acciones del agente Don Cándido para este proceso */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-emerald-50/20">
          <Collapsible
            open={actividadDigitalOpen}
            onOpenChange={handleToggleActividadDigital}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-6 h-auto hover:bg-emerald-50/50 transition-colors duration-200 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-gray-800 text-base">
                    Actividad digital
                  </span>
                  <span className="text-sm text-gray-500 font-normal">
                    — Acciones del agente Don Cándido
                  </span>
                </div>
                {actividadDigitalOpen ? (
                  <ChevronDown className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-6 pb-6 pt-0">
                {actividadLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
                    <span className="ml-3 text-sm text-gray-500">
                      Cargando actividad digital...
                    </span>
                  </div>
                ) : actividadLogs.length === 0 ? (
                  <p className="text-gray-500 italic py-4 text-sm">
                    Sin actividad digital registrada para este proceso.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-emerald-100">
                          <th className="text-left py-2 pr-4 text-gray-600 font-medium">
                            Empleado
                          </th>
                          <th className="text-left py-2 pr-4 text-gray-600 font-medium">
                            Terminal
                          </th>
                          <th className="text-left py-2 pr-4 text-gray-600 font-medium">
                            Herramienta
                          </th>
                          <th className="text-left py-2 pr-4 text-gray-600 font-medium">
                            Resultado
                          </th>
                          <th className="text-left py-2 text-gray-600 font-medium">
                            Fecha
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {actividadLogs.map(log => (
                          <tr
                            key={log.id}
                            className="border-b border-emerald-50 hover:bg-emerald-50/30 transition-colors"
                          >
                            <td className="py-2 pr-4 text-gray-700">
                              {log.personnel_id}
                            </td>
                            <td className="py-2 pr-4 text-gray-500 font-mono text-xs">
                              {log.terminal_id}
                            </td>
                            <td className="py-2 pr-4 text-gray-700">
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                {log.tool}
                              </code>
                            </td>
                            <td className="py-2 pr-4">
                              <Badge className={getResultBadgeClass(log.result)}>
                                {getResultLabel(log.result)}
                              </Badge>
                            </td>
                            <td className="py-2 text-gray-500 text-xs whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </ModulePageShell>
  );
}
