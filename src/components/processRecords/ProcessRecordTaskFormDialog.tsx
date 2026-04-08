'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useState } from 'react';

interface ProcessRecordTaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recordId: string;
  stageId: string;
  stageName: string;
}

export function ProcessRecordTaskFormDialog({
  open,
  onClose,
  onSuccess,
  recordId,
  stageId,
  stageName,
}: ProcessRecordTaskFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta' | 'urgente',
    fecha_vencimiento: '',
    etiquetas: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/process-records/${recordId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          stage_id: stageId,
          fecha_vencimiento: formData.fecha_vencimiento || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear tarea');
      }

      setFormData({
        titulo: '',
        descripcion: '',
        prioridad: 'media',
        fecha_vencimiento: '',
        etiquetas: [],
      });
      setTagInput('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error al crear la tarea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.etiquetas.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        etiquetas: [...formData.etiquetas, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      etiquetas: formData.etiquetas.filter(t => t !== tag),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Nueva Tarjeta en {stageName}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={e =>
                setFormData({ ...formData, titulo: e.target.value })
              }
              placeholder="Ej. Revisar documentación"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={e =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Describe la tarea..."
              rows={3}
              required
            />
          </div>

          {/* Prioridad */}
          <div>
            <Label htmlFor="prioridad">Prioridad *</Label>
            <select
              id="prioridad"
              value={formData.prioridad}
              onChange={e =>
                setFormData({ ...formData, prioridad: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            La asignacion de personas a tareas operativas se administra desde Mi
            Panel. Esta tarjeta solo registra descripcion, prioridad, fecha y
            etiquetas.
          </div>

          {/* Fecha de vencimiento */}
          <div>
            <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento</Label>
            <Input
              id="fecha_vencimiento"
              type="date"
              value={formData.fecha_vencimiento}
              onChange={e =>
                setFormData({ ...formData, fecha_vencimiento: e.target.value })
              }
            />
          </div>

          {/* Etiquetas */}
          <div>
            <Label htmlFor="etiquetas">Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                id="etiquetas"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Agregar etiqueta"
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Agregar
              </Button>
            </div>
            {formData.etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.etiquetas.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? 'Creando...' : 'Crear Tarjeta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
