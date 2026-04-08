'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Department, Position } from '@/types/rrhh';
import type { AssignmentHierarchyResult } from './useAssignmentHierarchy';

export type AssignmentEditorState = {
  puesto_id: string;
  departamento_id: string;
  procesos_asignados: string[];
  objetivos_asignados: string[];
  indicadores_asignados: string[];
};

type SaveState = 'idle' | 'success' | 'error';

interface UseAssignmentEditorParams {
  personnelId?: string;
  initialValue: AssignmentEditorState;
  positions: Position[];
  departments: Department[];
  hierarchy: AssignmentHierarchyResult;
  canEdit: boolean;
}

function sameStrings(left: string[], right: string[]) {
  return (
    left.length === right.length && left.every(value => right.includes(value))
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function useAssignmentEditor({
  personnelId,
  initialValue,
  positions,
  departments,
  hierarchy,
  canEdit,
}: UseAssignmentEditorParams) {
  const [assignmentEditor, setAssignmentEditor] =
    useState<AssignmentEditorState>(initialValue);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [departmentInheritedFromPosition, setDepartmentInheritedFromPosition] =
    useState(false);

  useEffect(() => {
    setAssignmentEditor(initialValue);
    setSaveLoading(false);
    setSaveMessage(null);
    setSaveState('idle');
    setDepartmentInheritedFromPosition(false);
  }, [initialValue]);

  const selectedPosition = useMemo(
    () =>
      positions.find(position => position.id === assignmentEditor.puesto_id),
    [assignmentEditor.puesto_id, positions]
  );
  const selectedDepartment = useMemo(
    () =>
      departments.find(
        department => department.id === assignmentEditor.departamento_id
      ),
    [assignmentEditor.departamento_id, departments]
  );
  const inferredDepartment = useMemo(
    () =>
      selectedDepartment ||
      departments.find(
        department => department.id === selectedPosition?.departamento_id
      ) ||
      null,
    [departments, selectedDepartment, selectedPosition]
  );

  const hasUnsavedChanges = useMemo(
    () =>
      !(
        initialValue.puesto_id === assignmentEditor.puesto_id &&
        initialValue.departamento_id === assignmentEditor.departamento_id &&
        sameStrings(
          initialValue.procesos_asignados,
          assignmentEditor.procesos_asignados
        ) &&
        sameStrings(
          initialValue.objetivos_asignados,
          assignmentEditor.objetivos_asignados
        ) &&
        sameStrings(
          initialValue.indicadores_asignados,
          assignmentEditor.indicadores_asignados
        )
      ),
    [assignmentEditor, initialValue]
  );

  const assignmentCounts = useMemo(
    () => ({
      procesos: assignmentEditor.procesos_asignados.length,
      objetivos: assignmentEditor.objetivos_asignados.length,
      indicadores: assignmentEditor.indicadores_asignados.length,
    }),
    [assignmentEditor]
  );

  const toggleProcess = (processId: string) => {
    setAssignmentEditor(prev => {
      const enabled = prev.procesos_asignados.includes(processId);
      const childObjectives =
        hierarchy.processObjectiveIds.get(processId) || [];
      const childIndicators =
        hierarchy.processIndicatorIds.get(processId) || [];

      if (enabled) {
        return {
          ...prev,
          procesos_asignados: prev.procesos_asignados.filter(
            id => id !== processId
          ),
          objetivos_asignados: prev.objetivos_asignados.filter(
            id => !childObjectives.includes(id)
          ),
          indicadores_asignados: prev.indicadores_asignados.filter(
            id => !childIndicators.includes(id)
          ),
        };
      }

      return {
        ...prev,
        procesos_asignados: unique([...prev.procesos_asignados, processId]),
        objetivos_asignados: unique([
          ...prev.objetivos_asignados,
          ...childObjectives,
        ]),
        indicadores_asignados: unique([
          ...prev.indicadores_asignados,
          ...childIndicators,
        ]),
      };
    });
  };

  const toggleObjective = (objectiveId: string) => {
    setAssignmentEditor(prev => {
      const enabled = prev.objetivos_asignados.includes(objectiveId);
      const childIndicators =
        hierarchy.objectiveIndicatorIds.get(objectiveId) || [];

      if (enabled) {
        return {
          ...prev,
          objetivos_asignados: prev.objetivos_asignados.filter(
            id => id !== objectiveId
          ),
          indicadores_asignados: prev.indicadores_asignados.filter(
            id => !childIndicators.includes(id)
          ),
        };
      }

      return {
        ...prev,
        objetivos_asignados: unique([...prev.objetivos_asignados, objectiveId]),
        indicadores_asignados: unique([
          ...prev.indicadores_asignados,
          ...childIndicators,
        ]),
      };
    });
  };

  const toggleIndicator = (indicatorId: string) => {
    setAssignmentEditor(prev => ({
      ...prev,
      indicadores_asignados: prev.indicadores_asignados.includes(indicatorId)
        ? prev.indicadores_asignados.filter(id => id !== indicatorId)
        : [...prev.indicadores_asignados, indicatorId],
    }));
  };

  const setPuestoId = (positionId: string) => {
    const nextPosition = positions.find(position => position.id === positionId);
    setAssignmentEditor(prev => ({
      ...prev,
      puesto_id: positionId,
      departamento_id: nextPosition?.departamento_id || '',
    }));
    setDepartmentInheritedFromPosition(!!nextPosition?.departamento_id);
  };

  const setDepartamentoId = (departmentId: string) => {
    setAssignmentEditor(prev => ({
      ...prev,
      departamento_id: departmentId,
    }));
    setDepartmentInheritedFromPosition(false);
  };

  const savePuesto = async () => {
    if (!personnelId || !canEdit) return false;
    try {
      setSaveLoading(true);
      setSaveMessage(null);
      setSaveState('idle');
      const patchRes = await fetch(`/api/rrhh/personnel/${personnelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puesto_id: assignmentEditor.puesto_id || undefined,
          puesto: selectedPosition?.nombre,
          departamento_id:
            assignmentEditor.departamento_id ||
            selectedPosition?.departamento_id ||
            undefined,
          departamento: inferredDepartment?.nombre,
        }),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(patchJson.error || 'No se pudo actualizar puesto');
      }
      setSaveState('success');
      setSaveMessage('Puesto y departamento actualizados.');
      return true;
    } catch (error) {
      setSaveState('error');
      setSaveMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible guardar el puesto.'
      );
      return false;
    } finally {
      setSaveLoading(false);
    }
  };

  const saveProcesos = async () => {
    if (!personnelId || !canEdit) return false;
    try {
      setSaveLoading(true);
      setSaveMessage(null);
      setSaveState('idle');
      const assignmentsRes = await fetch(
        `/api/personnel/${personnelId}/assignments`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            procesos_asignados: assignmentEditor.procesos_asignados,
            objetivos_asignados: assignmentEditor.objetivos_asignados,
            indicadores_asignados: assignmentEditor.indicadores_asignados,
          }),
        }
      );
      const assignmentsJson = await assignmentsRes.json();
      if (!assignmentsRes.ok) {
        throw new Error(
          assignmentsJson.error || 'No se pudieron actualizar asignaciones'
        );
      }
      setSaveState('success');
      setSaveMessage('Procesos, objetivos e indicadores actualizados.');
      return true;
    } catch (error) {
      setSaveState('error');
      setSaveMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible guardar los procesos.'
      );
      return false;
    } finally {
      setSaveLoading(false);
    }
  };

  const saveMiPanelAssignments = async () => {
    if (!personnelId || !canEdit) return false;
    const okPuesto = await savePuesto();
    if (!okPuesto) return false;
    return saveProcesos();
  };

  return {
    assignmentEditor,
    setAssignmentEditor,
    assignmentCounts,
    selectedPosition,
    selectedDepartment,
    inferredDepartment,
    departmentInheritedFromPosition,
    saveLoading,
    saveMessage,
    saveState,
    hasUnsavedChanges,
    toggleProcess,
    toggleObjective,
    toggleIndicator,
    setPuestoId,
    setDepartamentoId,
    savePuesto,
    saveProcesos,
    saveMiPanelAssignments,
  };
}
