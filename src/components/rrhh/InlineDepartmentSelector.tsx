'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { DepartmentService } from '@/services/rrhh/DepartmentService';
import { Department } from '@/types/rrhh';
import { AlertCircle, Building2, Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InlineDepartmentSelectorProps {
  positionId: string;
  currentDepartamento?: string;
  currentDepartamentoId?: string;
  onSave: (departamentoId: string, departamentoName: string) => Promise<void>;
  disabled?: boolean;
}

export function InlineDepartmentSelector({
  positionId,
  currentDepartamento,
  currentDepartamentoId,
  onSave,
  disabled = false,
}: InlineDepartmentSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState(
    currentDepartamentoId || ''
  );
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Cargar departamentos cuando entra en modo edición
  useEffect(() => {
    if (isEditing && user?.organization_id) {
      loadDepartments();
    }
  }, [isEditing, user?.organization_id]);

  const loadDepartments = async () => {
    if (!user?.organization_id) return;

    try {
      setLoading(true);
      setError(null);
      const depts = await DepartmentService.getAll(user.organization_id);
      setDepartments(depts);
    } catch (err) {
      console.error('Error loading departments:', err);
      setError('Error al cargar departamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDeptId) {
      setError('Selecciona un departamento');
      return;
    }

    const department = departments.find(d => d.id === selectedDeptId);
    if (!department) {
      setError('Departamento no válido');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(department.id, department.nombre);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving:', err);
      setError('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedDeptId(currentDepartamentoId || '');
    setIsEditing(false);
    setError(null);
  };

  // Modo vista (no edición)
  if (!isEditing) {
    const hasDepartamento = currentDepartamento || currentDepartamentoId;

    return (
      <div className="space-y-1">
        {hasDepartamento ? (
          <div
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-emerald-600 transition-colors group"
            onClick={() => !disabled && setIsEditing(true)}
          >
            <Building2 className="w-4 h-4" />
            <span>{currentDepartamento || 'Sin nombre'}</span>
            {!disabled && (
              <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        ) : (
          <div
            className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => !disabled && setIsEditing(true)}
          >
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              Sin departamento asignado
            </span>
            {!disabled && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto text-amber-700 border-amber-300"
              >
                Asignar
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
        <span className="font-medium text-gray-700">Asignar Departamento</span>
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
            disabled={saving || loading || !selectedDeptId}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Check className="w-4 h-4 mr-1" />
            Guardar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-3 text-center text-gray-500">
          Cargando departamentos...
        </div>
      ) : (
        <select
          value={selectedDeptId}
          onChange={e => setSelectedDeptId(e.target.value)}
          disabled={saving}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Seleccionar departamento...</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.nombre}
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
