'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Department, Position } from '@/types/rrhh';
import { AlertCircle, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PositionWithDepartment extends Position {
  departamento_nombre?: string;
}

interface PersonnelPositionSelectorProps {
  value?: string;
  onChange: (
    positionId: string,
    departamentoId: string,
    positionName: string,
    departamentoName: string,
    replaceAssignments: boolean
  ) => void;
  disabled?: boolean;
  isEditing?: boolean;
  currentPositionId?: string;
}

export function PersonnelPositionSelector({
  value,
  onChange,
  disabled = false,
  isEditing = false,
  currentPositionId,
}: PersonnelPositionSelectorProps) {
  const [positions, setPositions] = useState<PositionWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState(value || '');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPositionId, setPendingPositionId] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    if (user?.organization_id) {
      loadData();
    }
  }, [user?.organization_id]);

  useEffect(() => {
    setSelectedPosition(value || '');
  }, [value]);

  const loadData = async () => {
    try {
      if (!user?.organization_id) return;

      setLoading(true);

      const [positionsRes, deptsRes] = await Promise.all([
        fetch(`/api/positions?organization_id=${user.organization_id}`),
        fetch(
          `/api/rrhh/departments?organization_id=${user.organization_id}&limit=200`
        ),
      ]);

      const positionsJson = positionsRes.ok ? await positionsRes.json() : [];
      const deptsJson = deptsRes.ok ? await deptsRes.json() : { data: [] };
      const positionsRaw = Array.isArray(positionsJson) ? positionsJson : [];
      const depts = Array.isArray(deptsJson)
        ? deptsJson
        : Array.isArray(deptsJson?.data)
          ? deptsJson.data
          : [];

      setDepartments(depts);

      const enrichedPositions = positionsRaw.map((pos: Position) => ({
        ...pos,
        departamento_nombre:
          depts.find((d: Department) => d.id === pos.departamento_id)?.nombre ||
          'Sin departamento',
      }));

      setPositions(enrichedPositions);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionInfo = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position)
      return { departamentoId: '', positionName: '', departamentoName: '' };

    return {
      departamentoId: position.departamento_id || '',
      positionName: position.nombre,
      departamentoName: position.departamento_nombre || '',
    };
  };

  const handlePositionChange = (newPositionId: string) => {
    // Si estamos editando y ya había un puesto asignado, mostrar diálogo
    if (isEditing && currentPositionId && currentPositionId !== newPositionId) {
      setPendingPositionId(newPositionId);
      setShowConfirmDialog(true);
    } else {
      // Si es creación o no había puesto previo, copiar asignaciones automáticamente
      setSelectedPosition(newPositionId);
      const info = getPositionInfo(newPositionId);
      onChange(
        newPositionId,
        info.departamentoId,
        info.positionName,
        info.departamentoName,
        true
      );
    }
  };

  const handleConfirmReplace = (replace: boolean) => {
    setSelectedPosition(pendingPositionId);
    const info = getPositionInfo(pendingPositionId);
    onChange(
      pendingPositionId,
      info.departamentoId,
      info.positionName,
      info.departamentoName,
      replace
    );
    setShowConfirmDialog(false);
    setPendingPositionId('');
  };

  const handleCancelChange = () => {
    setShowConfirmDialog(false);
    setPendingPositionId('');
  };

  // Obtener el departamento del puesto seleccionado para mostrar
  const selectedPositionData = positions.find(p => p.id === selectedPosition);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Puesto</Label>
        <div className="w-full p-3 border rounded-lg bg-gray-50 animate-pulse">
          Cargando puestos...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <Label htmlFor="position">Puesto *</Label>
          <select
            id="position"
            value={selectedPosition}
            onChange={e => handlePositionChange(e.target.value)}
            disabled={disabled}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Seleccionar puesto...</option>
            {positions.map(position => (
              <option key={position.id} value={position.id}>
                {position.nombre} - {position.departamento_nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Mostrar departamento derivado */}
        {selectedPositionData && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Building2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-700">
              <strong>Departamento:</strong>{' '}
              {selectedPositionData.departamento_nombre}
            </span>
          </div>
        )}

        {!isEditing && selectedPosition && (
          <p className="text-sm text-gray-600">
            Las asignaciones de contexto del puesto se copiarán automáticamente
          </p>
        )}
      </div>

      {/* Diálogo de confirmación */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    ¿Cambiar puesto?
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Estás cambiando el puesto de este empleado. ¿Deseas
                    reemplazar las asignaciones actuales de contexto (procesos,
                    objetivos, indicadores) con las del nuevo puesto?
                  </p>
                  <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Mantener actuales:</strong> Conserva las
                      asignaciones personalizadas del empleado
                    </p>
                    <p className="text-sm text-yellow-800 mt-2">
                      <strong>Reemplazar:</strong> Adopta las asignaciones
                      estándar del nuevo puesto
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelChange}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleConfirmReplace(false)}
                  className="flex-1"
                >
                  Mantener Actuales
                </Button>
                <Button
                  onClick={() => handleConfirmReplace(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Reemplazar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
