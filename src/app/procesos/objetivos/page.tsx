'use client';

import {
  BaseBadge,
  DomainCard,
  ListGrid,
  ListTable,
  PageHeader,
  PageToolbar,
  Section,
} from '@/components/design-system';
import { ObjectiveFormDialog } from '@/components/quality/ObjectiveFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QualityObjective } from '@/types/quality';
import { Edit, Eye, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function ObjetivosListing() {
  const router = useRouter();
  const [objectives, setObjectives] = useState<QualityObjective[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchObjectives();
  }, []);

  const fetchObjectives = async () => {
    try {
      const response = await fetch('/api/quality/objectives');
      if (response.ok) {
        const data = await response.json();
        setObjectives(data);
      }
    } catch (error) {
      console.error('Error fetching objectives:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredObjectives = useMemo(() => {
    return objectives.filter(objective => {
      const matchesSearch =
        objective.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        objective.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        objective.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || objective.status === statusFilter;
      const matchesType = typeFilter === 'all' || objective.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [objectives, searchTerm, statusFilter, typeFilter]);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/procesos/objetivos/${id}`);
    },
    [router]
  );

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/procesos/objetivos/${id}/edit`);
    },
    [router]
  );

  const getStatusText = (status: string) => {
    switch (status) {
      case 'activo':
        return 'Activo';
      case 'completado':
        return 'Completado';
      case 'atrasado':
        return 'Atrasado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): any => {
    switch (status) {
      case 'activo':
        return 'success';
      case 'completado':
        return 'info';
      case 'atrasado':
        return 'warning';
      case 'cancelado':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Objetivos de Calidad"
        description="Gestión de objetivos SMART vinculados a procesos"
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Procesos', href: '/procesos' },
          { label: 'Objetivos' },
        ]}
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Objetivo
          </Button>
        }
      />

      <PageToolbar
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={mode => setViewMode(mode as any)}
        supportedViews={['grid', 'list']}
        filterOptions={
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="completado">Completado</option>
              <option value="atrasado">Atrasado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="estrategico">Estratégico</option>
              <option value="tactico">Táctico</option>
              <option value="operativo">Operativo</option>
            </select>
          </div>
        }
      />

      <Section>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-0 shadow-md animate-pulse">
                <CardContent className="h-48 bg-slate-100" />
              </Card>
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <ListGrid
            data={filteredObjectives}
            renderItem={objective => (
              <DomainCard
                title={objective.title}
                subtitle={objective.code}
                status={{
                  label: getStatusText(objective.status),
                  variant: getStatusVariant(objective.status),
                }}
                meta={
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-xs">
                      <span>Progreso</span>
                      <span>{objective.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          objective.progress_percentage >= 100
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${objective.progress_percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Vence: {new Date(objective.due_date).toLocaleDateString()}
                    </div>
                  </div>
                }
                actions={[
                  {
                    label: 'Ver detalle',
                    icon: <Eye className="h-4 w-4" />,
                    onClick: () => handleView(objective.id),
                    variant: 'ghost',
                  },
                  {
                    label: 'Editar',
                    icon: <Edit className="h-4 w-4" />,
                    onClick: () => handleEdit(objective.id),
                    variant: 'ghost',
                  },
                ]}
              />
            )}
            keyExtractor={obj => obj.id}
          />
        ) : (
          <ListTable
            data={filteredObjectives}
            columns={[
              { header: 'Código', accessorKey: 'code' },
              { header: 'Título', accessorKey: 'title' },
              {
                header: 'Progreso',
                cell: (obj: any) => (
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${obj.progress_percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs">{obj.progress_percentage}%</span>
                  </div>
                ),
              },
              {
                header: 'Estado',
                cell: (obj: any) => (
                  <BaseBadge variant={getStatusVariant(obj.status)}>
                    {getStatusText(obj.status)}
                  </BaseBadge>
                ),
              },
            ]}
            keyExtractor={obj => obj.id}
          />
        )}
      </Section>

      <ObjectiveFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchObjectives}
      />
    </div>
  );
}
