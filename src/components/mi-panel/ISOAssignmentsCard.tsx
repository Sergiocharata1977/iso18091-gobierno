'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { AssignmentEditorState } from '@/hooks/mi-panel/useAssignmentEditor';
import type { AssignmentHierarchyResult } from '@/hooks/mi-panel/useAssignmentHierarchy';
import type { QualityIndicator } from '@/types/quality';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { BarChart2, Loader2, Target } from 'lucide-react';

interface ISOAssignmentsCardProps {
  assignmentEditor: AssignmentEditorState;
  assignmentCounts: {
    procesos: number;
    objetivos: number;
    indicadores: number;
  };
  hierarchy: AssignmentHierarchyResult;
  catalogLoading?: boolean;
  hasUnsavedChanges: boolean;
  saveLoading: boolean;
  saveMessage?: string | null;
  saveState: 'idle' | 'success' | 'error';
  onToggleProcess: (processId: string) => void;
  onToggleObjective: (objectiveId: string) => void;
  onToggleIndicator: (indicatorId: string) => void;
  onSave: () => void;
}

function handleCheckedChange(
  checked: CheckedState,
  disabled: boolean,
  onToggle: () => void
) {
  if (disabled || checked === 'indeterminate') return;
  onToggle();
}

function formatIndicator(indicator: QualityIndicator) {
  return {
    title:
      `${indicator.code || indicator.id} ${indicator.name || 'Indicador'}`.trim(),
    subtitle: indicator.process_definition_id
      ? 'Vinculado a proceso'
      : 'Asignación directa',
  };
}

function TreeRow({
  id,
  title,
  subtitle,
  checked,
  disabled,
  onToggle,
  weight = 'normal',
  indent = 0,
}: {
  id: string;
  title: string;
  subtitle: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  weight?: 'normal' | 'semibold';
  indent?: 0 | 1 | 2;
}) {
  const indentClass =
    indent === 1
      ? 'ml-6 pl-4 border-l border-slate-200'
      : indent === 2
        ? 'ml-12 pl-4 border-l border-dashed border-slate-200'
        : '';
  return (
    <div
      className={`flex items-start gap-3 rounded-md py-1.5 text-sm ${disabled ? 'opacity-50' : ''} ${indentClass}`}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={value =>
          handleCheckedChange(value, disabled, onToggle)
        }
        className="mt-0.5"
      />
      <label
        htmlFor={id}
        className={
          disabled ? 'cursor-not-allowed' : 'cursor-pointer select-none'
        }
      >
        <span
          className={
            weight === 'semibold'
              ? 'font-semibold text-slate-800'
              : 'font-medium text-slate-700'
          }
        >
          {title}
        </span>
        <span className="block text-xs text-slate-400">{subtitle}</span>
      </label>
    </div>
  );
}

