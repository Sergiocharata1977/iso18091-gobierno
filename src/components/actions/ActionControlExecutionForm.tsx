'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActionControlExecutionFormData } from '@/types/actions';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';

interface ActionControlExecutionFormProps {
  actionId: string;
  onSuccess: () => void;
}

export function ActionControlExecutionForm({
  actionId,
  onSuccess,
}: ActionControlExecutionFormProps) {
  const [formData, setFormData] = useState<ActionControlExecutionFormData>({
    executionDate: new Date(),
    isEffective: true,
    verificationResult: '',
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
        `/api/actions/${actionId}/control-execution`,
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
          data.error || 'Error al guardar la ejecución del control'
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
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Ejecución del Control
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
            Fecha de Verificación <span className="text-red-500">*</span>
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
          <Label>
            ¿La acción fue efectiva? <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-4 mt-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isEffective: true })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                formData.isEffective
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Sí, es efectiva</span>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, isEffective: false })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                !formData.isEffective
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
              }`}
            >
              <XCircle className="w-5 h-5" />
              <span className="font-medium">No, no es efectiva</span>
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="verificationResult">
            Resultado de la Verificación <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="verificationResult"
            value={formData.verificationResult}
            onChange={e =>
              setFormData({
                ...formData,
                verificationResult: e.target.value,
              })
            }
            rows={4}
            placeholder="Describe el resultado de la verificación..."
            required
          />
        </div>

        <div>
          <Label htmlFor="comments">Comentarios Adicionales</Label>
          <Textarea
            id="comments"
            value={formData.comments || ''}
            onChange={e =>
              setFormData({ ...formData, comments: e.target.value })
            }
            rows={3}
            placeholder="Comentarios adicionales sobre la verificación..."
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
              'Guardar Verificación'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
