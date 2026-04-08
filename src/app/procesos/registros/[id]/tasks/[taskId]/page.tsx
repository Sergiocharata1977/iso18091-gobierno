'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FIELD_TYPES, type ChecklistFieldType } from '@/types/checklists';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Loader2,
  Save,
  User,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ChecklistField {
  id: string;
  orden: number;
  tipo: ChecklistFieldType;
  etiqueta: string;
  descripcion?: string;
  requerido: boolean;
  valor_esperado?: string;
  unidad?: string;
  opciones?: string[];
  valor_minimo?: number;
  valor_maximo?: number;
}

interface StageChecklist {
  id: string;
  stage_id: string;
  process_record_id: string;
  nombre: string;
  campos: ChecklistField[];
}

interface TaskChecklistExecution {
  id?: string;
  task_id: string;
  checklist_id: string;
  respuestas: Record<
    string,
    { valor: any; conforme: boolean | null; observacion?: string }
  >;
  estado: 'pendiente' | 'completado';
  completado_at?: Date;
  completado_por?: string;
}

interface Task {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  stage_id: string;
  stage_nombre?: string;
  asignado_a_nombre?: string;
  fecha_vencimiento?: string;
  created_at: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [checklist, setChecklist] = useState<StageChecklist | null>(null);
  const [execution, setExecution] = useState<TaskChecklistExecution | null>(
    null
  );
  const [answers, setAnswers] = useState<
    Record<
      string,
      { valor: any; conforme: boolean | null; observacion?: string }
    >
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [recordId, taskId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar tarea
      const taskRes = await fetch(
        `/api/process-records/${recordId}/tasks/${taskId}`
      );
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTask(taskData);

        // Cargar checklist de la etapa
        const checklistRes = await fetch(
          `/api/checklists/stage-checklists?stage_id=${taskData.stage_id}&process_record_id=${recordId}`
        );
        if (checklistRes.ok) {
          const checklistData = await checklistRes.json();
          if (checklistData) {
            setChecklist(checklistData);

            // Cargar ejecución existente
            const execRes = await fetch(
              `/api/checklists/task-executions?task_id=${taskId}&checklist_id=${checklistData.id}`
            );
            if (execRes.ok) {
              const execData = await execRes.json();
              if (execData) {
                setExecution(execData);
                setAnswers(execData.respuestas || {});
              } else {
                // Inicializar respuestas vacías
                const initialAnswers: Record<
                  string,
                  { valor: any; conforme: boolean | null }
                > = {};
                checklistData.campos.forEach((campo: ChecklistField) => {
                  initialAnswers[campo.id] = { valor: null, conforme: null };
                });
                setAnswers(initialAnswers);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], valor: value },
    }));
  };

  const handleConformityChange = (
    fieldId: string,
    conforme: boolean | null
  ) => {
    setAnswers(prev => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], conforme },
    }));
  };

  const handleObservationChange = (fieldId: string, observacion: string) => {
    setAnswers(prev => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], observacion },
    }));
  };

  const handleSave = async (complete: boolean = false) => {
    if (!checklist || !task) return;

    setSaving(true);
    try {
      const res = await fetch('/api/checklists/task-executions', {
        method: execution?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: execution?.id,
          task_id: taskId,
          checklist_id: checklist.id,
          respuestas: answers,
          estado: complete ? 'completado' : 'pendiente',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExecution(prev =>
          prev
            ? {
                ...prev,
                id: data.id,
                estado: complete ? 'completado' : 'pendiente',
              }
            : null
        );
        if (complete) {
          router.push(`/dashboard/procesos/registros/${recordId}`);
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
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

  const renderFieldInput = (campo: ChecklistField) => {
    const answer = answers[campo.id] || { valor: null, conforme: null };
    const fieldType = FIELD_TYPES[campo.tipo] || FIELD_TYPES.texto;

    return (
      <div key={campo.id} className="border rounded-lg p-4 space-y-3 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{fieldType.icon}</span>
              <Label className="font-medium">
                {campo.etiqueta}
                {campo.requerido && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
            </div>
            {campo.descripcion && (
              <p className="text-sm text-gray-500 mt-1">{campo.descripcion}</p>
            )}
          </div>
        </div>

        {/* Campo de entrada según el tipo */}
        <div className="space-y-2">
          {campo.tipo === 'si_no' && (
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant={answer.valor === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAnswerChange(campo.id, true)}
                className={
                  answer.valor === true ? 'bg-green-600 hover:bg-green-700' : ''
                }
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Sí
              </Button>
              <Button
                type="button"
                variant={answer.valor === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAnswerChange(campo.id, false)}
                className={
                  answer.valor === false ? 'bg-red-600 hover:bg-red-700' : ''
                }
              >
                <XCircle className="h-4 w-4 mr-1" />
                No
              </Button>
            </div>
          )}

          {campo.tipo === 'texto' && (
            <Textarea
              value={answer.valor || ''}
              onChange={e => handleAnswerChange(campo.id, e.target.value)}
              placeholder="Ingrese respuesta..."
              rows={2}
            />
          )}

          {campo.tipo === 'numero' && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={answer.valor || ''}
                onChange={e => handleAnswerChange(campo.id, e.target.value)}
                placeholder="Valor"
                min={campo.valor_minimo}
                max={campo.valor_maximo}
                className="w-32"
              />
              {campo.unidad && (
                <span className="text-gray-500">{campo.unidad}</span>
              )}
              {(campo.valor_minimo !== undefined ||
                campo.valor_maximo !== undefined) && (
                <span className="text-xs text-gray-400">
                  ({campo.valor_minimo ?? '–'} a {campo.valor_maximo ?? '–'})
                </span>
              )}
            </div>
          )}

          {campo.tipo === 'seleccion' && campo.opciones && (
            <Select
              value={answer.valor || ''}
              onValueChange={value => handleAnswerChange(campo.id, value)}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-lg z-[100]">
                {campo.opciones.map(opcion => (
                  <SelectItem key={opcion} value={opcion}>
                    {opcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {campo.tipo === 'fecha' && (
            <Input
              type="date"
              value={answer.valor || ''}
              onChange={e => handleAnswerChange(campo.id, e.target.value)}
            />
          )}
        </div>

        {/* Conformidad */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <span className="text-sm text-gray-500">¿Conforme?</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={answer.conforme === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleConformityChange(campo.id, true)}
              className={
                answer.conforme === true
                  ? 'bg-green-600 hover:bg-green-700'
                  : ''
              }
            >
              ✓
            </Button>
            <Button
              type="button"
              variant={answer.conforme === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleConformityChange(campo.id, false)}
              className={
                answer.conforme === false ? 'bg-red-600 hover:bg-red-700' : ''
              }
            >
              ✗
            </Button>
            <Button
              type="button"
              variant={answer.conforme === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleConformityChange(campo.id, null)}
            >
              N/A
            </Button>
          </div>
        </div>

        {/* Observación */}
        {answer.conforme === false && (
          <div className="pt-2">
            <Label className="text-sm text-gray-500">Observación:</Label>
            <Textarea
              value={answer.observacion || ''}
              onChange={e => handleObservationChange(campo.id, e.target.value)}
              placeholder="Describa la no conformidad..."
              rows={2}
              className="mt-1"
            />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Tarea no encontrada</p>
        <Link href={`/dashboard/procesos/registros/${recordId}`}>
          <Button className="mt-4">Volver al Kanban</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/procesos/registros/${recordId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{task.titulo}</h1>
          <p className="text-sm text-gray-500">Detalle de la actividad</p>
        </div>
        <Badge className={getPriorityColor(task.prioridad)}>
          {task.prioridad}
        </Badge>
      </div>

      {/* Task Info */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Información de la Actividad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.descripcion && (
            <div>
              <Label className="text-gray-500">Descripción</Label>
              <p className="text-gray-900">{task.descripcion}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {task.asignado_a_nombre && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{task.asignado_a_nombre}</span>
              </div>
            )}
            {task.fecha_vencimiento && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {new Date(task.fecha_vencimiento).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      {checklist && checklist.campos.length > 0 ? (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                {checklist.nombre}
              </CardTitle>
              {execution?.estado === 'completado' && (
                <Badge className="bg-green-100 text-green-800">
                  Completado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {checklist.campos.map(renderFieldInput)}

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Guardar Borrador
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle className="h-4 w-4 mr-2" />
                Completar Checklist
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              Esta etapa no tiene checklist configurado
            </p>
            <p className="text-sm text-gray-400">
              Configura un checklist desde el botón "Check" en la columna del
              Kanban
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
