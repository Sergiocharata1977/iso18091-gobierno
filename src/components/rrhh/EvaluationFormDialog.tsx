'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { EvaluationType, Training } from '@/types/rrhh';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface EvaluationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EvaluationFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: EvaluationFormDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainings, setTrainings] = useState<Training[]>([]);

  const [formData, setFormData] = useState({
    titulo: '',
    fecha_evaluacion: '',
    tipo: 'evaluacion_competencias' as EvaluationType,
    capacitacionId: '',
  });

  const loadTrainings = useCallback(async () => {
    try {
      const orgId = user?.organization_id;
      if (!orgId) return;

      const response = await fetch(
        `/api/rrhh/trainings?organization_id=${orgId}&limit=50`
      );
      if (!response.ok) return;

      const data = await response.json();
      const trainingList = data.data || data;
      setTrainings(
        Array.isArray(trainingList)
          ? trainingList.filter((t: Training) => t.estado === 'completada')
          : []
      );
    } catch (error) {
      console.error('Error loading trainings:', error);
    }
  }, [user?.organization_id]);

  useEffect(() => {
    if (!open) return;
    setFormData(prev => ({
      ...prev,
      fecha_evaluacion: new Date().toISOString().split('T')[0],
    }));
    void loadTrainings();
  }, [loadTrainings, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'capacitacionId' && value) {
      const training = trainings.find(t => t.id === value);
      if (training) {
        setFormData(prev => ({
          ...prev,
          capacitacionId: value,
          titulo: `Evaluacion de eficacia: ${training.tema}`,
        }));
      }
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!user?.organization_id) {
        throw new Error('No se pudo obtener la organizacion del usuario');
      }

      const payload = {
        titulo: formData.titulo,
        fecha_evaluacion: new Date(formData.fecha_evaluacion),
        tipo: formData.tipo,
        capacitacionId:
          formData.tipo === 'evaluacion_capacitacion'
            ? formData.capacitacionId
            : undefined,
        evaluador_id: user.id,
        organization_id: user.organization_id,
        periodo: new Date().toISOString().slice(0, 7),
        estado: 'borrador',
        competencias_a_evaluar: [],
        empleados_evaluados: [],
      };

      const response = await fetch('/api/rrhh/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear evaluacion');
      }

      const newEvaluation = await response.json();

      toast({
        title: 'Evaluacion creada',
        description: `"${formData.titulo}" fue creada exitosamente`,
      });

      setFormData({
        titulo: '',
        fecha_evaluacion: '',
        tipo: 'evaluacion_competencias',
        capacitacionId: '',
      });

      onOpenChange(false);
      onSuccess?.();
      router.push(`/dashboard/rrhh/evaluations/${newEvaluation.id}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo crear la evaluacion';
      console.error('Error creating evaluation:', error);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva evaluacion</DialogTitle>
          <DialogDescription>
            La asignacion estructural de responsables vive en Mi Panel. Esta
            alta crea la evaluacion y luego permite configurar empleados,
            competencias y resultados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de evaluacion *</Label>
            <Select
              value={formData.tipo}
              onValueChange={value => handleChange('tipo', value)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evaluacion_competencias">
                  Evaluacion de competencias
                </SelectItem>
                <SelectItem value="evaluacion_capacitacion">
                  Evaluacion de eficacia post-capacitacion
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo === 'evaluacion_capacitacion' && (
            <div className="space-y-2">
              <Label htmlFor="capacitacionId">Capacitacion a evaluar *</Label>
              <Select
                value={formData.capacitacionId}
                onValueChange={value => handleChange('capacitacionId', value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Seleccionar capacitacion..." />
                </SelectTrigger>
                <SelectContent>
                  {trainings.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No hay capacitaciones completadas
                    </SelectItem>
                  ) : (
                    trainings.map(training => (
                      <SelectItem key={training.id} value={training.id}>
                        {training.tema}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="titulo">Titulo de la evaluacion *</Label>
            <Input
              id="titulo"
              placeholder="Ej: Evaluacion Q1 2026 - Area Tecnica"
              value={formData.titulo}
              onChange={e => handleChange('titulo', e.target.value)}
              required
              className="focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_evaluacion">Fecha de evaluacion *</Label>
            <Input
              id="fecha_evaluacion"
              type="date"
              value={formData.fecha_evaluacion}
              onChange={e => handleChange('fecha_evaluacion', e.target.value)}
              required
              className="focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            El responsable organizacional se administra desde Mi Panel. Esta
            evaluacion conserva solo el evaluador autenticado como dato de
            ejecucion.
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.titulo ||
                !formData.fecha_evaluacion ||
                (formData.tipo === 'evaluacion_capacitacion' &&
                  !formData.capacitacionId)
              }
              className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            >
              {isSubmitting ? 'Creando...' : 'Crear evaluacion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
