'use client';

import {
  InlineTagList,
  KPIStatCard,
  ListGrid,
  ListTable,
  PageHeader,
  PageToolbar,
  Section,
  TabPanel,
} from '@/components/design-system';
import { ContextHelpButton } from '@/components/docs/ContextHelpButton';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { ModuleMaturityButton } from '@/components/shared/ModuleMaturityButton';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Personnel, PersonnelFormData } from '@/types/rrhh';
import {
  Building2,
  Clock,
  Download,
  Edit,
  Eye,
  Plus,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PersonnelForm } from './PersonnelForm';

interface PersonnelListingProps {
  onViewPersonnel?: (personnel: Personnel) => void;
  onEditPersonnel?: (personnel: Personnel) => void;
  onNewPersonnel?: () => void;
}

export function PersonnelListing({
  onEditPersonnel,
  onNewPersonnel,
}: PersonnelListingProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(
    null
  );
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [personnelToDelete, setPersonnelToDelete] = useState<Personnel | null>(
    null
  );

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [accessFilter, setAccessFilter] = useState<
    'all' | 'with_access' | 'without_access'
  >('all');
  const [processMap, setProcessMap] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get organization_id from sessionStorage
      const orgId = sessionStorage.getItem('organization_id');
      if (!orgId) {
        console.error('No organization_id found in sessionStorage');
        toast({
          title: 'Error',
          description:
            'No se encontró la organización. Intenta recargar la página.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Load personnel via API with organization_id
      const personnelResponse = await fetch(
        `/api/rrhh/personnel?organization_id=${orgId}&limit=100`
      );
      if (!personnelResponse.ok) throw new Error('Failed to load personnel');
      const responseData = await personnelResponse.json();
      const personnelData = responseData.data || responseData; // Handle paginated or direct response

      // Load positions and processes (optional - don't block if they fail)
      let posMap = new Map<string, string>();
      let procMap: Record<string, string> = {};

      // Normally we would fetch positions and processes here too to enrich data
      // For now, we use what's available in personnelData

      setPersonnel(personnelData);
      setProcessMap(procMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el personal',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle seed data
  const handleSeedData = useCallback(async () => {
    try {
      const orgId = sessionStorage.getItem('organization_id');
      if (!orgId) {
        toast({
          title: 'Error',
          description: 'No se encontró el ID de la organización',
          variant: 'destructive',
        });
        return;
      }

      // We'll use the API to create seed data
      // For now, let's just show a toast that this feature needs backend implementation
      // or implement a client-side seeder if preferred.
      // Assuming there is an endpoint or utility for this:
      const response = await fetch('/api/rrhh/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: orgId, type: 'personnel' }),
      });

      if (response.ok) {
        // Recargar datos después del seed
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

  const getStatusVariant = (
    status?: string
  ): 'success' | 'warning' | 'secondary' => {
    switch (status?.toLowerCase()) {
      case 'activo':
        return 'success';
      case 'licencia':
        return 'warning';
      case 'inactivo':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getInitials = (nombres: string, apellidos: string) => {
    return `${nombres.charAt(0)}${apellidos.charAt(0)}`;
  };

  const stats = useMemo(() => {
    const total = personnel.length;
    const activos = personnel.filter(p => p.estado === 'Activo').length;
    const licencia = personnel.filter(p => p.estado === 'Licencia').length;
    const departamentos = new Set(
      personnel.map(p => p.departamento).filter(Boolean)
    ).size;

    return { total, activos, licencia, departamentos };
  }, [personnel]);

  const statusCounts = useMemo(
    () => ({
      all: personnel.length,
      activo: personnel.filter(p => p.estado === 'Activo').length,
      licencia: personnel.filter(p => p.estado === 'Licencia').length,
    }),
    [personnel]
  );

  const accessCounts = useMemo(
    () => ({
      all: personnel.length,
      with_access: personnel.filter(p => p.tiene_acceso_sistema).length,
      without_access: personnel.filter(p => !p.tiene_acceso_sistema).length,
    }),
    [personnel]
  );

  const summaryTags = useMemo(() => {
    const statusLabelMap: Record<string, string> = {
      all: 'Estado: Todos',
      activo: 'Estado: Activos',
      licencia: 'Estado: Licencia',
    };

    const accessLabelMap: Record<string, string> = {
      all: 'Acceso: Todos',
      with_access: 'Acceso: Con acceso',
      without_access: 'Acceso: Sin acceso',
    };

    return [
      {
        label: statusLabelMap[selectedStatus] || 'Estado: Todos',
        color: 'blue',
      },
      {
        label: accessLabelMap[accessFilter] || 'Acceso: Todos',
        color: 'green',
      },
      {
        label: viewMode === 'grid' ? 'Vista: Cards' : 'Vista: Tabla',
        color: 'purple',
      },
    ] as const;
  }, [selectedStatus, accessFilter, viewMode]);

  const emptyState = (
    <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
      <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground">
        No hay empleados registrados
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Empieza creando un nuevo empleado o importa datos de prueba.
      </p>
      <div className="mt-6 flex justify-center gap-4">
        <Button
          onClick={() => {
            setSelectedPersonnel(null);
            setShowForm(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Crear Empleado
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

  const filterOptions = (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Estado
        </p>
        <TabPanel
          variant="pills"
          tabs={[
            { id: 'all', label: 'Todos', badge: statusCounts.all },
            { id: 'activo', label: 'Activos', badge: statusCounts.activo },
            { id: 'licencia', label: 'Licencia', badge: statusCounts.licencia },
          ]}
          activeTab={selectedStatus}
          onChange={setSelectedStatus}
          className="w-full overflow-x-auto"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Acceso al sistema
        </p>
        <TabPanel
          variant="pills"
          tabs={[
            { id: 'all', label: 'Todos', badge: accessCounts.all },
            {
              id: 'with_access',
              label: 'Con acceso',
              icon: <ShieldCheck className="h-4 w-4" />,
              badge: accessCounts.with_access,
            },
            {
              id: 'without_access',
              label: 'Sin acceso',
              icon: <ShieldX className="h-4 w-4" />,
              badge: accessCounts.without_access,
            },
          ]}
          activeTab={accessFilter}
          onChange={tab => setAccessFilter(tab as typeof accessFilter)}
          className="w-full overflow-x-auto"
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-muted-foreground">
          Filtros activos de la vista
        </span>
        <div className="min-w-0">
          <InlineTagList tags={[...summaryTags]} maxVisible={4} />
        </div>
      </div>
    </div>
  );

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(person => {
      const matchesSearch =
        person.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.puesto?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' ||
        person.estado?.toLowerCase() === selectedStatus.toLowerCase();

      const matchesAccess =
        accessFilter === 'all' ||
        (accessFilter === 'with_access' && person.tiene_acceso_sistema) ||
        (accessFilter === 'without_access' && !person.tiene_acceso_sistema);

      return matchesSearch && matchesStatus && matchesAccess;
    });
  }, [personnel, searchTerm, selectedStatus, accessFilter]);

  const handleNewPersonnel = useCallback(() => {
    setSelectedPersonnel(null);
    setShowForm(true);
    onNewPersonnel?.();
  }, [onNewPersonnel]);

  const handleFormSuccess = useCallback(
    async (data: PersonnelFormData) => {
      try {
        const orgId = sessionStorage.getItem('organization_id');
        if (!orgId) throw new Error('No organization ID found');

        if (selectedPersonnel) {
          await fetch(`/api/rrhh/personnel/${selectedPersonnel.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          toast({
            title: 'Éxito',
            description: 'Empleado actualizado correctamente',
          });
        } else {
          await fetch('/api/rrhh/personnel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, organization_id: orgId }),
          });
          toast({
            title: 'Éxito',
            description: 'Empleado creado correctamente',
          });
        }
        setShowForm(false);
        fetchData();
      } catch (error) {
        console.error('Error saving personnel:', error);
        toast({
          title: 'Error',
          description: 'No se pudo guardar el empleado',
          variant: 'destructive',
        });
      }
    },
    [selectedPersonnel, fetchData, toast]
  );

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleEditPersonnel = useCallback(
    (personnel: Personnel) => {
      setSelectedPersonnel(personnel);
      setShowForm(true);
      onEditPersonnel?.(personnel);
    },
    [onEditPersonnel]
  );

  const handleDeleteClick = useCallback((personnel: Personnel) => {
    setPersonnelToDelete(personnel);
    setShowDeleteAlert(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (personnelToDelete) {
      try {
        await fetch(`/api/rrhh/personnel/${personnelToDelete.id}`, {
          method: 'DELETE',
        });
        toast({
          title: 'Éxito',
          description: `Empleado "${personnelToDelete.nombres} ${personnelToDelete.apellidos}" eliminado.`,
        });
        fetchData();
      } catch (error) {
        console.error('Error deleting personnel:', error);
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el empleado',
          variant: 'destructive',
        });
      } finally {
        setShowDeleteAlert(false);
        setPersonnelToDelete(null);
      }
    }
  }, [personnelToDelete, fetchData, toast]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteAlert(false);
    setPersonnelToDelete(null);
  }, []);

  const handleViewDetails = useCallback(
    (personnel: Personnel) => {
      router.push(`/rrhh/personal/${personnel.id}`);
    },
    [router]
  );

  const renderContent = useMemo(() => {
    if (isLoading) {
      return (
        <ListGrid
          data={[...Array(6)].map((_, i) => ({ id: `skeleton-${i}` }))}
          renderItem={() => (
            <div className="bg-card border border-border/50 rounded-xl p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
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
          data={filteredPersonnel}
          renderItem={person => (
            <DomainCard
              key={person.id}
              title={`${person.nombres} ${person.apellidos}`}
              subtitle={person.puesto || 'Sin puesto'}
              leading={
                <Avatar className="w-10 h-10">
                  <AvatarImage
                    src={person.foto || undefined}
                    alt={`${person.nombres} ${person.apellidos}`}
                  />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                    {getInitials(person.nombres, person.apellidos)}
                  </AvatarFallback>
                </Avatar>
              }
              status={{
                label: person.estado || 'N/A',
                variant: getStatusVariant(person.estado),
              }}
              meta={
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">
                      {person.departamento || 'Sin departamento'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {person.fecha_contratacion
                        ? new Date(
                            person.fecha_contratacion
                          ).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              }
              actions={[
                {
                  label: 'Ver Detalles',
                  icon: <Eye className="h-4 w-4" />,
                  onClick: () => handleViewDetails(person),
                },
                {
                  label: 'Editar',
                  icon: <Edit className="h-4 w-4" />,
                  onClick: () => handleEditPersonnel(person),
                },
                {
                  label: 'Eliminar',
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: () => handleDeleteClick(person),
                  variant: 'destructive',
                },
              ]}
              onClick={() => handleViewDetails(person)}
            >
              <div className="mt-2 space-y-2">
                <div className="text-xs text-muted-foreground">
                  {person.email}
                </div>
                <InlineTagList
                  tags={[
                    {
                      label: `Tipo: ${person.tipo_personal || 'N/A'}`,
                      color: 'indigo',
                    },
                    {
                      label: person.tiene_acceso_sistema
                        ? 'Con acceso'
                        : 'Sin acceso',
                      color: person.tiene_acceso_sistema ? 'green' : 'gray',
                    },
                  ]}
                  maxVisible={3}
                />
              </div>
            </DomainCard>
          )}
          keyExtractor={person => person.id}
          columns={4}
          emptyState={emptyState}
        />
      );
    }

    return (
      <ListTable
        data={filteredPersonnel}
        columns={[
          {
            header: 'Empleado',
            cell: person => (
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={person.foto || undefined}
                    alt={`${person.nombres} ${person.apellidos}`}
                  />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                    {getInitials(person.nombres, person.apellidos)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {person.nombres} {person.apellidos}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {person.email}
                  </p>
                </div>
              </div>
            ),
          },
          {
            header: 'Puesto',
            cell: person => (
              <span className="text-muted-foreground truncate max-w-[150px] block">
                {person.puesto || 'N/A'}
              </span>
            ),
          },
          {
            header: 'Departamento',
            cell: person => (
              <span className="text-muted-foreground truncate max-w-[150px] block">
                {person.departamento || 'N/A'}
              </span>
            ),
          },
          {
            header: 'Estado',
            cell: person => (
              <div className="flex items-center gap-2">
                <BaseBadge variant={getStatusVariant(person.estado)}>
                  {person.estado || 'N/A'}
                </BaseBadge>
                <BaseBadge
                  variant={person.tiene_acceso_sistema ? 'success' : 'outline'}
                >
                  {person.tiene_acceso_sistema ? 'Con acceso' : 'Sin acceso'}
                </BaseBadge>
              </div>
            ),
          },
          {
            header: 'Fecha Ingreso',
            cell: person => (
              <span className="text-muted-foreground">
                {person.fecha_contratacion
                  ? new Date(person.fecha_contratacion).toLocaleDateString(
                      'es-ES'
                    )
                  : 'N/A'}
              </span>
            ),
          },
          {
            header: 'Acciones',
            cell: person => (
              <div className="flex justify-end space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation();
                    handleViewDetails(person);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation();
                    handleEditPersonnel(person);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteClick(person);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        keyExtractor={person => person.id}
        onRowClick={handleViewDetails}
        emptyState={emptyState}
      />
    );
  }, [
    filteredPersonnel,
    isLoading,
    viewMode,
    handleNewPersonnel,
    handleEditPersonnel,
    handleDeleteClick,
    handleViewDetails,
    handleSeedData,
    emptyState,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gestión de Personal"
        subtitle="Administra el personal de la organización según ISO 9001"
        breadcrumbs={[{ label: 'RRHH', href: '/rrhh' }, { label: 'Personal' }]}
      >
        <div className="flex items-center gap-2">
          <ContextHelpButton route="/rrhh/personal" />
          <ModuleMaturityButton moduleKey="personal" />
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={handleNewPersonnel}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Empleado
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <Section title="Estadisticas" description="Resumen del personal">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPIStatCard
            label="TOTAL DE PERSONAL"
            value={String(stats.total)}
            icon={<Users className="w-5 h-5" />}
            subtext="Base consolidada"
          />
          <KPIStatCard
            label="PERSONAL ACTIVO"
            value={String(stats.activos)}
            icon={<UserCheck className="w-5 h-5" />}
            progress={{
              value:
                stats.total > 0
                  ? Math.round((stats.activos / stats.total) * 100)
                  : 0,
              label: 'Porcentaje activo',
              color: 'success',
            }}
          />
          <KPIStatCard
            label="EN LICENCIA"
            value={String(stats.licencia)}
            icon={<Clock className="w-5 h-5" />}
            progress={{
              value:
                stats.total > 0
                  ? Math.round((stats.licencia / stats.total) * 100)
                  : 0,
              label: 'Sobre dotacion total',
              color: 'warning',
            }}
          />
          <KPIStatCard
            label="DEPARTAMENTOS"
            value={String(stats.departamentos)}
            icon={<Building2 className="w-5 h-5" />}
            subtext="Con personal asignado"
          />
        </div>
      </Section>

      {/* Toolbar with filters */}
      <PageToolbar
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder="Buscar empleados..."
        viewMode={viewMode}
        onViewModeChange={mode => setViewMode(mode as any)}
        supportedViews={['list', 'grid']}
        filterOptions={filterOptions}
      />

      <Section>{renderContent}</Section>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <PersonnelForm
              initialData={selectedPersonnel}
              onSubmit={handleFormSuccess}
              onCancel={handleFormCancel}
            />
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
              al empleado{' '}
              <span className="font-semibold">
                {personnelToDelete?.nombres} {personnelToDelete?.apellidos}
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
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
