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
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { DepartmentService } from '@/services/rrhh/DepartmentService';
import { Department, DepartmentFormData } from '@/types/rrhh';
import {
  Building2,
  Edit,
  Eye,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DepartmentForm } from './DepartmentForm';

interface DepartmentListingProps {
  onViewDepartment?: (department: Department) => void;
  onEditDepartment?: (department: Department) => void;
  onNewDepartment?: () => void;
}

export const DepartmentListing: React.FC<DepartmentListingProps> = ({
  onViewDepartment,
  onEditDepartment,
  onNewDepartment,
}) => {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const { user } = useAuth();

  // Cargar datos
  const fetchData = useCallback(async () => {
    if (!user?.organization_id) return;

    setLoadingData(true);
    setLocalError(null);

    try {
      console.log('Cargando datos de departamentos...');
      const data = await DepartmentService.getAll(user.organization_id);
      console.log('Datos de departamentos cargados:', data);
      setDepartments(data || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setLocalError(
        'Error al cargar los datos. Por favor, intenta de nuevo más tarde.'
      );
      setDepartments([]);
    } finally {
      setLoadingData(false);
    }
  }, [user?.organization_id]);

  useEffect(() => {
    if (user?.organization_id) {
      fetchData();
    }
  }, [fetchData, user?.organization_id]);

  // Filtrar departamentos
  const filteredDepartments = useMemo(() => {
    if (!searchTerm.trim()) return departments;

    const searchLower = searchTerm.toLowerCase();
    return departments.filter(
      dept =>
        dept.nombre?.toLowerCase().includes(searchLower) ||
        dept.descripcion?.toLowerCase().includes(searchLower)
    );
  }, [departments, searchTerm]);

  // Handlers
  const handleView = useCallback(
    (dept: Department) => {
      router.push(`/rrhh/departments/${dept.id}`);
    },
    [router]
  );

  const handleEdit = useCallback(
    (dept: Department) => {
      setSelectedDepartment(dept);
      setShowForm(true);
      onEditDepartment?.(dept);
    },
    [onEditDepartment]
  );

  const handleDelete = useCallback((dept: Department) => {
    setDepartmentToDelete(dept);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!departmentToDelete) return;

    try {
      await DepartmentService.delete(departmentToDelete.id);
      setDepartments(prev => prev.filter(d => d.id !== departmentToDelete.id));
    } catch (err) {
      console.error('Error al eliminar departamento:', err);
    } finally {
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    }
  }, [departmentToDelete]);

  const handleNewDepartment = useCallback(() => {
    setSelectedDepartment(null);
    setShowForm(true);
    onNewDepartment?.();
  }, [onNewDepartment]);

  const handleFormSuccess = useCallback(
    async (data: DepartmentFormData) => {
      try {
        if (selectedDepartment) {
          // Actualizar departamento existente
          await DepartmentService.update(selectedDepartment.id, data);
        } else {
          // Crear nuevo departamento
          if (!user?.organization_id) {
            throw new Error('Organization ID is required');
          }
          await DepartmentService.create(data, user.organization_id);
        }
        setShowForm(false);
        fetchData(); // Recargar datos
      } catch (error) {
        console.error('Error al guardar departamento:', error);
      }
    },
    [selectedDepartment, fetchData, user?.organization_id]
  );

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setShowDetails(false);
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
        alert('Datos de prueba agregados exitosamente');
      } else {
        const error = await response.json();
        console.error('Error al sembrar datos:', error);
        alert('Error al agregar datos de prueba');
      }
    } catch (error) {
      console.error('Error al sembrar datos:', error);
      alert('Error al agregar datos de prueba');
    }
  }, [fetchData]);

  const handleCheckData = useCallback(async () => {
    try {
      const response = await fetch('/api/seed/rrhh/check', {
        method: 'GET',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Datos en Firebase:', result);
        alert(
          `Datos encontrados:\n- Departamentos: ${result.data.departments.count}\n- Personal: ${result.data.personnel.count}\n- Puestos: ${result.data.positions.count}`
        );
      } else {
        const error = await response.json();
        console.error('Error al verificar datos:', error);
        alert('Error al verificar datos');
      }
    } catch (error) {
      console.error('Error al verificar datos:', error);
      alert('Error al verificar datos');
    }
  }, []);

  const handleDiagnose = useCallback(async () => {
    try {
      const response = await fetch('/api/seed/rrhh/diagnose', {
        method: 'GET',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Diagnóstico completo:', result);
        alert(
          `Diagnóstico Firebase:\n\nProyecto: ${result.firebase.projectId}\nBase de datos: ${result.firebase.databaseType}\n\nDepartamentos: ${result.firebase.collections.departments.count || 0}\nPersonal: ${result.firebase.collections.personnel.count || 0}\nPuestos: ${result.firebase.collections.positions.count || 0}\n\nInstrucciones:\n${result.instructions.firebaseConsole}`
        );
      } else {
        const error = await response.json();
        console.error('Error en diagnóstico:', error);
        alert('Error en diagnóstico');
      }
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      alert('Error en diagnóstico');
    }
  }, []);

  const handleMassiveData = useCallback(async () => {
    try {
      const response = await fetch('/api/seed/rrhh/massive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Datos masivos creados:', result);
        await fetchData();
        alert(
          `Datos masivos creados exitosamente:\n\n- ${result.created.departments} departamentos\n- ${result.created.personnel} empleados\n- ${result.created.positions} puestos`
        );
      } else {
        const error = await response.json();
        console.error('Error al crear datos masivos:', error);
        alert('Error al crear datos masivos');
      }
    } catch (error) {
      console.error('Error al crear datos masivos:', error);
      alert('Error al crear datos masivos');
    }
  }, [fetchData]);

  // Función para obtener variante del badge
  const getEstadoVariant = (isActive: boolean): 'success' | 'secondary' => {
    return isActive ? 'success' : 'secondary';
  };

  // Empty state personalizado
  const emptyState = (
    <div className="text-center py-12">
      <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-2 text-sm font-medium text-foreground">
        {searchTerm
          ? 'No se encontraron departamentos'
          : 'No hay departamentos registrados'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {searchTerm
          ? 'No se encontraron resultados que coincidan con tu búsqueda.'
          : 'Comienza agregando el primer departamento.'}
      </p>
      {!searchTerm && (
        <div className="mt-6 flex gap-4 justify-center flex-wrap">
          <Button
            onClick={handleNewDepartment}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Departamento
          </Button>
          <Button
            onClick={handleSeedData}
            variant="outline"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Datos de Prueba
          </Button>
          <Button
            onClick={handleCheckData}
            variant="outline"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Search className="mr-2 h-4 w-4" />
            Verificar Datos
          </Button>
          <Button
            onClick={handleDiagnose}
            variant="outline"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Search className="mr-2 h-4 w-4" />
            Diagnóstico
          </Button>
          <Button
            onClick={handleMassiveData}
            variant="outline"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Datos Masivos
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header con Design System */}
      <PageHeader
        title="Gestión de Departamentos"
        subtitle="Administra los departamentos de la organización"
        breadcrumbs={[
          { label: 'RRHH', href: '/rrhh' },
          { label: 'Departamentos' },
        ]}
      >
        <Button
          onClick={handleNewDepartment}
          className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Departamento
        </Button>
      </PageHeader>

      {/* Toolbar con Design System */}
      <PageToolbar
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder="Buscar departamentos..."
        viewMode={viewMode}
        onViewModeChange={mode => setViewMode(mode as any)}
        supportedViews={['list', 'grid']}
      />

      {/* Content con Design System */}
      <Section>
        {loadingData ? (
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
        ) : viewMode === 'grid' ? (
          <ListGrid
            data={filteredDepartments}
            renderItem={dept => (
              <DomainCard
                key={dept.id}
                title={dept.nombre}
                subtitle={`ID: ${dept.id?.substring(0, 8)}...`}
                status={{
                  label: dept.is_active ? 'Activo' : 'Inactivo',
                  variant: getEstadoVariant(dept.is_active),
                }}
                meta={
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>0 empleados</span>
                  </div>
                }
                actions={[
                  {
                    label: 'Ver Detalles',
                    icon: <Eye className="h-4 w-4" />,
                    onClick: () => handleView(dept),
                  },
                  {
                    label: 'Editar',
                    icon: <Edit className="h-4 w-4" />,
                    onClick: () => handleEdit(dept),
                  },
                  {
                    label: 'Eliminar',
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => handleDelete(dept),
                    variant: 'destructive',
                  },
                ]}
                onClick={() => handleView(dept)}
              >
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                  {dept.descripcion || 'Sin descripción'}
                </p>
              </DomainCard>
            )}
            keyExtractor={dept => dept.id}
            columns={3}
            emptyState={emptyState}
          />
        ) : (
          <ListTable
            data={filteredDepartments}
            columns={[
              {
                header: 'Nombre',
                cell: dept => (
                  <div className="text-sm font-medium text-foreground">
                    {dept.nombre}
                  </div>
                ),
              },
              {
                header: 'Descripción',
                cell: dept => (
                  <div className="text-sm text-muted-foreground truncate max-w-xs">
                    {dept.descripcion || 'Sin descripción'}
                  </div>
                ),
              },
              {
                header: 'Empleados',
                cell: () => (
                  <div className="text-sm text-muted-foreground">
                    0 empleados
                  </div>
                ),
              },
              {
                header: 'Estado',
                cell: dept => (
                  <BaseBadge variant={getEstadoVariant(dept.is_active)}>
                    {dept.is_active ? 'Activo' : 'Inactivo'}
                  </BaseBadge>
                ),
              },
              {
                header: 'Fecha de Creación',
                cell: dept => (
                  <div className="text-sm text-muted-foreground">
                    {new Date(dept.created_at).toLocaleDateString('es-ES')}
                  </div>
                ),
              },
              {
                header: 'Acciones',
                cell: dept => (
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={e => {
                        e.stopPropagation();
                        handleView(dept);
                      }}
                      aria-label={`Ver detalles de ${dept.nombre}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={e => {
                        e.stopPropagation();
                        handleEdit(dept);
                      }}
                      aria-label={`Editar ${dept.nombre}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(dept);
                      }}
                      className="text-destructive hover:text-destructive"
                      aria-label={`Eliminar ${dept.nombre}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
            keyExtractor={dept => dept.id}
            onRowClick={dept => handleView(dept)}
            emptyState={emptyState}
          />
        )}
      </Section>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <DepartmentForm
              initialData={selectedDepartment}
              onSubmit={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}

      {/* Dialog de confirmación para eliminar */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">
              ¿Estás completamente seguro?
            </h3>
            <p className="text-muted-foreground mb-6">
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              departamento{' '}
              <span className="font-semibold text-foreground">
                {departmentToDelete?.nombre}
              </span>
              .
            </p>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Sí, eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
