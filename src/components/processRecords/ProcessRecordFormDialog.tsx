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
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Textarea } from '@/components/ui/textarea';
import { processRecordSchema } from '@/lib/validations/processRecords';
import { ProcessRecordFormData } from '@/types/processRecords';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface ProcessRecordFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  processDefinitions: Array<{
    id: string;
    nombre: string;
    etapas_default: string[];
    tipo_registros?: 'vincular' | 'crear' | 'ambos';
    modulo_vinculado?: 'mejoras' | 'auditorias' | 'nc' | null;
  }>;
  currentUser: {
    id: string;
    nombre: string;
  };
}

export function ProcessRecordFormDialog({
  open,
  onClose,
  onSuccess,
  processDefinitions,
  currentUser,
}: ProcessRecordFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ProcessRecordFormData>({
    resolver: zodResolver(processRecordSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      process_definition_id: '',
      status: 'activo',
      fecha_inicio: new Date(),
      responsable_id: currentUser.id,
      responsable_nombre: currentUser.nombre,
    },
  });

  const onSubmit = async (data: ProcessRecordFormData) => {
    setIsSubmitting(true);
    try {
      // Get selected definition's default stages
      const selectedDef = processDefinitions.find(
        def => def.id === data.process_definition_id
      );

      if (selectedDef?.tipo_registros === 'vincular') {
        alert(
          `Este proceso se gestiona con registros exclusivos en el módulo "${selectedDef.modulo_vinculado || 'vinculado'}". No corresponde crear ABM de registro de proceso.`
        );
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/process-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          etapas_default: selectedDef?.etapas_default || [
            'Pendiente',
            'En Progreso',
            'Completado',
          ],
          created_by: currentUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear registro');
      }

      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating process record:', error);
      alert('Error al crear el registro de proceso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDefinitionId = watch('process_definition_id');
  const selectedDefinition = processDefinitions.find(
    def => def.id === selectedDefinitionId
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Nuevo Registro de Proceso</DialogTitle>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <SectionHeader
              title="Información Básica"
              description="Datos principales del registro de proceso"
            />

            <div>
              <Label htmlFor="nombre">Nombre del Registro *</Label>
              <Input
                id="nombre"
                {...register('nombre')}
                placeholder="Ej. Implementación ISO 9001 Q1 2025"
                className={`bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 ${errors.nombre ? 'border-red-500' : ''}`}
              />
              {errors.nombre && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.nombre.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción *</Label>
              <Textarea
                id="descripcion"
                {...register('descripcion')}
                placeholder="Describe el objetivo y alcance de este registro..."
                rows={4}
                className={`bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 resize-none ${errors.descripcion ? 'border-red-500' : ''}`}
              />
              {errors.descripcion && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.descripcion.message}
                </p>
              )}
            </div>
          </div>

          {/* Configuración del Proceso */}
          <div className="space-y-4">
            <SectionHeader
              title="Configuración del Proceso"
              description="Tipo de proceso y fecha de inicio"
            />

            <div>
              <Label htmlFor="process_definition_id">Tipo de Proceso *</Label>
              <select
                id="process_definition_id"
                {...register('process_definition_id')}
                className={`w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.process_definition_id ? 'border-red-500' : ''
                }`}
              >
                <option value="">Selecciona un tipo de proceso</option>
                {processDefinitions.map(def => (
                  <option
                    key={def.id}
                    value={def.id}
                    disabled={def.tipo_registros === 'vincular'}
                  >
                    {def.nombre}
                    {def.tipo_registros === 'vincular'
                      ? ` (solo módulo ${def.modulo_vinculado || 'vinculado'})`
                      : ''}
                  </option>
                ))}
              </select>
              {selectedDefinition?.tipo_registros === 'ambos' && (
                <p className="text-xs text-amber-700 mt-1">
                  Este proceso admite doble gestión: módulo exclusivo y ABM de
                  registros de procesos.
                </p>
              )}
              {selectedDefinition?.tipo_registros === 'vincular' && (
                <p className="text-xs text-red-600 mt-1">
                  Este proceso no se registra aquí. Usá el módulo{' '}
                  <strong>{selectedDefinition.modulo_vinculado}</strong>.
                </p>
              )}
              {errors.process_definition_id && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.process_definition_id.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
              <Input
                id="fecha_inicio"
                type="date"
                {...register('fecha_inicio', {
                  setValueAs: value => (value ? new Date(value) : new Date()),
                })}
                className={`bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 ${errors.fecha_inicio ? 'border-red-500' : ''}`}
              />
              {errors.fecha_inicio && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.fecha_inicio.message}
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSubmitting ? 'Creando...' : 'Crear Registro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
