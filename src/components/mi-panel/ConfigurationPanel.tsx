'use client';

import { ISOAssignmentsCard } from '@/components/mi-panel/ISOAssignmentsCard';
import { OrganizationalStructureCard } from '@/components/mi-panel/OrganizationalStructureCard';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AssignmentEditorState } from '@/hooks/mi-panel/useAssignmentEditor';
import type { AssignmentHierarchyResult } from '@/hooks/mi-panel/useAssignmentHierarchy';
import type { Department, Position } from '@/types/rrhh';

interface ConfigurationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess?: () => void;
  onSave: () => Promise<boolean> | boolean;
  onSavePuesto: () => Promise<boolean> | boolean;
  canEdit: boolean;
  // Puesto form
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
  // Procesos form
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
}

export function ConfigurationPanel({
  open,
  onOpenChange,
  onSaveSuccess,
  canEdit,
  onSave,
  onSavePuesto,
  assignmentEditor,
  positions,
  departments,
  selectedPosition,
  inferredDepartment,
  inheritedDepartment,
  onPuestoChange,
  onDepartamentoChange,
  currentPuesto,
  currentDepartamento,
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
}: ConfigurationPanelProps) {
  if (!canEdit) return null;

  const handleSavePuesto = async (): Promise<boolean> => {
    const ok = await onSavePuesto();
    if (ok) onSaveSuccess?.();
    return ok;
  };

  const handleSaveProcesos = async (): Promise<boolean> => {
    const ok = await onSave();
    if (ok) onSaveSuccess?.();
    return ok;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-2xl"
      >
        <div className="flex min-h-full flex-col">
          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <SheetTitle>Configurar Mi Panel</SheetTitle>
            <SheetDescription>
              Asigná tu puesto y los procesos ISO que gestionás desde esta
              consola.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 px-6 py-5">
            <Tabs defaultValue="puesto">
              <TabsList className="mb-5 grid w-full grid-cols-2">
                <TabsTrigger value="puesto">Puesto</TabsTrigger>
                <TabsTrigger value="procesos">Procesos</TabsTrigger>
              </TabsList>

              <TabsContent value="puesto">
                <div className="mb-4 space-y-1">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Asignar Puesto
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seleccioná tu puesto en la organización. El departamento se
                    asigna automáticamente.
                  </p>
                </div>
                <OrganizationalStructureCard
                  canEdit={canEdit}
                  assignmentEditor={assignmentEditor}
                  positions={positions}
                  departments={departments}
                  selectedPosition={selectedPosition}
                  inferredDepartment={inferredDepartment}
                  inheritedDepartment={inheritedDepartment}
                  onPuestoChange={onPuestoChange}
                  onDepartamentoChange={onDepartamentoChange}
                  currentPuesto={currentPuesto}
                  currentDepartamento={currentDepartamento}
                  saveLoading={saveLoading}
                  saveMessage={saveMessage}
                  saveState={saveState}
                  onSavePuesto={handleSavePuesto}
                />
              </TabsContent>

              <TabsContent value="procesos">
                <div className="mb-4 space-y-1">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Asignar Procesos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seleccioná los procesos ISO, objetivos e indicadores que
                    forman parte de tu trabajo.
                  </p>
                </div>
                <ISOAssignmentsCard
                  assignmentEditor={assignmentEditor}
                  assignmentCounts={assignmentCounts}
                  hierarchy={hierarchy}
                  catalogLoading={catalogLoading}
                  hasUnsavedChanges={hasUnsavedChanges}
                  saveLoading={saveLoading}
                  saveMessage={saveMessage}
                  saveState={saveState}
                  onToggleProcess={onToggleProcess}
                  onToggleObjective={onToggleObjective}
                  onToggleIndicator={onToggleIndicator}
                  onSave={handleSaveProcesos}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t border-slate-200 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
