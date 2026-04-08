'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FindingRootCauseAnalysisSchema } from '@/lib/validations/findings';
import type { FindingRootCauseAnalysisFormData } from '@/types/findings';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface FindingRootCauseAnalysisFormProps {
  findingId: string;
  onSuccess: () => void;
}

export function FindingRootCauseAnalysisForm({
  findingId,
  onSuccess,
}: FindingRootCauseAnalysisFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiresAction, setRequiresAction] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FindingRootCauseAnalysisFormData>({
    resolver: zodResolver(FindingRootCauseAnalysisSchema),
    defaultValues: {
      requiresAction: false,
    },
  });

  const onSubmit = async (data: FindingRootCauseAnalysisFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(
        `/api/findings/${findingId}/root-cause-analysis`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            requiresAction,
            userName: 'Usuario',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al guardar análisis');
      }

      alert('Análisis de causa raíz guardado');
      onSuccess();
    } catch (error) {
      console.error('Error saving analysis:', error);
      alert('Error al guardar el análisis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Fase 4: Análisis de Causa Raíz
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Análisis */}
          <div>
            <Label htmlFor="analysis">Análisis de Causa Raíz *</Label>
            <Textarea
              id="analysis"
              {...register('analysis')}
              placeholder="Describa el análisis de causa raíz realizado. Puede incluir metodologías como 5 Por Qués, Diagrama de Ishikawa, etc."
              rows={8}
              className="font-mono text-sm"
            />
            {errors.analysis && (
              <p className="text-sm text-red-600 mt-1">
                {errors.analysis.message}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Campo de texto grande para análisis detallado
            </p>
          </div>

          {/* Requiere Acción */}
          <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="requiresAction"
              checked={requiresAction}
              onCheckedChange={checked => setRequiresAction(checked as boolean)}
            />
            <Label
              htmlFor="requiresAction"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              ¿Requiere Acción Correctiva/Preventiva?
            </Label>
          </div>

          {requiresAction && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ Se deberá crear una Acción Correctiva o Preventiva asociada a
                este hallazgo.
              </p>
            </div>
          )}

          {/* Botón */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Análisis'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
