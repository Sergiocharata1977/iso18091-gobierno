'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FindingImmediateActionPlanningSchema } from '@/lib/validations/findings';
import type { FindingImmediateActionPlanningFormData } from '@/types/findings';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface FindingImmediateActionPlanningFormProps {
  findingId: string;
  onSuccess: () => void;
}

export function FindingImmediateActionPlanningForm({
  findingId,
  onSuccess,
}: FindingImmediateActionPlanningFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FindingImmediateActionPlanningFormData>({
    resolver: zodResolver(FindingImmediateActionPlanningSchema),
    defaultValues: {
      plannedDate: new Date(),
    },
  });

  const onSubmit = async (data: FindingImmediateActionPlanningFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(
        `/api/findings/${findingId}/immediate-action-planning`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            userName: 'Usuario',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al guardar planificación');
      }

      alert('Planificación de acción inmediata guardada');
      onSuccess();
    } catch (error) {
      console.error('Error saving planning:', error);
      alert('Error al guardar la planificación');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Fase 2: Planificación de Acción Inmediata
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Responsable */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="responsiblePersonId">ID Responsable *</Label>
              <Input
                id="responsiblePersonId"
                {...register('responsiblePersonId')}
                placeholder="ID del responsable"
              />
              {errors.responsiblePersonId && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.responsiblePersonId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="responsiblePersonName">
                Nombre del Responsable *
              </Label>
              <Input
                id="responsiblePersonName"
                {...register('responsiblePersonName')}
                placeholder="Nombre completo"
              />
              {errors.responsiblePersonName && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.responsiblePersonName.message}
                </p>
              )}
            </div>
          </div>

          {/* Fecha Programada */}
          <div>
            <Label htmlFor="plannedDate">Fecha Programada *</Label>
            <Input
              id="plannedDate"
              type="date"
              {...register('plannedDate', {
                valueAsDate: true,
              })}
            />
            {errors.plannedDate && (
              <p className="text-sm text-red-600 mt-1">
                {errors.plannedDate.message}
              </p>
            )}
          </div>

          {/* Comentarios */}
          <div>
            <Label htmlFor="comments">Comentarios</Label>
            <Textarea
              id="comments"
              {...register('comments')}
              placeholder="Comentarios adicionales (opcional)"
              rows={3}
            />
          </div>

          {/* Botón */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Planificación'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
