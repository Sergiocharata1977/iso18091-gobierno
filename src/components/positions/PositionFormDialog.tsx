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
import { Textarea } from '@/components/ui/textarea';
import { Position } from '@/types/rrhh';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PositionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Position>) => Promise<void>;
  position?: Position | null;
  mode: 'create' | 'edit';
}

export function PositionFormDialog({
  open,
  onClose,
  onSave,
  position,
  mode,
}: PositionFormDialogProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion_responsabilidades: '',
    departamento_id: '',
    reporta_a_id: '',
    requisitos_experiencia: '',
    requisitos_formacion: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (position && mode === 'edit') {
      setFormData({
        nombre: position.nombre || '',
        descripcion_responsabilidades:
          position.descripcion_responsabilidades || '',
        departamento_id: position.departamento_id || '',
        reporta_a_id: position.reporta_a_id || '',
        requisitos_experiencia: position.requisitos_experiencia || '',
        requisitos_formacion: position.requisitos_formacion || '',
      });
    } else {
      setFormData({
        nombre: '',
        descripcion_responsabilidades: '',
        departamento_id: '',
        reporta_a_id: '',
        requisitos_experiencia: '',
        requisitos_formacion: '',
      });
    }
    setErrors({});
  }, [position, mode, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving position:', error);
      alert('Error al guardar el puesto');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {mode === 'create' ? 'Crear Nuevo Puesto' : 'Editar Puesto'}
            </DialogTitle>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-sm font-medium">
              Nombre del Puesto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={e => handleChange('nombre', e.target.value)}
              placeholder="Ej: Gerente de Calidad"
              className={errors.nombre ? 'border-red-500' : ''}
              disabled={saving}
            />
            {errors.nombre && (
              <p className="text-sm text-red-500">{errors.nombre}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="descripcion" className="text-sm font-medium">
                Descripción y Responsabilidades
              </Label>
              <AIAssistButton
                context={{
                  modulo: 'rrhh',
                  tipo: 'competencias',
                  campo: 'descripcion_responsabilidades',
                  datos: { nombre_puesto: formData.nombre },
                }}
                onGenerate={texto =>
                  handleChange('descripcion_responsabilidades', texto)
                }
                label="Sugerir con IA"
                disabled={!formData.nombre || saving}
              />
            </div>
            <Textarea
              id="descripcion"
              value={formData.descripcion_responsabilidades}
              onChange={e =>
                handleChange('descripcion_responsabilidades', e.target.value)
              }
              placeholder="Describe las principales responsabilidades del puesto..."
              rows={4}
              disabled={saving}
            />
          </div>

          {/* Departamento */}
          <div className="space-y-2">
            <Label htmlFor="departamento" className="text-sm font-medium">
              Departamento
            </Label>
            <Input
              id="departamento"
              value={formData.departamento_id}
              onChange={e => handleChange('departamento_id', e.target.value)}
              placeholder="Ej: Calidad"
              disabled={saving}
            />
          </div>

          {/* Reporta a */}
          <div className="space-y-2">
            <Label htmlFor="reporta_a" className="text-sm font-medium">
              Reporta a
            </Label>
            <Input
              id="reporta_a"
              value={formData.reporta_a_id}
              onChange={e => handleChange('reporta_a_id', e.target.value)}
              placeholder="Ej: Director General"
              disabled={saving}
            />
          </div>

          {/* Requisitos de Experiencia */}
          <div className="space-y-2">
            <Label htmlFor="experiencia" className="text-sm font-medium">
              Requisitos de Experiencia
            </Label>
            <Textarea
              id="experiencia"
              value={formData.requisitos_experiencia}
              onChange={e =>
                handleChange('requisitos_experiencia', e.target.value)
              }
              placeholder="Ej: Mínimo 5 años en gestión de calidad..."
              rows={3}
              disabled={saving}
            />
          </div>

          {/* Requisitos de Formación */}
          <div className="space-y-2">
            <Label htmlFor="formacion" className="text-sm font-medium">
              Requisitos de Formación
            </Label>
            <Textarea
              id="formacion"
              value={formData.requisitos_formacion}
              onChange={e =>
                handleChange('requisitos_formacion', e.target.value)
              }
              placeholder="Ej: Título universitario en Ingeniería Industrial..."
              rows={3}
              disabled={saving}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving
                ? 'Guardando...'
                : mode === 'create'
                  ? 'Crear Puesto'
                  : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
