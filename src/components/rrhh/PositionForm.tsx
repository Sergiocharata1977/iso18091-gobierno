'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Textarea } from '@/components/ui/textarea';
import { positionFormSchema } from '@/lib/validations/rrhh';
import { Position, PositionFormData } from '@/types/rrhh';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface PositionFormProps {
  initialData?: Position | null;
  onSubmit: (data: PositionFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PositionForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: PositionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PositionFormData>({
    resolver: zodResolver(positionFormSchema) as any,
    defaultValues: initialData || {},
  });

  const handleFormSubmit = async (data: PositionFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseCard
      title={initialData ? 'Editar Puesto' : 'Crear Puesto'}
      className="border-0 shadow-none"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Información Básica */}
        <div className="space-y-4">
          <SectionHeader
            title="Información Básica"
            description="Datos principales del puesto"
          />

          <div>
            <Label htmlFor="nombre">Nombre del Puesto *</Label>
            <Input
              id="nombre"
              {...register('nombre')}
              placeholder="Ej. Analista de Datos"
              className={`bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 ${errors.nombre ? 'border-red-500' : ''}`}
            />
            {errors.nombre && (
              <p className="text-red-500 text-sm mt-1">
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="descripcion_responsabilidades">
              Descripción de Responsabilidades
            </Label>
            <Textarea
              id="descripcion_responsabilidades"
              {...register('descripcion_responsabilidades')}
              placeholder="Describe las responsabilidades principales del puesto"
              className={`bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 resize-none ${errors.descripcion_responsabilidades ? 'border-red-500' : ''}`}
              rows={4}
            />
            {errors.descripcion_responsabilidades && (
              <p className="text-red-500 text-sm mt-1">
                {errors.descripcion_responsabilidades.message}
              </p>
            )}
          </div>
        </div>

        {/* Requisitos */}
        <div className="space-y-4">
          <SectionHeader
            title="Requisitos"
            description="Perfil requerido para el puesto"
          />

          <div>
            <Label htmlFor="requisitos_experiencia">
              Requisitos de Experiencia
            </Label>
            <Textarea
              id="requisitos_experiencia"
              {...register('requisitos_experiencia')}
              placeholder="Ej. 3 años de experiencia en análisis de datos"
              className={`bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 resize-none ${errors.requisitos_experiencia ? 'border-red-500' : ''}`}
              rows={3}
            />
            {errors.requisitos_experiencia && (
              <p className="text-red-500 text-sm mt-1">
                {errors.requisitos_experiencia.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="requisitos_formacion">
              Requisitos de Formación
            </Label>
            <Textarea
              id="requisitos_formacion"
              {...register('requisitos_formacion')}
              placeholder="Ej. Título universitario en Ingeniería, Administración o afín"
              className={`bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 resize-none ${errors.requisitos_formacion ? 'border-red-500' : ''}`}
              rows={3}
            />
            {errors.requisitos_formacion && (
              <p className="text-red-500 text-sm mt-1">
                {errors.requisitos_formacion.message}
              </p>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading || isSubmitting}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isLoading || isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </BaseCard>
  );
}
