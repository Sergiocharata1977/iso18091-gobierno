'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { SurveyFormData, SurveyType } from '@/types/surveys';
import { SURVEY_TYPE_LABELS } from '@/types/surveys';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const SURVEY_TYPE_DESCRIPTIONS: Record<SurveyType, string> = {
  anual: 'Encuesta general enviada anualmente a todos los clientes',
  post_entrega: 'Encuesta enviada despues de cada entrega puntual',
  post_compra: 'Encuesta automatica enviada despues de una compra',
  post_servicio: 'Encuesta automatica enviada despues de un servicio',
  ciudadana:
    'Encuesta publica para satisfaccion ciudadana, consultas abiertas y presupuesto participativo',
};

interface SurveyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SurveyFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: SurveyFormDialogProps) {
  const [formData, setFormData] = useState<SurveyFormData>({
    title: '',
    type: 'anual',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('El titulo es requerido');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al crear encuesta');
      }

      onSuccess();
      onOpenChange(false);
      setFormData({ title: '', type: 'anual' });
    } catch (error) {
      console.error('Error creating survey:', error);
      alert(
        error instanceof Error ? error.message : 'Error al crear la encuesta'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Encuesta</DialogTitle>
          <DialogDescription>
            Crea una encuesta para clientes o ciudadania segun el caso de uso
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titulo de la Encuesta</Label>
            <Input
              id="title"
              placeholder="Ej: Encuesta de Satisfaccion Q1 2026"
              value={formData.title}
              onChange={e =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Encuesta</Label>
            <Select
              value={formData.type}
              onValueChange={(value: SurveyType) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SURVEY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {SURVEY_TYPE_DESCRIPTIONS[formData.type]}
            </p>
            <p className="text-xs text-gray-500">
              {formData.type === 'ciudadana'
                ? 'Canal: publico. El enlace podra compartirse desde el hub de participacion.'
                : 'Canal: interno/cliente. Mantiene el flujo actual de satisfaccion y NPS.'}
            </p>
          </div>

          {(formData.type === 'post_entrega' ||
            formData.type === 'post_compra') && (
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Numero de Pedido (Opcional)</Label>
              <Input
                id="orderNumber"
                placeholder="Ej: PED-2026-001"
                value={formData.relatedOrderNumber || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    relatedOrderNumber: e.target.value,
                  })
                }
              />
            </div>
          )}

          {formData.type === 'post_servicio' && (
            <div className="space-y-2">
              <Label htmlFor="serviceId">ID de Servicio (Opcional)</Label>
              <Input
                id="serviceId"
                placeholder="Ej: SRV-2026-015"
                value={formData.relatedServiceId || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    relatedServiceId: e.target.value,
                  })
                }
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Encuesta'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
