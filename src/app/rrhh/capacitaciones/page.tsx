'use client';

import { PageHeader, PageToolbar, ViewMode } from '@/components/design-system';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { ListGrid } from '@/components/design-system/patterns/lists';
import { TrainingFormDialog } from '@/components/rrhh/TrainingFormDialog';
import { ModuleMaturityButton } from '@/components/shared/ModuleMaturityButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Training } from '@/types/rrhh';
import { Calendar, GraduationCap, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function CapacitacionesPage() {
  const router = useRouter();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const response = await fetch('/api/rrhh/trainings');
      if (response.ok) {
        const data = await response.json();
        setTrainings(data);
      }
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrainings = useMemo(() => {
    return trainings.filter(training => {
      const matchesSearch =
        training.tema.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (training.descripcion &&
          training.descripcion
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' || training.estado === statusFilter;
      const matchesModality =
        modalityFilter === 'all' || training.modalidad === modalityFilter;

      return matchesSearch && matchesStatus && matchesModality;
    });
  }, [trainings, searchTerm, statusFilter, modalityFilter]);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/rrhh/capacitaciones/${id}`);
    },
    [router]
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta capacitación?')) return;

    try {
      const response = await fetch(`/api/rrhh/trainings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTrainings(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Error deleting training:', error);
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planificada':
        return 'bg-blue-100 text-blue-800';
      case 'en_curso':
        return 'bg-yellow-100 text-yellow-800';
      case 'completada':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planificada':
        return 'Planificada';
      case 'en_curso':
        return 'En Curso';
      case 'completada':
        return 'Completada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getModalidadText = (modalidad: string) => {
    switch (modalidad) {
      case 'presencial':
        return 'Presencial';
      case 'virtual':
        return 'Virtual';
      case 'mixta':
        return 'Mixta';
      default:
        return modalidad;
    }
  };

  const getStatusVariant = (
    status: string
  ):
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning' => {
    switch (status) {
      case 'planificada':
        return 'default';
      case 'en_curso':
        return 'warning';
      case 'completada':
        return 'success';
      case 'cancelada':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const stats = useMemo(() => {
    return {
      total: trainings.length,
      en_curso: trainings.filter(t => t.estado === 'en_curso').length,
      planificadas: trainings.filter(t => t.estado === 'planificada').length,
      completadas: trainings.filter(t => t.estado === 'completada').length,
    };
  }, [trainings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageHeader
          title="Capacitaciones"
          description="Gestión de capacitaciones y formación del personal"
          breadcrumbs={[
            { label: 'RRHH', href: '/rrhh' },
            { label: 'Capacitaciones' },
          ]}
          actions={
            <div className="flex gap-2">
              <ModuleMaturityButton moduleKey="capacitaciones" />
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Capacitación
              </Button>
            </div>
          }
        />

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 font-medium">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 font-medium">En Curso</p>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.en_curso}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 font-medium">Planificadas</p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.planificadas}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 font-medium">Completadas</p>
              <p className="text-2xl font-bold text-slate-600">
                {stats.completadas}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={mode => setViewMode(mode)}
          supportedViews={['grid', 'list']}
          searchPlaceholder="Buscar capacitaciones..."
          filterOptions={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="planificada">Planificada</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Content */}
        {filteredTrainings.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No hay capacitaciones
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando tu primera capacitación
            </p>
          </div>
        ) : (
          <ListGrid
            data={filteredTrainings}
            keyExtractor={training => training.id}
            renderItem={training => (
              <DomainCard
                key={training.id}
                title={training.tema}
                subtitle={`${new Date(training.fecha_inicio).toLocaleDateString('es-ES')} • ${getModalidadText(training.modalidad)}`}
                status={{
                  label: getStatusText(training.estado),
                  variant: getStatusVariant(training.estado),
                }}
                onClick={() => handleView(training.id)}
              >
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {training.descripcion || 'Sin descripción'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(training.fecha_inicio).toLocaleDateString(
                        'es-ES'
                      )}
                    </span>
                  </div>
                </div>
              </DomainCard>
            )}
          />
        )}

        <TrainingFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={fetchTrainings}
        />
      </div>
    </div>
  );
}
