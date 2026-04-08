'use client';

import {
  ModulePageShell,
  ModuleStatePanel,
  PageHeader,
} from '@/components/design-system';
import { ProcessRecordStageFormDialog } from '@/components/processRecords/ProcessRecordStageFormDialog';
import { ProcessRecordTaskFormDialog } from '@/components/processRecords/ProcessRecordTaskFormDialog';
import { StageChecklistDialog } from '@/components/processRecords/StageChecklistDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  ArrowLeft,
  ClipboardCheck,
  Edit,
  Loader2,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

// Tipos
interface ProcessRecordStage {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  orden: number;
  es_etapa_final: boolean;
}

interface ProcessRecordTask {
  id: string;
  stage_id: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  asignado_a_nombre?: string;
  fecha_vencimiento?: string;
  etiquetas: string[];
  orden: number;
}

interface ProcessRecord {
  id: string;
  nombre: string;
  descripcion: string;
  process_definition_nombre?: string;
  status: 'activo' | 'pausado' | 'completado';
  created_at: string;
}

export default function ProcessRecordKanbanPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;

  const [processRecord, setProcessRecord] = useState<ProcessRecord | null>(
    null
  );
  const [stages, setStages] = useState<ProcessRecordStage[]>([]);
  const [tasksByStage, setTasksByStage] = useState<
    Map<string, ProcessRecordTask[]>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [checklistStage, setChecklistStage] = useState<{
    id: string;
    nombre: string;
  } | null>(null);

  // Ref para evitar creación duplicada de etapas
  const _creatingStagesRef = React.useRef(false);
  const [editingStage, setEditingStage] = useState<ProcessRecordStage | null>(
    null
  );

  // Drag & Drop state
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const loadTasks = useCallback(
    async (stagesList: ProcessRecordStage[]) => {
      const tasksMap = new Map<string, ProcessRecordTask[]>();

      for (const stage of stagesList) {
        try {
          const res = await fetch(
            `/api/process-records/${recordId}/tasks?stage_id=${stage.id}`
          );
          if (res.ok) {
            const tasks = await res.json();
            tasksMap.set(stage.id, tasks);
          }
        } catch (error) {
          console.error(`Error loading tasks for stage ${stage.id}:`, error);
        }
      }

      setTasksByStage(tasksMap);
    },
    [recordId]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Cargar registro
      const recordRes = await fetch(`/api/process-records/${recordId}`);
      if (recordRes.ok) {
        const recordData = await recordRes.json();
        setProcessRecord(recordData);
      }

      // Cargar etapas
      const stagesRes = await fetch(`/api/process-records/${recordId}/stages`);
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setStages(stagesData);
        // Cargar tareas para cada etapa si hay etapas
        if (stagesData.length > 0) {
          await loadTasks(stagesData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadTasks, recordId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // handleEditStage ya no se usa - ProcessRecordStageFormDialog lo maneja internamente

  // handleCreateStage ya no se usa - ahora ProcessRecordStageFormDialog lo maneja internamente

  const handleDeleteStage = async (stageId: string) => {
    if (
      !confirm(
        '¿Estás seguro de eliminar esta etapa? Se eliminarán todas las tareas asociadas.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/process-records/${recordId}/stages/${stageId}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting stage:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return 'bg-red-100 text-red-800';
      case 'alta':
        return 'bg-orange-100 text-orange-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baja':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (taskId: string) => {
    setDraggingTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggingTask) return;

    // Find the task and its current stage
    let sourceStageId: string | null = null;
    for (const [stageId, tasks] of tasksByStage.entries()) {
      if (tasks.some(t => t.id === draggingTask)) {
        sourceStageId = stageId;
        break;
      }
    }

    // Don't do anything if dropping on same stage
    if (sourceStageId === targetStageId) {
      setDraggingTask(null);
      return;
    }

    // Move task to new stage via API
    try {
      const res = await fetch(
        `/api/process-records/${recordId}/tasks/${draggingTask}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage_id: targetStageId }),
        }
      );

      if (res.ok) {
        await loadData();
      } else {
        console.error('Error moving task');
      }
    } catch (error) {
      console.error('Error moving task:', error);
    } finally {
      setDraggingTask(null);
    }
  };

  if (loading) {
    return (
      <ModulePageShell maxWidthClassName="max-w-6xl">
        <ModuleStatePanel
          icon={<Loader2 className="h-10 w-10 animate-spin text-emerald-600" />}
          title="Cargando registro"
          description="Estamos armando el tablero operativo del registro de proceso."
        />
      </ModulePageShell>
    );
  }

  if (!processRecord) {
    return (
      <ModulePageShell maxWidthClassName="max-w-5xl">
        <ModuleStatePanel
          icon={<AlertCircle className="h-10 w-10 text-slate-300" />}
          title="Registro no encontrado"
          description="El registro solicitado no existe o fue eliminado."
          actions={
            <Link href="/procesos/registros">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al listado
              </Button>
            </Link>
          }
        />
      </ModulePageShell>
    );
  }

  return (
    <ModulePageShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Procesos"
          title={processRecord.nombre}
          description={
            processRecord.descripcion ||
            'Tablero operativo del registro y sus etapas activas.'
          }
          breadcrumbs={[
            { label: 'Procesos', href: '/procesos' },
            { label: 'Registros', href: '/procesos/registros' },
            { label: processRecord.nombre },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {processRecord.process_definition_nombre && (
                <Badge className="bg-blue-100 text-blue-800">
                  {processRecord.process_definition_nombre}
                </Badge>
              )}
              <Badge className="bg-green-100 text-green-800">
                {processRecord.status}
              </Badge>
              <Link href="/procesos/registros">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <Button
                onClick={() => setShowStageDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Etapa
              </Button>
            </div>
          }
        />

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stages.map(stage => {
            const tasks = tasksByStage.get(stage.id) || [];
            return (
              <Card key={stage.id} className="border-0 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {stage.nombre}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {tasks.length}
                      </p>
                    </div>
                    <div
                      className="w-3 h-12 rounded-lg"
                      style={{ backgroundColor: stage.color }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tablero Kanban */}
        <div className="flex gap-6 overflow-x-auto pb-4">
          {stages.map(stage => {
            const tasks = tasksByStage.get(stage.id) || [];
            return (
              <div key={stage.id} className="shrink-0 w-80">
                <Card
                  className={`border-0 shadow-md transition-all ${
                    dragOverStage === stage.id
                      ? 'ring-2 ring-emerald-500 ring-offset-2 bg-emerald-50'
                      : ''
                  }`}
                  onDragOver={e => handleDragOver(e, stage.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, stage.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {stage.nombre}
                      </CardTitle>
                      <Badge className="bg-gray-100 text-gray-600">
                        {tasks.length}
                      </Badge>
                    </div>
                    {/* Botones de acciones */}
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setChecklistStage({
                            id: stage.id,
                            nombre: stage.nombre,
                          });
                          setShowChecklistDialog(true);
                        }}
                        className="h-8 text-xs bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                        title="Configurar Checklist"
                      >
                        <ClipboardCheck className="h-4 w-4 text-emerald-600 mr-1" />
                        Check
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingStage(stage);
                          setShowStageDialog(true);
                        }}
                        className="h-8 text-xs"
                        title="Editar etapa"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteStage(stage.id)}
                        className="h-8 text-xs"
                        title="Eliminar etapa"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 min-h-96">
                    {tasks.map(task => (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onClick={() =>
                          router.push(
                            `/dashboard/procesos/registros/${recordId}/tasks/${task.id}`
                          )
                        }
                        className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                          draggingTask === task.id
                            ? 'opacity-50 scale-95 cursor-grabbing'
                            : 'hover:border-emerald-300 hover:border'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-gray-900">
                                {task.titulo}
                              </h4>
                              <Badge
                                className={getPriorityColor(task.prioridad)}
                              >
                                {task.prioridad}
                              </Badge>
                            </div>
                            {task.descripcion && (
                              <p className="text-sm text-gray-600">
                                {task.descripcion}
                              </p>
                            )}
                            {task.asignado_a_nombre && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <User className="h-3 w-3" />
                                {task.asignado_a_nombre}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      variant="outline"
                      className="w-full border-dashed border-2"
                      onClick={() => {
                        setSelectedStage({
                          id: stage.id,
                          nombre: stage.nombre,
                        });
                        setShowTaskDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar tarjeta
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog para crear/editar etapa */}
      <ProcessRecordStageFormDialog
        open={showStageDialog}
        onClose={() => {
          setShowStageDialog(false);
          setEditingStage(null);
        }}
        onSuccess={loadData}
        recordId={recordId}
        stage={editingStage}
        nextOrden={stages.length}
      />

      {/* Dialog para crear tarea */}
      {selectedStage && (
        <ProcessRecordTaskFormDialog
          open={showTaskDialog}
          onClose={() => {
            setShowTaskDialog(false);
            setSelectedStage(null);
          }}
          onSuccess={loadData}
          recordId={recordId}
          stageId={selectedStage.id}
          stageName={selectedStage.nombre}
        />
      )}

      {/* Dialog para checklist de etapa */}
      {checklistStage && (
        <StageChecklistDialog
          open={showChecklistDialog}
          onClose={() => {
            setShowChecklistDialog(false);
            setChecklistStage(null);
          }}
          stageId={checklistStage.id}
          stageName={checklistStage.nombre}
          processRecordId={recordId}
        />
      )}
    </ModulePageShell>
  );
}
