'use client';

import { AIAssistButton } from '@/components/ui/AIAssistButton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ActionFormData } from '@/types/actions';
import {
  ACTION_PRIORITY_LABELS,
  ACTION_SOURCE_TYPE_LABELS,
  ACTION_TYPE_LABELS,
} from '@/types/actions';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ActionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ActionFormData) => Promise<void>;
  initialData?: Partial<ActionFormData>;
  findingId?: string;
  findingNumber?: string;
}

export function ActionFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  findingId,
  findingNumber,
}: ActionFormDialogProps) {
  const [formData, setFormData] = useState<ActionFormData>(() => {
    if (initialData) {
      return {
        title: initialData.title || '',
        description: initialData.description || '',
        actionType: initialData.actionType || 'correctiva',
        priority: initialData.priority || 'media',
        sourceType:
          initialData.sourceType || (findingId ? 'hallazgo' : 'manual'),
        sourceName: initialData.sourceName || findingNumber || '',
        processId: initialData.processId || '',
        processName: initialData.processName || '',
        implementationResponsibleId:
          initialData.implementationResponsibleId || '',
        implementationResponsibleName:
          initialData.implementationResponsibleName || '',
        plannedExecutionDate: initialData.plannedExecutionDate || new Date(),
        planningObservations: initialData.planningObservations || '',
      };
    }
    return {
      title: '',
      description: '',
      actionType: 'correctiva',
      priority: 'media',
      sourceType: findingId ? 'hallazgo' : 'manual',
      sourceName: findingNumber || '',
      processId: '',
      processName: '',
      implementationResponsibleId: '',
      implementationResponsibleName: '',
      plannedExecutionDate: new Date(),
      planningObservations: '',
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar la acción'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-describedby="action-form-description"
      >
        <DialogHeader>
          <DialogTitle>
            {initialData?.title ? 'Editar Acción' : 'Nueva Acción'} -
            Planificación
          </DialogTitle>
        </DialogHeader>
        <p id="action-form-description" className="sr-only">
          Formulario para crear una nueva acción correctiva, preventiva o de
          mejora
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <SectionHeader
              title="Información Básica"
              description="Detalles descriptivos de la acción"
            />

            <div>
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={e =>
                  setFormData({ ...formData, title: e.target.value })
                }
                maxLength={200}
                placeholder="Ej: Calibrar sensor de temperatura"
                required
                className="focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="description">
                  Descripción <span className="text-red-500">*</span>
                </Label>
                <AIAssistButton
                  context={{
                    modulo: 'mejoras',
                    tipo: 'causa_raiz',
                    datos: {
                      problema: formData.title,
                      descripcion: formData.description,
                      tipo: formData.actionType,
                    },
                  }}
                  onGenerate={texto =>
                    setFormData({ ...formData, description: texto })
                  }
                  label="Análisis Causa Raíz"
                  size="sm"
                />
              </div>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                maxLength={2000}
                placeholder="Describe detalladamente la acción a realizar..."
                required
                className="focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px]"
              />
            </div>
          </div>

          {/* Clasificación */}
          <div className="space-y-4">
            <SectionHeader
              title="Clasificación"
              description="Prioridad y categoría de la acción"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="actionType">
                  Tipo de Acción <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.actionType}
                  onValueChange={value =>
                    setFormData({
                      ...formData,
                      actionType: value as ActionFormData['actionType'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">
                  Prioridad <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={value =>
                    setFormData({
                      ...formData,
                      priority: value as ActionFormData['priority'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_PRIORITY_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Origen */}
          <div className="space-y-4">
            <SectionHeader
              title="Origen"
              description="Desde dónde se genera esta acción"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sourceType">
                  Tipo de Origen <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.sourceType}
                  onValueChange={value =>
                    setFormData({
                      ...formData,
                      sourceType: value as ActionFormData['sourceType'],
                    })
                  }
                  disabled={!!findingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_SOURCE_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sourceName">
                  Nombre del Origen <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sourceName"
                  value={formData.sourceName || ''}
                  onChange={e =>
                    setFormData({ ...formData, sourceName: e.target.value })
                  }
                  placeholder="Ej: Auditoría interna 2025"
                  required
                  disabled={!!findingNumber}
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Proceso */}
          <div className="space-y-4">
            <SectionHeader
              title="Proceso"
              description="Proceso del sistema relacionado"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="processId">
                  ID del Proceso <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="processId"
                  value={formData.processId || ''}
                  onChange={e =>
                    setFormData({ ...formData, processId: e.target.value })
                  }
                  placeholder="Ej: proc-001"
                  required
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <Label htmlFor="processName">
                  Nombre del Proceso <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="processName"
                  value={formData.processName || ''}
                  onChange={e =>
                    setFormData({ ...formData, processName: e.target.value })
                  }
                  placeholder="Ej: Gestión de Calidad"
                  required
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Planificación de la Acción */}
          <div className="space-y-4">
            <SectionHeader
              title="Planificación de la Acción"
              description="Asignación de responsable y fechas"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="implementationResponsibleId">
                  ID del Responsable <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="implementationResponsibleId"
                  value={formData.implementationResponsibleId || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      implementationResponsibleId: e.target.value,
                    })
                  }
                  placeholder="Ej: user-123"
                  required
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <Label htmlFor="implementationResponsibleName">
                  Nombre del Responsable <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="implementationResponsibleName"
                  value={formData.implementationResponsibleName || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      implementationResponsibleName: e.target.value,
                    })
                  }
                  placeholder="Ej: Juan Pérez"
                  required
                  className="focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="plannedExecutionDate">
                Fecha Planificada de Ejecución{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="plannedExecutionDate"
                type="date"
                value={
                  formData.plannedExecutionDate
                    ? new Date(formData.plannedExecutionDate)
                        .toISOString()
                        .split('T')[0]
                    : ''
                }
                onChange={e =>
                  setFormData({
                    ...formData,
                    plannedExecutionDate: new Date(e.target.value),
                  })
                }
                required
                className="focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <Label htmlFor="planningObservations">
                Observaciones de Planificación
              </Label>
              <Textarea
                id="planningObservations"
                value={formData.planningObservations || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    planningObservations: e.target.value,
                  })
                }
                rows={2}
                placeholder="Comentarios adicionales sobre la planificación..."
                className="focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Crear Acción'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
