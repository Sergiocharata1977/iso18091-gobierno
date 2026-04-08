'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FindingImmediateActionExecutionSchema } from '@/lib/validations/findings';
import type { FindingImmediateActionExecutionFormData } from '@/types/findings';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface FindingImmediateActionExecutionFormProps {
  findingId: string;
  onSuccess: () => void;
}

export function FindingImmediateActionExecutionForm({
  findingId,
  onSuccess,
}: FindingImmediateActionExecutionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FindingImmediateActionExecutionFormData>({
    resolver: zodResolver(FindingImmediateActionExecutionSchema),
    defaultValues: {
      executionDate: new Date(),
    },
  });

  const onSubmit = async (data: FindingImmediateActionExecutionFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(
        `/api/findings/${findingId}/immediate-action-execution`,
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
        throw new Error('Error al guardar ejecución');
      }

      alert('Ejecución de acción inmediata guardada');
      onSuccess();
    } catch (error) {
      console.error('Error saving execution:', error);
      alert('Error al guardar la ejecución');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Fase 3: Ejecución de Acción Inmediata
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Fecha de Ejecución */}
          <div>
            <Label htmlFor="executionDate">Fecha de Ejecución *</Label>
            <Input
              id="executionDate"
              type="date"
              {...register('executionDate', {
                valueAsDate: true,
              })}
            />
            {errors.executionDate && (
              <p className="text-sm text-red-600 mt-1">
                {errors.executionDate.message}
              </p>
            )}
          </div>

          {/* Corrección */}
          <div>
            <Label htmlFor="correction">Corrección Realizada *</Label>
            <Textarea
              id="correction"
              {...register('correction')}
              placeholder="Describa la corrección realizada"
              rows={5}
            />
            {errors.correction && (
              <p className="text-sm text-red-600 mt-1">
                {errors.correction.message}
              </p>
            )}
          </div>

          {/* Botón */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Ejecución'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