export function ISOAssignmentsCard({
  assignmentEditor,
  assignmentCounts,
  hierarchy,
  catalogLoading,
  hasUnsavedChanges,
  saveLoading,
  saveMessage,
  saveState,
  onToggleProcess,
  onToggleObjective,
  onToggleIndicator,
  onSave,
}: ISOAssignmentsCardProps) {
  return (
    <div className="space-y-4">
      {/* Contadores */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
          <BarChart2 className="h-3.5 w-3.5 text-emerald-600" />
          {assignmentCounts.procesos} proceso
          {assignmentCounts.procesos !== 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
          <Target className="h-3.5 w-3.5 text-blue-500" />
          {assignmentCounts.objetivos} objetivo
          {assignmentCounts.objetivos !== 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
          {assignmentCounts.indicadores} indicador
          {assignmentCounts.indicadores !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Árbol de procesos */}
      <div className="rounded-lg border border-slate-200 p-4">
        {catalogLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando procesos...
          </div>
        ) : hierarchy.processNodes.length === 0 ? (
          <div className="py-4 text-center text-sm text-slate-500">
            <p>No hay procesos disponibles.</p>
            <a
              href="/procesos"
              className="mt-1 inline-block text-xs text-emerald-600 hover:underline"
            >
              Ver módulo de Procesos →
            </a>
          </div>
        ) : (
          <div
            className="space-y-3"
            role="tree"
            aria-label="Árbol de asignaciones ISO"
          >
            {hierarchy.processNodes.map(node => {
              const processChecked =
                assignmentEditor.procesos_asignados.includes(node.process.id);
              return (
                <div
                  key={node.process.id}
                  role="treeitem"
                  aria-expanded
                  className="space-y-1"
                >
                  <TreeRow
                    id={`process-${node.process.id}`}
                    title={`${node.process.codigo || ''} ${node.process.nombre || 'Proceso'}`.trim()}
                    subtitle={
                      node.process.alcance ||
                      node.process.objetivo ||
                      'Proceso ISO'
                    }
                    checked={processChecked}
                    disabled={false}
                    onToggle={() => onToggleProcess(node.process.id)}
                    weight="semibold"
                    indent={0}
                  />

                  {node.objectives.map(objectiveNode => {
                    const objectiveChecked =
                      assignmentEditor.objetivos_asignados.includes(
                        objectiveNode.objective.id
                      );
                    const objectiveDisabled = !processChecked;
                    return (
                      <div
                        key={objectiveNode.objective.id}
                        className="space-y-1"
                      >
                        <TreeRow
                          id={`objective-${objectiveNode.objective.id}`}
                          title={`${objectiveNode.objective.code || ''} ${objectiveNode.objective.title || 'Objetivo'}`.trim()}
                          subtitle={
                            objectiveDisabled
                              ? 'Seleccioná el proceso primero'
                              : objectiveNode.objective.description ||
                                'Objetivo de calidad'
                          }
                          checked={objectiveChecked}
                          disabled={objectiveDisabled}
                          onToggle={() =>
                            onToggleObjective(objectiveNode.objective.id)
                          }
                          indent={1}
                        />
                        {objectiveNode.indicators.map(indicator => {
                          const { title, subtitle } =
                            formatIndicator(indicator);
                          return (
                            <TreeRow
                              key={indicator.id}
                              id={`indicator-${indicator.id}`}
                              title={title}
                              subtitle={
                                !processChecked || !objectiveChecked
                                  ? 'Seleccioná proceso y objetivo primero'
                                  : subtitle
                              }
                              checked={assignmentEditor.indicadores_asignados.includes(
                                indicator.id
                              )}
                              disabled={!processChecked || !objectiveChecked}
                              onToggle={() => onToggleIndicator(indicator.id)}
                              indent={2}
                            />
                          );
                        })}
                      </div>
                    );
                  })}

                  {node.indicators.map(indicator => {
                    const { title, subtitle } = formatIndicator(indicator);
                    return (
                      <TreeRow
                        key={indicator.id}
                        id={`process-indicator-${indicator.id}`}
                        title={title}
                        subtitle={
                          !processChecked
                            ? 'Seleccioná el proceso primero'
                            : subtitle
                        }
                        checked={assignmentEditor.indicadores_asignados.includes(
                          indicator.id
                        )}
                        disabled={!processChecked}
                        onToggle={() => onToggleIndicator(indicator.id)}
                        indent={1}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Indicadores huérfanos */}
      {hierarchy.orphanIndicators.length > 0 && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Indicadores sin proceso asignado
          </p>
          <div className="space-y-1">
            {hierarchy.orphanIndicators.map(indicator => {
              const { title, subtitle } = formatIndicator(indicator);
              return (
                <TreeRow
                  key={indicator.id}
                  id={`orphan-${indicator.id}`}
                  title={title}
                  subtitle={subtitle}
                  checked={assignmentEditor.indicadores_asignados.includes(
                    indicator.id
                  )}
                  disabled={false}
                  onToggle={() => onToggleIndicator(indicator.id)}
                  indent={0}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Botón guardar */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          type="button"
          onClick={onSave}
          disabled={saveLoading || !hasUnsavedChanges}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saveLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Procesos'
          )}
        </Button>
        {saveMessage && (
          <p
            className={`text-sm ${saveState === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
          >
            {saveMessage}
          </p>
        )}
        {!saveMessage && hasUnsavedChanges && (
          <p className="text-xs text-amber-600">Cambios sin guardar</p>
        )}
      </div>
    </div>
  );
}
