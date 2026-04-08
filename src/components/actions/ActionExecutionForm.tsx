'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActionExecutionFormData } from '@/types/actions';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ActionExecutionFormProps {
  actionId: string;
  onSuccess: () => void;
}

export function ActionExecutionForm({
  actionId,
  onSuccess,
}: ActionExecutionFormProps) {
  const [formData, setFormData] = useState<ActionExecutionFormData>({
    executionDate: new Date(),
    comments: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/actions/${actionId}/execution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar la ejecución');
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
        <CheckCircle className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Ejecución de la Acción
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="executionDate">
            Fecha de Ejecución de la Planificación{' '}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="executionDate"
            type="date"
            value={
              formData.executionDate
                ? new Date(formData.executionDate).toISOString().split('T')[0]
                : ''
            }
            onChange={e =>
              setFormData({
                ...formData,
                executionDate: new Date(e.target.value),
              })
            }
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
            rows={4}
            placeholder="Describe cómo se ejecutó la acción..."
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
              'Guardar Ejecución'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
