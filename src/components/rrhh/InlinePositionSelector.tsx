'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Department, Position } from '@/types/rrhh';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface InlinePositionSelectorProps {
  personnelId: string;
  currentPuesto?: string;
  currentDepartamento?: string;
  currentPuestoId?: string;
  onSave: (
    puestoId: string,
    puestoName: string,
    departamentoId: string,
    departamentoName: string
  ) => Promise<void>;
  disabled?: boolean;
}

interface PositionWithDepartment extends Position {
  departamento_nombre?: string;
}

export function InlinePositionSelector({
  personnelId,
  currentPuesto,
  currentDepartamento,
  currentPuestoId,
  onSave,
  disabled = false,
}: InlinePositionSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [positions, setPositions] = useState<PositionWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState(
    currentPuestoId || ''
  );
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  // Cargar datos cuando entra en modo edición
  useEffect(() => {
    if (isEditing && user?.organization_id) {
      loadData();
    }
  }, [isEditing, user?.organization_id]);

  const loadData = async () => {
    try {
      if (!user?.organization_id) return;

      setLoading(true);
      setError(null);

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
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPositionId) {
      setError('Selecciona un puesto');
      return;
    }

    const position = positions.find(p => p.id === selectedPositionId);
    if (!position) {
      setError('Puesto no válido');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(
        position.id,
        position.nombre,
        position.departamento_id || '',
        position.departamento_nombre || ''
      );
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving:', err);
      setError('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedPositionId(currentPuestoId || '');
    setIsEditing(false);
    setError(null);
  };

  // Modo vista (no edición)
  if (!isEditing) {
    const hasPuesto = currentPuesto || currentPuestoId;

    return (
      <div className="space-y-1">
        {hasPuesto ? (
          <>
            <div
              className="flex items-center gap-2 text-lg text-gray-600 dark:text-gray-400 cursor-pointer hover:text-emerald-600 transition-colors group"
              onClick={() => !disabled && setIsEditing(true)}
            >
              <Briefcase className="w-4 h-4" />
              <span>{currentPuesto || 'Sin nombre'}</span>
              {!disabled && (
                <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            {currentDepartamento && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Building2 className="w-4 h-4" />
                <span>{currentDepartamento}</span>
              </div>
            )}
          </>
        ) : (
          <div
            className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
            onClick={() => !disabled && setIsEditing(true)}
          >
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800 font-medium">
              Sin puesto asignado
            </span>
            {!disabled && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto text-yellow-700 border-yellow-300"
              >
                Asignar puesto
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Modo edición
  return (
    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700">Cambiar Puesto</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loading || !selectedPositionId}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Check className="w-4 h-4 mr-1" />
            Guardar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-3 text-center text-gray-500">
          Cargando puestos...
        </div>
      ) : (
        <>
          <select
            value={selectedPositionId}
            onChange={e => setSelectedPositionId(e.target.value)}
            disabled={saving}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Seleccionar puesto...</option>
            {positions.map(position => (
              <option key={position.id} value={position.id}>
                {position.nombre} • {position.departamento_nombre}
              </option>
            ))}
          </select>

          {/* Mostrar departamento derivado */}
          {selectedPositionId && (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-md">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">
                <strong>Departamento:</strong>{' '}
                {positions.find(p => p.id === selectedPositionId)
                  ?.departamento_nombre || 'N/A'}
              </span>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
