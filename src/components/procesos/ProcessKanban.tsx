'use client';

import {
  PageHeader,
  PageToolbar,
  Section,
} from '@/components/design-system/layout';
import {
  KanbanItem,
  UnifiedKanban,
} from '@/components/design-system/patterns/kanban';
import { KanbanColumnDef } from '@/components/design-system/patterns/kanban/kanbanTypes';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ProcessRecordService } from '@/services/procesos/ProcessRecordService';
import {
  KANBAN_DEFAULTS,
  type KanbanColumnConfig,
} from '@/types/kanbanSchema';
import { ProcessRecord } from '@/types/procesos';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

interface ProcessKanbanProps {
  processId: string;
  processName: string;
  showHeader?: boolean;
  onNewRecord?: () => void;
  onEditRecord?: (record: ProcessRecord) => void;
  onViewRecord?: (record: ProcessRecord) => void;
}

// Configuración de columnas
const PROCESS_STATUS_ORDER = [
  'pendiente',
  'en-progreso',
  'completado',
] as const;

function mapColumns(columns: KanbanColumnConfig[]): KanbanColumnDef[] {
  return columns.slice(0, PROCESS_STATUS_ORDER.length).map((column, index) => ({
    id: PROCESS_STATUS_ORDER[index] || column.id,
    title: column.title,
    color: column.color,
    allowDrop: true,
    order: column.order,
  }));
}

export const ProcessKanban: React.FC<ProcessKanbanProps> = ({
  processId,
  processName,
  showHeader = true,
  onNewRecord,
  onEditRecord,
  onViewRecord,
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const [records, setRecords] = useState<ProcessRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [columns, setColumns] = useState<KanbanColumnDef[]>(() =>
    mapColumns(KANBAN_DEFAULTS.procesos)
  );

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');

  useEffect(() => {
    if (!orgId) return;

    let isMounted = true;

    const loadColumns = async () => {
      try {
        const response = await fetch(
          `/api/kanban-schemas/procesos?organization_id=${orgId}`
        );

        if (!response.ok) return;

        const payload = await response.json();
        const remoteColumns = payload?.data?.columns;

        if (isMounted && Array.isArray(remoteColumns)) {
          setColumns(mapColumns(remoteColumns));
        }
      } catch {
        // Fallback silencioso a defaults
      }
    };

    void loadColumns();

    return () => {
      isMounted = false;
    };
  }, [orgId]);

  // Cargar datos
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const estado =
        selectedEstado === 'todos' ? undefined : (selectedEstado as any);
      const data = await ProcessRecordService.getFiltered(
        processId,
        searchTerm,
        estado
      );
      setRecords(data || []);
    } catch (err) {
      console.error('Error al cargar registros:', err);
      toast({ title: 'Error cargando registros', variant: 'destructive' });
      setRecords([]);
    } finally {
      setLoadingData(false);
    }
  }, [processId, searchTerm, selectedEstado, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Transformar datos a formato Kanban
  const kanbanItems: KanbanItem[] = records.map(record => ({
    id: record.id,
    title: record.titulo,
    description: record.descripcion,
    status: record.estado,
    priority:
      record.prioridad === 'alta'
        ? 'high'
        : record.prioridad === 'media'
          ? 'medium'
          : 'low',
    assignee: { name: record.responsable }, // Fix: Wrap string in object
    dueDate: record.fecha_vencimiento
      ? new Date(record.fecha_vencimiento).toLocaleDateString()
      : undefined,
    tags: [record.prioridad],
    meta: {},
  }));

  // Handlers
  const handleItemMove = async (itemId: string, targetColumnId: string) => {
    try {
      // Optimistic update
      setRecords(prev =>
        prev.map(r =>
          r.id === itemId ? { ...r, estado: targetColumnId as any } : r
        )
      );

      await ProcessRecordService.moveToState(itemId, targetColumnId as any);
      toast({ title: 'Registro actualizado', duration: 2000 });
    } catch (error) {
      console.error('Error moviendo item:', error);
      toast({ title: 'Error al mover registro', variant: 'destructive' });
      fetchData(); // Rollback/Refresh
    }
  };

  const handleItemClick = (item: KanbanItem) => {
    const record = records.find(r => r.id === item.id);
    if (record && onViewRecord) onViewRecord(record);
    else if (record)
      router.push(`/dashboard/procesos/${processId}/registros/${record.id}`);
  };

  return (
    <div className="space-y-6">
      {showHeader ? (
        <PageHeader
          title="Tablero de Registros"
          subtitle={`Gestionando: ${processName}`}
        >
          <Button
            onClick={onNewRecord}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Registro
          </Button>
        </PageHeader>
      ) : null}

      <Section>
        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          viewMode="kanban"
          supportedViews={['kanban']}
        >
          <div className="w-[180px]">
            <Select value={selectedEstado} onValueChange={setSelectedEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {columns.map(column => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageToolbar>

        <div className="h-[600px] mt-4">
          <UnifiedKanban
            columns={columns}
            items={kanbanItems}
            onItemMove={handleItemMove}
            onItemClick={handleItemClick}
          />
        </div>
      </Section>
    </div>
  );
};
