'use client';

import {
  PageHeader,
  PageToolbar,
  Section,
} from '@/components/design-system/layout';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { ListGrid, ListTable } from '@/components/design-system/patterns/lists';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ProcessService } from '@/services/procesos/ProcessService';
import { ProcessDefinition } from '@/types/procesos';
import { Edit, Eye, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';

interface ProcessListingProps {
  onViewProcess?: (process: ProcessDefinition) => void;
  onEditProcess?: (process: ProcessDefinition) => void;
  onNewProcess?: () => void;
}

export const ProcessListing: React.FC<ProcessListingProps> = ({
  onViewProcess,
  onEditProcess,
  onNewProcess,
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [loadingData, setLoadingData] = useState(true);

  // Cargar datos
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      // Nota: ProcessService.getFiltered espera string | undefined
      const filter =
        estadoFilter === 'todos'
          ? undefined
          : (estadoFilter as 'activo' | 'inactivo');
      const data = await ProcessService.getFiltered(searchTerm, filter);
      setProcesses(data || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los procesos.',
        variant: 'destructive',
      });
      setProcesses([]);
    } finally {
      setLoadingData(false);
    }
  }, [searchTerm, estadoFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleNewProcess = () => router.push('/dashboard/procesos/new');

  const handleView = (proc: ProcessDefinition) => {
    router.push(`/dashboard/procesos/definiciones/${proc.id}`);
  };

  const handleEdit = (proc: ProcessDefinition) => {
    router.push(`/dashboard/procesos/${proc.id}?edit=true`);
  };

  const handleDelete = async (proc: ProcessDefinition) => {
    if (!confirm(`¿Eliminar proceso: ${proc.nombre}?`)) return;
    try {
      await ProcessService.delete(proc.id);
      setProcesses(prev => prev.filter(p => p.id !== proc.id));
      toast({ title: 'Proceso eliminado' });
    } catch (err) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const handleToggleEstado = async (proc: ProcessDefinition) => {
    try {
      await ProcessService.toggleEstado(proc.id);
      fetchData();
      toast({ title: 'Estado actualizado' });
    } catch (error) {
      toast({ title: 'Error al actualizar estado', variant: 'destructive' });
    }
  };

  // Renderers
  const renderCard = (proc: ProcessDefinition) => (
    <DomainCard
      title={proc.nombre}
      subtitle={proc.codigo}
      status={{
        label: proc.estado === 'activo' ? 'Activo' : 'Inactivo',
        variant: proc.estado === 'activo' ? 'success' : 'secondary',
      }}
      meta={
        <div className="flex gap-4 text-xs">
          <div>
            <span className="font-semibold">Resp:</span> {proc.responsable}
          </div>
          <div>
            <span className="font-semibold">Fecha:</span>{' '}
            {new Date(proc.createdAt).toLocaleDateString()}
          </div>
        </div>
      }
      actions={[
        {
          label: 'Ver',
          icon: <Eye className="w-4 h-4" />,
          onClick: () => handleView(proc),
          variant: 'ghost',
        },
        {
          label: 'Editar',
          icon: <Edit className="w-4 h-4" />,
          onClick: () => handleEdit(proc),
          variant: 'ghost',
        },
        {
          label: proc.estado === 'activo' ? 'Desactivar' : 'Activar',
          icon:
            proc.estado === 'activo' ? (
              <ToggleRight className="w-4 h-4 text-green-600" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            ),
          onClick: () => handleToggleEstado(proc),
          variant: 'ghost',
        },
        {
          label: 'Eliminar',
          icon: <Trash2 className="w-4 h-4 text-red-500" />,
          onClick: () => handleDelete(proc),
          variant: 'destructive',
        },
      ]}
      onClick={() => handleView(proc)}
    />
  );

  const tableColumns = [
    {
      header: 'Código',
      accessorKey: 'codigo' as keyof ProcessDefinition,
      className: 'w-[100px] font-medium',
    },
    { header: 'Nombre', accessorKey: 'nombre' as keyof ProcessDefinition },
    {
      header: 'Responsable',
      accessorKey: 'responsable' as keyof ProcessDefinition,
    },
    {
      header: 'Estado',
      cell: (proc: ProcessDefinition) => (
        <Badge variant={proc.estado === 'activo' ? 'success' : 'secondary'}>
          {proc.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (proc: ProcessDefinition) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={e => {
              e.stopPropagation();
              handleView(proc);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={e => {
              e.stopPropagation();
              handleEdit(proc);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={e => {
              e.stopPropagation();
              handleDelete(proc);
            }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Procesos"
        subtitle="Administra las definiciones de procesos ISO 9001"
      >
        <Button
          onClick={handleNewProcess}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proceso
        </Button>
      </PageHeader>

      <Section>
        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={mode => setViewMode(mode as any)}
        >
          <div className="w-[180px]">
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PageToolbar>

        {viewMode === 'list' ? (
          <ListTable
            data={processes}
            columns={tableColumns}
            keyExtractor={p => p.id}
            onRowClick={handleView}
            emptyState={
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron procesos
              </div>
            }
          />
        ) : (
          <ListGrid
            data={processes}
            renderItem={renderCard}
            keyExtractor={p => p.id}
            emptyState={
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No se encontraron procesos
              </div>
            }
          />
        )}
      </Section>
    </div>
  );
};
