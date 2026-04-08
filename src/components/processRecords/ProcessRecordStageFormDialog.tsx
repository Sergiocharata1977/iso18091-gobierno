'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ProcessRecordStage {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  orden: number;
  es_etapa_final: boolean;
}

interface ProcessRecordStageFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recordId: string;
  stage?: ProcessRecordStage | null; // Si viene, es modo edición
  nextOrden?: number; // Para nuevas etapas
}

export function ProcessRecordStageFormDialog({
  open,
  onClose,
  onSuccess,
  recordId,
  stage,
  nextOrden = 0,
}: ProcessRecordStageFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    color: '#e5e7eb',
    es_etapa_final: false,
  });

  const isEditMode = !!stage;

  useEffect(() => {
    if (stage) {
      setFormData({
        nombre: stage.nombre || '',
        descripcion: stage.descripcion || '',
        color: stage.color || '#e5e7eb',
        es_etapa_final: stage.es_etapa_final || false,
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        color: '#e5e7eb',
        es_etapa_final: false,
      });
    }
  }, [stage, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setLoading(true);
    try {
      const url = isEditMode
        ? `/api/process-records/${recordId}/stages/${stage.id}`
        : `/api/process-records/${recordId}/stages`;

      const method = isEditMode ? 'PATCH' : 'POST';

      const body = isEditMode ? formData : { ...formData, orden: nextOrden };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error saving stage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!stage) return;
    if (
      !confirm(
        '¿Estás seguro de eliminar esta etapa? Se eliminarán todas las tareas asociadas.'
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/process-records/${recordId}/stages/${stage.id}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting stage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Colores predefinidos
  const presetColors = [
    '#e5e7eb', // Gray
    '#dbeafe', // Blue light
    '#dcfce7', // Green light
    '#fef3c7', // Yellow light
    '#fce7f3', // Pink light
    '#e0e7ff', // Indigo light
    '#f3e8ff', // Purple light
    '#fed7aa', // Orange light
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Etapa' : 'Nueva Etapa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Etapa *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={e =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="Ej. Revisión, Aprobación, Completado"
              required
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={e =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Describe el propósito de esta etapa..."
              rows={2}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color de la Etapa</Label>
            <div className="flex items-center gap-2">
              {/* Color picker */}
              <Input
                type="color"
                value={formData.color}
                onChange={e =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-12 h-10 p-1 cursor-pointer"
              />
              {/* Preset colors */}
              <div className="flex gap-1 flex-wrap">
                {presetColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      formData.color === color
                        ? 'border-gray-900 scale-110'
                        : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            {/* Preview */}
            <div
              className="mt-2 p-3 rounded-lg border"
              style={{ backgroundColor: formData.color }}
            >
              <span className="text-sm font-medium text-gray-700">
                Vista previa: {formData.nombre || 'Nombre de etapa'}
              </span>
            </div>
          </div>

          {/* Es etapa final */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="es_etapa_final"
              checked={formData.es_etapa_final}
              onCheckedChange={checked =>
                setFormData({ ...formData, es_etapa_final: !!checked })
              }
            />
            <Label htmlFor="es_etapa_final" className="cursor-pointer">
              Es etapa final (cuando una tarea llega aquí, se considera
              completada)
            </Label>
          </div>

          {/* Botones */}
          <div className="flex justify-between pt-4">
            <div>
              {isEditMode && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Eliminar Etapa
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={loading || !formData.nombre.trim()}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditMode ? 'Guardar Cambios' : 'Crear Etapa'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
