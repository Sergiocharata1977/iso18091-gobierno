'use client';

import {
  ListGrid,
  ListTable,
  PageHeader,
  PageToolbar,
  Section,
} from '@/components/design-system';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PositionService } from '@/services/rrhh/PositionService';
import { Position, PositionFormData } from '@/types/rrhh';
import {
  Briefcase,
  Building2,
  Download,
  Edit,
  Eye,
  Plus,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PositionForm } from './PositionForm';

interface PositionListingProps {
  onViewPosition?: (position: Position) => void;
  onEditPosition?: (position: Position) => void;
  onNewPosition?: () => void;
}

export function PositionListing({
  onViewPosition,
  onEditPosition,
  onNewPosition,
}: PositionListingProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null
  );
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user?.organization_id) return;
    setIsLoading(true);
    try {
      const data = await PositionService.getAll(user.organization_id);
      setPositions(data);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los puestos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.organization_id]);

  useEffect(() => {
    if (user?.organization_id) {
      fetchData();
    }
  }, [fetchData, user?.organization_id]);

  const filteredPositions = useMemo(() => {
    return positions.filter(position => {
      const matchesSearch =
        position.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.descripcion_responsabilidades
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        position.requisitos_experiencia
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        position.requisitos_formacion
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [positions, searchTerm]);

  const handleNewPosition = useCallback(() => {
    setSelectedPosition(null);
    setShowForm(true);
    onNewPosition?.();
  }, [onNewPosition]);

  const handleFormSuccess = useCallback(
    async (data: PositionFormData) => {
      try {
        if (selectedPosition) {
          await PositionService.update(selectedPosition.id, data);
        } else {
          if (!user?.organization_id) throw new Error('No organization ID');
          await PositionService.create(data, user.organization_id);
        }
        setShowForm(false);
        fetchData();
      } catch (error) {
        console.error('Error al guardar puesto:', error);
        toast({
          title: 'Error',
          description: `No se pudo guardar el puesto: ${error instanceof Error ? error.message : String(error)}`,
          variant: 'destructive',
        });
      }
    },
    [selectedPosition, fetchData, toast, user?.organization_id]
  );

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleEditPosition = useCallback(
    (position: Position) => {
      setSelectedPosition(position);
      setShowForm(true);
      onEditPosition?.(position);
    },
    [onEditPosition]
  );

  const handleDeleteClick = useCallback((position: Position) => {
    setPositionToDelete(position);
    setShowDeleteAlert(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (positionToDelete) {
      try {
        await PositionService.delete(positionToDelete.id);
        toast({
          title: 'Éxito',
          description: `Puesto "${positionToDelete.nombre}" eliminado.`,
        });
        fetchData();
      } catch (error) {
        console.error('Error deleting position:', error);
        toast({
          title: 'Error',
          description: `No se pudo eliminar el puesto: ${error instanceof Error ? error.message : String(error)}`,
          variant: 'destructive',
        });
      } finally {
        setShowDeleteAlert(false);
        setPositionToDelete(null);
      }
    }
  }, [positionToDelete, fetchData, toast]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteAlert(false);
    setPositionToDelete(null);
  }, []);

  const handleViewDetails = useCallback(
    (position: Position) => {
      setSelectedPosition(position);
      setShowDetails(true);
      onViewPosition?.(position);
    },
    [onViewPosition]
  );

  const handleCardClick = useCallback(
    (position: Position) => {
      router.push(`/rrhh/positions/${position.id}`);
    },
    [router]
  );

  const handleCloseDetails = useCallback(() => {
    setShowDetails(false);
    setSelectedPosition(null);
  }, []);

  const handleSeedData = useCallback(async () => {
    try {
      const response = await fetch('/api/seed/rrhh/fresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Datos sembrados exitosamente:', result);
        await fetchData();
        toast({
          title: 'Éxito',
          description: 'Datos de prueba agregados exitosamente',
        });
      } else {
        const error = await response.json();
        console.error('Error al sembrar datos:', error);
        toast({
          title: 'Error',
          description: 'Error al agregar datos de prueba',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error al sembrar datos:', error);
      toast({
        title: 'Error',
        description: 'Error al agregar datos de prueba',
        variant: 'destructive',
      });
    }
  }, [fetchData, toast]);

  const stats = useMemo(() => {
    const total = positions.length;
    const activos = positions.length;
    const departamentos = new Set(
      positions.map(p => p.departamento_id).filter(Boolean)
    ).size;

    return { total, activos, departamentos };
  }, [positions]);

  const getEstadoVariant = (isActive: boolean): 'success' | 'secondary' => {
    return isActive ? 'success' : 'secondary';
  };

  const emptyState = (
    <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
      <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground">
        No hay puestos registrados
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Empieza creando un nuevo puesto o importa datos de prueba.
      </p>
      <div className="mt-6 flex justify-center gap-4">
        <Button
          onClick={handleNewPosition}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Crear Puesto
        </Button>
        <Button
          variant="outline"
          onClick={handleSeedData}
          className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Datos de Prueba
        </Button>
      </div>
    </div>
  );

  const renderContent = useMemo(() => {
    if (isLoading) {
      return (
        <ListGrid
          data={[...Array(6)].map((_, i) => ({ id: `skeleton-${i}` }))}
          renderItem={() => (
            <div className="bg-card border border-border/50 rounded-xl p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
              </div>
            </div>
          )}
          keyExtractor={item => item.id}
          columns={3}
        />
      );
    }

    if (viewMode === 'grid') {
      return (
        <ListGrid
          data={filteredPositions}
          renderItem={position => (
            <DomainCard
              key={position.id}
              title={position.nombre}
              subtitle={
                position.departamento_id
                  ? `Dpto: ${position.departamento_id}`
                  : 'Sin departamento'
              }
              status={{
                label: 'Activo',
                variant: 'success',
              }}
              meta={
                <div className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  <span>
                    {position.reporta_a_id ? 'Reporta definido' : 'Sin reporte'}
                  </span>
                </div>
              }
              actions={[
                {
                  label: 'Ver Detalles',
                  icon: <Eye className="h-4 w-4" />,
                  onClick: () => handleViewDetails(position),
                },
                {
                  label: 'Editar',
                  icon: <Edit className="h-4 w-4" />,
                  onClick: () => handleEditPosition(position),
                },
                {
                  label: 'Eliminar',
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: () => handleDeleteClick(position),
                  variant: 'destructive',
                },
              ]}
              onClick={() => handleViewDetails(position)}
            >
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                {position.descripcion_responsabilidades || 'Sin descripción'}
              </p>
            </DomainCard>
          )}
          keyExtractor={position => position.id}
          columns={3}
          emptyState={emptyState}
        />
      );
    }

    return (
      <ListTable
        data={filteredPositions}
        columns={[
          {
            header: 'Puesto',
            cell: position => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {position.nombre}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {position.descripcion_responsabilidades ||
                      'Sin descripción'}
                  </p>
                </div>
              </div>
            ),
          },
          {
            header: 'Departamento',
            cell: position => (
              <span className="text-muted-foreground">
                {position.departamento_id || 'N/A'}
              </span>
            ),
          },
          {
            header: 'Responsable',
            cell: position => (
              <span className="text-muted-foreground">
                {position.reporta_a_id || 'N/A'}
              </span>
            ),
          },
          {
            header: 'Estado',
            cell: position => <BaseBadge variant="success">Activo</BaseBadge>,
          },
          {
            header: 'Fecha Creación',
            cell: position => (
              <span className="text-muted-foreground">
                {position.created_at
                  ? new Date(position.created_at).toLocaleDateString()
                  : 'N/A'}
              </span>
            ),
          },
          {
            header: 'Acciones',
            cell: position => (
              <div className="flex justify-end space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation();
                    handleViewDetails(position);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation();
                    handleEditPosition(position);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteClick(position);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        keyExtractor={position => position.id}
        onRowClick={handleViewDetails}
        emptyState={emptyState}
      />
    );
  }, [
    filteredPositions,
    isLoading,
    viewMode,
    handleNewPosition,
    handleEditPosition,
    handleDeleteClick,
    handleViewDetails,
    handleSeedData,
  ]);

  return (
    <>
      <PageHeader
        title="Gestión de Puestos"
        subtitle="Administra los puestos de trabajo de la organización"
        breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Puestos' }]}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={handleNewPosition}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Puesto
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <Section title="Estadísticas" description="Resumen de puestos">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BaseCard padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Total Puestos
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
              </div>
            </div>
          </BaseCard>
          <BaseCard padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Activos
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.activos}
                </p>
              </div>
            </div>
          </BaseCard>
          <BaseCard padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Departamentos
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.departamentos}
                </p>
              </div>
            </div>
          </BaseCard>
        </div>
      </Section>

      <PageToolbar
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder="Buscar puestos..."
        viewMode={viewMode}
        onViewModeChange={mode => setViewMode(mode as any)}
        supportedViews={['list', 'grid']}
      />

      <Section>{renderContent}</Section>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <PositionForm
              initialData={selectedPosition}
              onSubmit={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {showDetails && selectedPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <BaseCard padding="lg">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-card-foreground font-semibold text-xl shadow-lg">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {selectedPosition.nombre}
                    </h2>
                    <BaseBadge variant="success" className="mt-1">
                      Activo
                    </BaseBadge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleCloseDetails}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <span className="sr-only">Cerrar</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">
                    Información del Puesto
                  </h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Descripción
                      </dt>
                      <dd className="text-base mt-1 text-foreground">
                        {selectedPosition.descripcion_responsabilidades ||
                          'Sin descripción'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Departamento
                      </dt>
                      <dd className="text-base mt-1 text-foreground">
                        {selectedPosition.departamento_id || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Reporta a
                      </dt>
                      <dd className="text-base mt-1 text-foreground">
                        {selectedPosition.reporta_a_id || 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border">
                    Requisitos
                  </h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Experiencia
                      </dt>
                      <dd className="text-base mt-1 text-foreground">
                        {selectedPosition.requisitos_experiencia || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Formación
                      </dt>
                      <dd className="text-base mt-1 text-foreground">
                        {selectedPosition.requisitos_formacion || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Fecha de Creación
                      </dt>
                      <dd className="text-base mt-1 text-foreground">
                        {selectedPosition.created_at
                          ? new Date(
                              selectedPosition.created_at
                            ).toLocaleDateString()
                          : 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      )}

      {/* Alerta de confirmación de eliminación */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente
              el puesto{' '}
              <span className="font-semibold text-foreground">
                {positionToDelete?.nombre}
              </span>{' '}
              y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
