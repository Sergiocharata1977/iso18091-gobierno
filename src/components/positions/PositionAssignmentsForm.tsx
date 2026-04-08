'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Save, AlertCircle } from 'lucide-react';
import { ProcessDefinition } from '@/types/procesos';

interface PositionAssignmentsFormProps {
  initialProcesses: string[];
  onSave: (processIds: string[], propagate: boolean) => Promise<void>;
  onCancel: () => void;
  personnelCount?: number;
}

export function PositionAssignmentsForm({
  initialProcesses,
  onSave,
  onCancel,
  personnelCount = 0,
}: PositionAssignmentsFormProps) {
  const [selectedProcesses, setSelectedProcesses] =
    useState<string[]>(initialProcesses);
  const [allProcesses, setAllProcesses] = useState<ProcessDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPropagateDialog, setShowPropagateDialog] = useState(false);

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/processes/definitions');
      if (res.ok) {
        const data = await res.json();
        setAllProcesses(data);
      }
    } catch (error) {
      console.error('Error loading processes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProcess = (processId: string) => {
    if (!selectedProcesses.includes(processId)) {
      setSelectedProcesses([...selectedProcesses, processId]);
    }
  };

  const removeProcess = (processId: string) => {
    setSelectedProcesses(selectedProcesses.filter(id => id !== processId));
  };

  const handleSave = async (propagate: boolean) => {
    try {
      setSaving(true);
      await onSave(selectedProcesses, propagate);
      setShowPropagateDialog(false);
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Error al guardar las asignaciones');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (personnelCount > 0) {
      setShowPropagateDialog(true);
    } else {
      handleSave(false);
    }
  };

  const availableProcesses = allProcesses.filter(
    p => !selectedProcesses.includes(p.id)
  );

  const selectedProcessesDetails = selectedProcesses
    .map(id => allProcesses.find(p => p.id === id))
    .filter(Boolean) as ProcessDefinition[];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg shadow-green-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Asignar Procesos al Puesto
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Selecciona los procesos que están relacionados con este puesto. Los
            cambios se pueden propagar automáticamente al personal asignado.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector de procesos */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Agregar Proceso
            </label>
            <select
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              onChange={e => {
                if (e.target.value) {
                  addProcess(e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={saving}
            >
              <option value="">Seleccionar proceso...</option>
              {availableProcesses.map(process => (
                <option key={process.id} value={process.id}>
                  {process.codigo} - {process.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de procesos seleccionados */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Procesos Asignados ({selectedProcesses.length})
            </label>
            {selectedProcesses.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No hay procesos asignados</p>
                <p className="text-sm text-gray-400 mt-1">
                  Selecciona procesos del menú desplegable arriba
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedProcessesDetails.map(process => (
                  <div
                    key={process.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-600 text-white">
                          {process.codigo}
                        </Badge>
                        <h4 className="font-medium text-gray-900">
                          {process.nombre}
                        </h4>
                      </div>
                      {process.objetivo && (
                        <p className="text-sm text-gray-600 mt-1">
                          {process.objetivo}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeProcess(process.id)}
                      disabled={saving}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Información sobre propagación */}
          {personnelCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Hay {personnelCount} persona(s) asignada(s) a este puesto
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Al guardar, podrás elegir si propagar estos cambios al
                  personal asignado.
                </p>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de propagación */}
      {showPropagateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>¿Propagar cambios al personal?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Hay <strong>{personnelCount} persona(s)</strong> asignada(s) a
                este puesto.
              </p>
              <p className="text-gray-700">
                ¿Deseas actualizar automáticamente los procesos asignados a
                estas personas?
              </p>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Esto reemplazará los procesos actuales
                  del personal con los procesos del puesto.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex-1"
                >
                  Solo Guardar
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {saving ? 'Guardando...' : 'Guardar y Propagar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
