'use client';

import { useToast } from '@/hooks/use-toast';
import type { Audit, AuditStatus } from '@/types/audits';
import { KANBAN_DEFAULTS, type KanbanColumnConfig } from '@/types/kanbanSchema';
import { Calendar, FileText, Pencil, Trash2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DeleteConfirmDialog } from '../shared/DeleteConfirmDialog';
import { Button } from '../ui/button';
import { AuditFormDialog } from './AuditFormDialog';

interface AuditKanbanProps {
  audits: Audit[];
}

type AuditKanbanColumn = {
  key: AuditStatus;
  label: string;
  color: string;
};

const AUDIT_STATUS_ID_MAP: Record<string, AuditStatus> = {
  planificada: 'planned',
  planned: 'planned',
  en_ejecucion: 'in_progress',
  in_progress: 'in_progress',
  completada: 'completed',
  completed: 'completed',
};

const DEFAULT_COLUMNS: AuditKanbanColumn[] = KANBAN_DEFAULTS.auditorias.map(
  column => ({
    key: AUDIT_STATUS_ID_MAP[column.id] ?? (column.id as AuditStatus),
    label: column.title,
    color: column.color,
  })
);

function mapColumns(columns: KanbanColumnConfig[]): AuditKanbanColumn[] {
  return columns
    .map(column => {
      const key = AUDIT_STATUS_ID_MAP[column.id];

      if (!key) return null;

      return {
        key,
        label: column.title,
        color: column.color,
      };
    })
    .filter((column): column is AuditKanbanColumn => column !== null);
}

export function AuditKanban({ audits }: AuditKanbanProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [columnas, setColumnas] = useState<AuditKanbanColumn[]>(DEFAULT_COLUMNS);
  const [isDeleting, setIsDeleting] = useState(false);
  const [auditToDelete, setAuditToDelete] = useState<Audit | null>(null);
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchKanbanSchema = async () => {
      try {
        const orgId = window.sessionStorage.getItem('organization_id');
        const params = new URLSearchParams();
        if (orgId) {
          params.set('organization_id', orgId);
        }

        const response = await fetch(
          `/api/kanban-schemas/auditorias${params.toString() ? `?${params.toString()}` : ''}`
        );

        if (!response.ok) return;

        const result = await response.json();
        if (result?.success && Array.isArray(result?.data?.columns)) {
          const nextColumns = mapColumns(result.data.columns);
          if (nextColumns.length > 0) {
            setColumnas(nextColumns);
          }
        }
      } catch {
        // Keep default columns as silent fallback.
      }
    };

    fetchKanbanSchema();
  }, []);

  const handleDelete = async () => {
    if (!auditToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sdk/audits/${auditToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar la auditoría');

      toast({
        title: 'Auditoría eliminada',
        description: 'La auditoría se ha eliminado exitosamente',
      });
      router.refresh();
      setAuditToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la auditoría',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async (formData: any) => {
    if (!editingAudit) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/sdk/audits/${editingAudit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error al actualizar la auditoría');

      toast({
        title: 'Auditoría actualizada',
        description: 'La auditoría se ha actualizado exitosamente',
      });
      router.refresh();
      setEditingAudit(null);
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la auditoría',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const auditsByStatus = columnas.reduce(
    (acc, column) => {
      acc[column.key] = audits.filter(audit => audit.status === column.key);
      return acc;
    },
    {} as Record<AuditStatus, Audit[]>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {columnas.map(column => (
        <div key={column.key} className="flex flex-col">
          <div className={`${column.color} rounded-t-2xl p-5 shadow-sm border-0`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-lg">
                {column.label}
              </h3>
              <span className="bg-white shadow-sm text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200">
                {auditsByStatus[column.key].length}
              </span>
            </div>
          </div>

          <div className="flex-1 bg-gray-50 rounded-b-2xl p-5 min-h-[600px] border-0">
            <div className="space-y-5">
              {auditsByStatus[column.key].length === 0 ? (
                <div className="flex items-center justify-center h-full py-20">
                  <p className="text-sm text-gray-400 text-center">
                    No hay auditorías
                  </p>
                </div>
              ) : (
                auditsByStatus[column.key].map(audit => (
                  <div
                    key={audit.id}
                    onClick={() => router.push(`/mejoras/auditorias/${audit.id}`)}
                    className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer p-5 border-0"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                          {audit.title}
                        </h4>
                        <p className="text-xs text-gray-500 mb-3">
                          {audit.auditNumber}
                        </p>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingAudit(audit);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={e => {
                            e.stopPropagation();
                            setAuditToDelete(audit);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2.5 mb-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          {audit.plannedDate?.toDate
                            ? audit.plannedDate.toDate().toLocaleDateString('es-ES')
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{audit.leadAuditor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          {audit.auditType === 'complete'
                            ? 'Completa'
                            : 'Parcial'}
                        </span>
                      </div>
                    </div>

                    {(audit.status === 'in_progress' ||
                      audit.status === 'completed') && (
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-600">Progreso</span>
                          <span className="font-semibold text-gray-900">
                            {audit.normPointsVerification?.filter(
                              v => v.conformityStatus !== null
                            ).length || 0}
                            /{audit.normPointsVerification?.length || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                audit.normPointsVerification?.length
                                  ? (
                                      ((audit.normPointsVerification.filter(
                                        v => v.conformityStatus !== null
                                      ).length || 0) /
                                        audit.normPointsVerification.length) *
                                      100
                                    ).toFixed(0)
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ))}

      <DeleteConfirmDialog
        open={!!auditToDelete}
        onClose={() => setAuditToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Auditoría"
        itemName={auditToDelete?.title || ''}
        itemType="auditoría"
      />

      {editingAudit && (
        <AuditFormDialog
          open={!!editingAudit}
          onClose={() => setEditingAudit(null)}
          onSubmit={handleEditSubmit}
          mode="edit"
          initialData={{
            title: editingAudit.title,
            auditType: editingAudit.auditType,
            scope: editingAudit.scope,
            plannedDate: editingAudit.plannedDate?.toDate
              ? editingAudit.plannedDate.toDate()
              : new Date(editingAudit.plannedDate as any),
            leadAuditor: editingAudit.leadAuditor,
            selectedNormPoints: editingAudit.selectedNormPoints || [],
          }}
        />
      )}
    </div>
  );
}
