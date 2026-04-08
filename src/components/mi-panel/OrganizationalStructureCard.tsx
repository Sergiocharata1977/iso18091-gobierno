'use client';

import { Button } from '@/components/ui/button';
import type { AssignmentEditorState } from '@/hooks/mi-panel/useAssignmentEditor';
import type { Department, Position } from '@/types/rrhh';
import { Building2, CheckCircle2, Loader2, User } from 'lucide-react';

interface OrganizationalStructureCardProps {
  canEdit: boolean;
  assignmentEditor: AssignmentEditorState;
  positions: Position[];
  departments: Department[];
  selectedPosition?: Position | null;
  inferredDepartment?: Department | null;
  inheritedDepartment?: boolean;
  onPuestoChange: (value: string) => void;
  onDepartamentoChange: (value: string) => void;
  currentPuesto?: string | null;
  currentDepartamento?: string | null;
  saveLoading?: boolean;
  saveMessage?: string | null;
  saveState?: 'idle' | 'success' | 'error';
  onSavePuesto: () => Promise<boolean> | boolean;
}

export function OrganizationalStructureCard({
  canEdit,
  assignmentEditor,
  positions,
  departments,
  selectedPosition,
  inferredDepartment,
  onPuestoChange,
  currentPuesto,
  currentDepartamento,
  saveLoading,
  saveMessage,
  saveState,
  onSavePuesto,
}: OrganizationalStructureCardProps) {
  if (!canEdit) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-slate-500">Puesto</p>
          <p className="font-medium">{currentPuesto || 'Sin puesto'}</p>
        </div>
        <div>
          <p className="text-slate-500">Departamento</p>
          <p className="font-medium">
            {currentDepartamento || 'Sin departamento'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Puestos disponibles
        </p>

        {positions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            No hay puestos configurados en la organización.
            <br />
            <a
              href="/rrhh/posiciones"
              className="mt-1 inline-block text-emerald-600 hover:underline"
            >
              Crear puestos en RRHH →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Opción sin puesto */}
            <button
              type="button"
              onClick={() => onPuestoChange('')}
              className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                !assignmentEditor.puesto_id
                  ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">Sin puesto</p>
                <p className="text-xs text-slate-400">
                  Sin departamento asignado
                </p>
              </div>
              {!assignmentEditor.puesto_id && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
            </button>

            {/* Lista de puestos */}
            {positions.map(position => {
              const deptForPosition = departments.find(
                d => d.id === position.departamento_id
              );
              const isSelected = assignmentEditor.puesto_id === position.id;

              return (
                <button
                  type="button"
                  key={position.id}
                  onClick={() => onPuestoChange(position.id)}
                  className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <User className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {position.nombre}
                    </p>
                    {deptForPosition && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {deptForPosition.nombre}
                      </p>
                    )}
                    {position.descripcion_responsabilidades && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {position.descripcion_responsabilidades}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Departamento inferido */}
      {inferredDepartment && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Departamento asignado automáticamente:{' '}
            <span className="font-semibold">{inferredDepartment.nombre}</span>
          </span>
        </div>
      )}

      {/* Botón guardar */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          type="button"
          onClick={onSavePuesto}
          disabled={
            saveLoading || (!assignmentEditor.puesto_id && !currentPuesto)
          }
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saveLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Puesto'
          )}
        </Button>
        {saveMessage && (
          <p
            className={`text-sm ${saveState === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
          >
            {saveMessage}
          </p>
        )}
      </div>
    </div>
  );
}
