'use client';

import { FindingCard } from '@/components/findings/FindingCard';
import { FindingFormDialog } from '@/components/findings/FindingFormDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import type { Finding, FindingStatus } from '@/types/findings';
import { KANBAN_DEFAULTS, type KanbanColumnConfig } from '@/types/kanbanSchema';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type FindingKanbanColumn = {
  status: FindingStatus;
  label: string;
  color: string;
};

const DEFAULT_COLUMNS: FindingKanbanColumn[] = KANBAN_DEFAULTS.hallazgos.map(
  column => ({
    status: column.id as FindingStatus,
    label: column.title,
    color: column.color,
  })
);

function mapColumns(columns: KanbanColumnConfig[]): FindingKanbanColumn[] {
  return columns.map(column => ({
    status: column.id as FindingStatus,
    label: column.title,
    color: column.color,
  }));
}

interface FindingKanbanProps {
  filters?: {
    status?: string;
    processId?: string;
    year?: number;
    search?: string;
    requiresAction?: boolean;
  };
}

export function FindingKanban({ filters }: FindingKanbanProps) {
  const { toast } = useToast();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [columnas, setColumnas] = useState<FindingKanbanColumn[]>(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [deletingFinding, setDeletingFinding] = useState<Finding | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  useEffect(() => {
    fetchFindings();
  }, [filters]);

  useEffect(() => {
    const fetchKanbanSchema = async () => {
      try {
        const orgId = window.sessionStorage.getItem('organization_id');
        const params = new URLSearchParams();
        if (orgId) {
          params.set('organization_id', orgId);
        }

        const response = await fetch(
          `/api/kanban-schemas/hallazgos${params.toString() ? `?${params.toString()}` : ''}`
        );

        if (!response.ok) return;

        const result = await response.json();
        if (result?.success && Array.isArray(result?.data?.columns)) {
          setColumnas(mapColumns(result.data.columns));
        }
      } catch {
        // Keep default columns as silent fallback.
      }
    };

    fetchKanbanSchema();
  }, []);

  const fetchFindings = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters?.processId) params.append('processId', filters.processId);
      if (filters?.year) params.append('year', filters.year.toString());
      if (filters?.requiresAction !== undefined) {
        params.append('requiresAction', filters.requiresAction.toString());
      }
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const response = await fetch(`/api/findings?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Error al cargar los hallazgos');
      }

      const data = await response.json();
      const validFindings = (data.findings || []).filter(
        (f: Finding) => f.registration && f.findingNumber && f.isActive
      );
      setFindings(validFindings);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar los hallazgos'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFinding) return;

    try {
      setIsDeleteLoading(true);
      const response = await fetch(`/api/findings/${deletingFinding.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userName: 'Usuario' }),
      });

      if (!response.ok) throw new Error('Error al eliminar el hallazgo');

      toast({
        title: 'Hallazgo eliminado',
        description: 'El hallazgo se ha eliminado correctamente',
      });
      fetchFindings();
      setDeletingFinding(null);
    } catch (error) {
      console.error('Error deleting finding:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el hallazgo',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const getFindingsByStatus = (status: FindingStatus) => {
    return findings.filter(finding => finding.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columnas.map(column => {
        const columnFindings = getFindingsByStatus(column.status);

        return (
          <div key={column.status} className="flex-shrink-0 w-80">
            <div
              className={`${column.color} border-0 rounded-t-lg px-4 py-3 font-semibold`}
            >
              <div className="flex items-center justify-between">
                <span>{column.label}</span>
                <span className="bg-white px-2 py-1 rounded-full text-sm">
                  {columnFindings.length}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 border-0 rounded-b-lg p-4 min-h-[500px] space-y-3">
              {columnFindings.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay hallazgos
                </p>
              ) : (
                columnFindings.map(finding => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    onEdit={setEditingFinding}
                    onDelete={setDeletingFinding}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}

      {editingFinding && (
        <FindingFormDialog
          open={!!editingFinding}
          onOpenChange={open => !open && setEditingFinding(null)}
          initialData={{
            name: editingFinding.registration.name,
            description: editingFinding.registration.description,
            sourceType: editingFinding.registration.sourceType,
            sourceId: editingFinding.registration.sourceId || undefined,
            sourceName: editingFinding.registration.sourceName || undefined,
            processId: editingFinding.registration.processId || '',
            processName: editingFinding.registration.processName || '',
            normPoints: editingFinding.registration.normPoints,
          }}
          onSuccess={() => {
            fetchFindings();
            setEditingFinding(null);
          }}
        />
      )}

      <DeleteConfirmDialog
        open={!!deletingFinding}
        onClose={() => setDeletingFinding(null)}
        onConfirm={handleDelete}
        title="Eliminar Hallazgo"
        itemName={deletingFinding?.findingNumber || ''}
        itemType="hallazgo"
      />
    </div>
  );
}
