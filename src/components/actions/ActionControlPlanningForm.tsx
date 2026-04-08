'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActionControlPlanningFormData } from '@/types/actions';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ActionControlPlanningFormProps {
  actionId: string;
  onSuccess: () => void;
}

export function ActionControlPlanningForm({
  actionId,
  onSuccess,
}: ActionControlPlanningFormProps) {
  const [formData, setFormData] = useState<ActionControlPlanningFormData>({
    responsiblePersonId: '',
    responsiblePersonName: '',
    plannedDate: new Date(),
    effectivenessCriteria: '',
    comments: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/actions/${actionId}/control-planning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || 'Error al guardar la planificación del control'
        );
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="w-5 h-5 text-yellow-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Planificación del Control
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="responsiblePersonId">
              ID del Responsable <span className="text-red-500">*</span>
            </Label>
            <Input
              id="responsiblePersonId"
              value={formData.responsiblePersonId}
              onChange={e =>
                setFormData({
                  ...formData,
                  responsiblePersonId: e.target.value,
                })
              }
              placeholder="Ej: user-456"
              required
            />
          </div>

          <div>
            <Label htmlFor="responsiblePersonName">
              Nombre del Responsable <span className="text-red-500">*</span>
            </Label>
            <Input
              id="responsiblePersonName"
              value={formData.responsiblePersonName}
              onChange={e =>
                setFormData({
                  ...formData,
                  responsiblePersonName: e.target.value,
                })
              }
              placeholder="Ej: María García"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="plannedDate">
            Fecha Planificada de Control <span className="text-red-500">*</span>
          </Label>
          <Input
            id="plannedDate"
            type="date"
            value={
              formData.plannedDate
                ? new Date(formData.plannedDate).toISOString().split('T')[0]
                : ''
            }
            onChange={e =>
              setFormData({
                ...formData,
                plannedDate: new Date(e.target.value),
              })
            }
            required
          />
        </div>

        <div>
          <Label htmlFor="effectivenessCriteria">
            Criterio de Efectividad <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="effectivenessCriteria"
            value={formData.effectivenessCriteria}
            onChange={e =>
              setFormData({
                ...formData,
                effectivenessCriteria: e.target.value,
              })
            }
            rows={3}
            placeholder="¿Cómo se medirá si la acción fue efectiva?"
            required
          />
        </div>

        <div>
          <Label htmlFor="comments">Comentarios</Label>
          <Textarea
            id="comments"
            value={formData.comments || ''}
            onChange={e =>
              setFormData({ ...formData, comments: e.target.value })
            }
            rows={2}
            placeholder="Comentarios adicionales..."
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Planificación de Control'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
