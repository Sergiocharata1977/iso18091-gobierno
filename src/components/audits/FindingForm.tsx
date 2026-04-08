'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Finding } from '@/lib/sdk/modules/findings/types';
import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FindingFormProps {
  auditId: string;
  findingId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FindingForm({
  auditId,
  findingId,
  onSuccess,
  onCancel,
}: FindingFormProps) {
  const [loading, setLoading] = useState(false);
  const [finding, setFinding] = useState<Partial<Finding>>({
    status: 'registrado',
    progress: 0,
  });
  const [processes, setProcesses] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    fetchProcesses();
    if (findingId) {
      fetchFinding();
    }
  }, [findingId]);

  const fetchProcesses = async () => {
    try {
      const response = await fetch('/api/sdk/processes');
      const result = await response.json();
      if (result.success && result.data) {
        setProcesses(result.data);
      }
    } catch (error) {
      console.error('Error fetching processes:', error);
    }
  };

  const fetchFinding = async () => {
    try {
      const response = await fetch(`/api/sdk/findings/${findingId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setFinding(result.data);
      }
    } catch (error) {
      console.error('Error fetching finding:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...finding,
        auditId,
        registration: {
          name: finding.registration?.name || '',
          description: finding.registration?.description || '',
          processId: finding.registration?.processId || '',
          processName: finding.registration?.processName || '',
          severity: finding.registration?.severity || 'media',
          category: finding.registration?.category || 'no_conformidad',
          origin: finding.registration?.origin || 'audit',
          source: finding.registration?.source || 'audit',
          sourceId: finding.registration?.sourceId || null,
        },
      };

      const method = findingId ? 'PUT' : 'POST';
      const url = findingId
        ? `/api/sdk/findings/${findingId}`
        : `/api/sdk/audits/${auditId}/findings`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess?.();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving finding:', error);
      alert('Error al guardar el hallazgo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {findingId ? 'Editar Hallazgo' : 'Nuevo Hallazgo'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Información Básica
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Hallazgo *
          </label>
          <Input
            type="text"
            value={finding.registration?.name || ''}
            onChange={e =>
              setFinding({
                ...finding,
                registration: {
                  ...finding.registration,
                  name: e.target.value,
                  origin: finding.registration?.origin || 'audit',
                  source: finding.registration?.source || 'audit',
                  sourceId: finding.registration?.sourceId || null,
                  description: finding.registration?.description || '',
                  processId: finding.registration?.processId || null,
                  processName: finding.registration?.processName || '',
                  severity: finding.registration?.severity || 'media',
                  category: finding.registration?.category || 'no_conformidad',
                },
              })
            }
            placeholder="Ej: Falta de documentación en proceso X"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción *
          </label>
          <Textarea
            value={finding.registration?.description || ''}
            onChange={e =>
              setFinding({
                ...finding,
                registration: {
                  ...finding.registration,
                  description: e.target.value,
                  origin: finding.registration?.origin || 'audit',
                  source: finding.registration?.source || 'audit',
                  sourceId: finding.registration?.sourceId || null,
                  name: finding.registration?.name || '',
                  processId: finding.registration?.processId || null,
                  processName: finding.registration?.processName || '',
                  severity: finding.registration?.severity || 'media',
                  category: finding.registration?.category || 'no_conformidad',
                },
              })
            }
            placeholder="Describe el hallazgo en detalle"
            rows={4}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proceso *
            </label>
            <select
              value={finding.registration?.processId || ''}
              onChange={e => {
                const process = processes.find(p => p.id === e.target.value);
                setFinding({
                  ...finding,
                  registration: {
                    ...finding.registration,
                    processId: e.target.value,
                    processName: process?.name || '',
                    origin: finding.registration?.origin || 'audit',
                    source: finding.registration?.source || 'audit',
                    sourceId: finding.registration?.sourceId || null,
                    name: finding.registration?.name || '',
                    description: finding.registration?.description || '',
                    severity: finding.registration?.severity || 'media',
                    category:
                      finding.registration?.category || 'no_conformidad',
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar proceso</option>
              {processes.map(process => (
                <option key={process.id} value={process.id}>
                  {process.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severidad *
            </label>
            <select
              value={finding.registration?.severity || 'media'}
              onChange={e =>
                setFinding({
                  ...finding,
                  registration: {
                    ...finding.registration,
                    severity: e.target.value,
                    origin: finding.registration?.origin || 'audit',
                    source: finding.registration?.source || 'audit',
                    sourceId: finding.registration?.sourceId || null,
                    name: finding.registration?.name || '',
                    description: finding.registration?.description || '',
                    processId: finding.registration?.processId || null,
                    processName: finding.registration?.processName || '',
                    category:
                      finding.registration?.category || 'no_conformidad',
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría *
          </label>
          <select
            value={finding.registration?.category || 'no_conformidad'}
            onChange={e =>
              setFinding({
                ...finding,
                registration: {
                  ...finding.registration,
                  category: e.target.value,
                  origin: finding.registration?.origin || 'audit',
                  source: finding.registration?.source || 'audit',
                  sourceId: finding.registration?.sourceId || null,
                  name: finding.registration?.name || '',
                  description: finding.registration?.description || '',
                  processId: finding.registration?.processId || null,
                  processName: finding.registration?.processName || '',
                  severity: finding.registration?.severity || 'media',
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="no_conformidad">No Conformidad</option>
            <option value="observacion">Observación</option>
            <option value="mejora">Oportunidad de Mejora</option>
            <option value="fortaleza">Fortaleza</option>
          </select>
        </div>
      </div>

      {/* Status and Progress */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Estado y Progreso
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={finding.status || 'registrado'}
            onChange={e =>
              setFinding({
                ...finding,
                status: e.target.value as any,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="registrado">Registrado</option>
            <option value="accion_planificada">Acción Planificada</option>
            <option value="accion_ejecutada">Acción Ejecutada</option>
            <option value="analisis_completado">Análisis Completado</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Progreso: {finding.progress || 0}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={finding.progress || 0}
            onChange={e =>
              setFinding({
                ...finding,
                progress: parseInt(e.target.value),
              })
            }
            className="w-full"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {findingId ? 'Actualizar' : 'Crear'} Hallazgo
        </Button>
      </div>
    </form>
  );
}
