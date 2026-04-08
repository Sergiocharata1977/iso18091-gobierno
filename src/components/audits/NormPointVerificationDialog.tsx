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
import { Textarea } from '@/components/ui/textarea';
import type { ConformityStatus } from '@/types/audits';
import { CONFORMITY_STATUS_LABELS } from '@/types/audits';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface NormPointVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: VerificationData) => Promise<void>;
  normPointCode: string;
  auditId: string;
}

interface VerificationData {
  conformityStatus: ConformityStatus;
  processes: string[];
  observations: string | null;
}

export function NormPointVerificationDialog({
  open,
  onClose,
  onSubmit,
  normPointCode,
}: NormPointVerificationDialogProps) {
  const [formData, setFormData] = useState<VerificationData>({
    conformityStatus: null,
    processes: [],
    observations: null,
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [processInput, setProcessInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddProcess = () => {
    if (processInput.trim()) {
      setFormData({
        ...formData,
        processes: [...formData.processes, processInput.trim()],
      });
      setProcessInput('');
    }
  };

  const handleRemoveProcess = (index: number) => {
    setFormData({
      ...formData,
      processes: formData.processes.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.conformityStatus) {
      setError('Debe seleccionar un estado de conformidad');
      return;
    }

    if (formData.processes.length === 0) {
      setError('Debe agregar al menos un proceso');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        conformityStatus: null,
        processes: [],
        observations: null,
      });
      setProcessInput('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al verificar el punto'
      );
    } finally {
      setLoading(false);
    }
  };

  const conformityOptions: Exclude<ConformityStatus, null>[] = [
    'CF',
    'NCM',
    'NCm',
    'NCT',
    'R',
    'OM',
    'F',
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="verification-form-description"
      >
        <DialogHeader>
          <DialogTitle>Verificar Punto de Norma</DialogTitle>
        </DialogHeader>
        <p id="verification-form-description" className="text-sm text-gray-600">
          Punto: <strong>{normPointCode}</strong>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Estado de Conformidad */}
          <div>
            <Label htmlFor="conformityStatus">
              Estado de Conformidad <span className="text-red-500">*</span>
            </Label>
            <select
              id="conformityStatus"
              value={selectedStatus}
              onChange={e => {
                const value = e.target.value;
                setSelectedStatus(value);
                setFormData({
                  ...formData,
                  conformityStatus: value ? (value as ConformityStatus) : null,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccione un estado...</option>
              {conformityOptions.map(status => (
                <option key={status} value={status}>
                  {
                    CONFORMITY_STATUS_LABELS[
                      status as Exclude<ConformityStatus, null>
                    ]
                  }
                </option>
              ))}
            </select>
          </div>

          {/* Procesos */}
          <div>
            <Label htmlFor="processes">
              Procesos Involucrados <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="processes"
                value={processInput}
                onChange={e => setProcessInput(e.target.value)}
                placeholder="Ej: Gestión de Calidad"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProcess();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddProcess}
                variant="outline"
              >
                Agregar
              </Button>
            </div>

            {formData.processes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.processes.map((process, index) => (
                  <div
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {process}
                    <button
                      type="button"
                      onClick={() => handleRemoveProcess(index)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              value={formData.observations || ''}
              onChange={e =>
                setFormData({ ...formData, observations: e.target.value })
              }
              rows={4}
              maxLength={1000}
              placeholder="Describa hallazgos, evidencias o comentarios relevantes..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.observations?.length || 0}/1000 caracteres
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
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
      </DialogContent>
    </Dialog>
  );
}
