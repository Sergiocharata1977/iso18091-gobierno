'use client';

import {
  BaseBadge,
  BaseCard,
  DomainCard,
  ListGrid,
  ListTable,
  PageHeader,
  PageToolbar,
  Section,
  UnifiedKanban,
} from '@/components/design-system';
import { ProcessDefinitionFormDialog } from '@/components/processRecords/ProcessDefinitionFormDialog';
import { Button } from '@/components/ui/button';
import { ProcessDefinition } from '@/types/processRecords';
import {
  Edit,
  FileText,
  FolderKanban,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

const CATEGORY_OPTIONS = [
  {
    value: 'calidad',
    label: 'Calidad',
    colorClass: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'auditoria',
    label: 'Auditoria',
    colorClass: 'bg-green-100 text-green-800',
  },
  {
    value: 'mejora',
    label: 'Mejora',
    colorClass: 'bg-orange-100 text-orange-800',
  },
  { value: 'rrhh', label: 'RRHH', colorClass: 'bg-purple-100 text-purple-800' },
  {
    value: 'produccion',
    label: 'Produccion',
    colorClass: 'bg-red-100 text-red-800',
  },
  {
    value: 'ventas',
    label: 'Ventas',
    colorClass: 'bg-indigo-100 text-indigo-800',
  },
  {
    value: 'logistica',
    label: 'Logistica',
    colorClass: 'bg-yellow-100 text-yellow-800',
  },
  {
    value: 'compras',
    label: 'Compras',
    colorClass: 'bg-pink-100 text-pink-800',
  },
] as const;

type CategoryFilter = 'all' | (typeof CATEGORY_OPTIONS)[number]['value'];
type ViewMode = 'grid' | 'list' | 'kanban';

export default function ProcessDefinitionsPage() {
  const router = useRouter();

  const [processDefinitions, setProcessDefinitions] = useState<
    ProcessDefinition[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingDefinition, setEditingDefinition] =
    useState<ProcessDefinition | null>(null);
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>('all');

  const categoryMap = useMemo(() => {
    return CATEGORY_OPTIONS.reduce(
      (acc, item) => {
        acc[item.value] = item;
        return acc;
      },
      {} as Record<
        (typeof CATEGORY_OPTIONS)[number]['value'],
        (typeof CATEGORY_OPTIONS)[number]
      >
    );
  }, []);

  const getCategoryMeta = useCallback(
    (categoria: string) => {
      const key = categoria as (typeof CATEGORY_OPTIONS)[number]['value'];
      return (
        categoryMap[key] || {
          value: 'none',
          label: 'General',
          colorClass: 'bg-slate-100 text-slate-700',
        }
      );
    },
    [categoryMap]
  );

  const formatDate = useCallback((value?: ProcessDefinition['created_at']) => {
    if (!value) return 'N/A';

    if (value instanceof Date) {
      return value.toLocaleDateString('es-AR');
    }

    if (typeof value === 'object' && value && 'seconds' in value) {
      return new Date(value.seconds * 1000).toLocaleDateString('es-AR');
    }

    return 'N/A';
  }, []);

  const fetchDefinitions = useCallback(async () => {
    try {
      const response = await fetch('/api/process-definitions');
      if (response.ok) {
        const definitions = await response.json();
        setProcessDefinitions(definitions || []);
      }
    } catch (error) {
      console.error('Error al cargar definiciones:', error);
    }
  }, []);

  const handleSeedData = useCallback(async () => {
    try {
      const response = await fetch('/api/processes/seed-massive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        await fetchDefinitions();
        alert(
          `Datos de procesos agregados:\n\n- ${result.data.definitionsCreated} definiciones\n- ${result.data.recordsCreated} registros\n- ${result.data.kanbanBoardsCreated} tableros Kanban`
        );
      } else {
        alert('Error al agregar datos de prueba');
      }
    } catch (error) {
      console.error('Error al sembrar datos:', error);
      alert('Error al agregar datos de prueba');
    }
  }, [fetchDefinitions]);

  const handleCheckData = useCallback(async () => {
    try {
      const response = await fetch('/api/processes/check', {
        method: 'GET',
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `Datos encontrados:\n- Definiciones: ${result.data.processDefinitions.count}\n- Registros: ${result.data.processRecords.count}\n- Listas Kanban: ${result.data.kanbanLists.count}\n- Tarjetas: ${result.data.kanbanCards.count}`
        );
      } else {
        alert('Error al verificar datos');
      }
    } catch (error) {
      console.error('Error al verificar datos:', error);
      alert('Error al verificar datos');
    }
  }, []);

  const handleClearData = useCallback(async () => {
    if (
      confirm(
        'Estas seguro de que quieres eliminar todos los datos de procesos?'
      )
    ) {
      try {
        const response = await fetch('/api/processes/seed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'clear' }),
        });

        if (response.ok) {
          setProcessDefinitions([]);
          alert('Datos eliminados exitosamente');
        } else {
          alert('Error al eliminar datos');
        }
      } catch (error) {
        console.error('Error al eliminar datos:', error);
        alert('Error al eliminar datos');
      }
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDefinitions();
      setLoading(false);
    };

    loadData();
  }, [fetchDefinitions]);

  const filteredDefinitions = useMemo(() => {
    return processDefinitions.filter(definition => {
      const normalizedSearch = searchTerm.toLowerCase();
      const matchesSearch =
        (definition.nombre?.toLowerCase() || '').includes(normalizedSearch) ||
        (definition.descripcion?.toLowerCase() || '').includes(
          normalizedSearch
        ) ||
        (definition.codigo?.toLowerCase() || '').includes(normalizedSearch);

      const matchesCategory =
        filterCategory === 'all' || definition.categoria === filterCategory;

      return matchesSearch && matchesCategory;
    });
  }, [processDefinitions, searchTerm, filterCategory]);

  const stats = useMemo(() => {
    return {
      total: processDefinitions.length,
      active: processDefinitions.filter(item => item.activo).length,
      inactive: processDefinitions.filter(item => !item.activo).length,
      filtered: filteredDefinitions.length,
    };
  }, [processDefinitions, filteredDefinitions]);

  const kanbanColumns = useMemo(() => {
    const baseColumns = CATEGORY_OPTIONS.map(category => ({
      id: category.value,
      title: category.label,
      color: category.colorClass,
    }));

    return [
      ...baseColumns,
      {
        id: 'sin_categoria',
        title: 'Sin categoria',
        color: 'bg-slate-100 text-slate-700',
      },
    ];
  }, []);

  const kanbanItems = useMemo(() => {
    return filteredDefinitions.map(definition => ({
      id: definition.id,
      title: definition.nombre,
      subtitle:
        definition.codigo || definition.descripcion || 'Sin descripcion',
      status: definition.categoria || 'sin_categoria',
      tags: [definition.activo ? 'Activo' : 'Inactivo'],
      dueDate: definition.created_at
        ? definition.created_at instanceof Date
          ? definition.created_at
          : new Date(definition.created_at.seconds * 1000)
        : undefined,
      meta: definition,
    }));
  }, [filteredDefinitions]);

  const openDetails = useCallback(
    (id: string) => {
      router.push(`/procesos/definiciones/${id}`);
    },
    [router]
  );

  const handleEditDefinition = useCallback((definition: ProcessDefinition) => {
    setEditingDefinition(definition);
    setShowFormDialog(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    fetchDefinitions();
    setEditingDefinition(null);
    setShowFormDialog(false);
  }, [fetchDefinitions]);

  const handleFormClose = useCallback(() => {
    setShowFormDialog(false);
    setEditingDefinition(null);
  }, []);

  const emptyState = (
    <BaseCard className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <FileText className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        No hay definiciones de procesos
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Crea tu primera definicion o carga datos de prueba para comenzar.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowFormDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear definicion
        </Button>
        <Button variant="outline" onClick={handleSeedData}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar datos de prueba
        </Button>
        <Button variant="outline" onClick={handleCheckData}>
          <Search className="mr-2 h-4 w-4" />
          Verificar datos
        </Button>
        <Button variant="outline" onClick={handleClearData}>
          <Trash2 className="mr-2 h-4 w-4" />
          Limpiar datos
        </Button>
      </div>
    </BaseCard>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Definiciones de Procesos"
        subtitle="Gestiona las definiciones de procesos del sistema ISO 9001"
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Procesos', href: '/procesos' },
          { label: 'Definiciones' },
        ]}
      >
        <div className="flex items-center gap-2">
          <Link href="/procesos/registros">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Ver Registros
            </Button>
          </Link>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setShowFormDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Definicion
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BaseCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FolderKanban className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </BaseCard>

        <BaseCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activas</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </BaseCard>

        <BaseCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inactivas</p>
              <p className="text-2xl font-bold">{stats.inactive}</p>
            </div>
          </div>
        </BaseCard>

        <BaseCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Search className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Visibles</p>
              <p className="text-2xl font-bold">{stats.filtered}</p>
            </div>
          </div>
        </BaseCard>
      </div>

      <PageToolbar
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={mode => setViewMode(mode as ViewMode)}
        supportedViews={['grid', 'list', 'kanban']}
        searchPlaceholder="Buscar por nombre, descripcion o codigo..."
        filterOptions={
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={e =>
                setFilterCategory(e.target.value as CategoryFilter)
              }
              className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todas las categorias</option>
              {CATEGORY_OPTIONS.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <Section>
        {loading ? (
          <ListGrid
            data={[1, 2, 3, 4, 5, 6]}
            keyExtractor={item => item}
            renderItem={item => (
              <BaseCard key={item} className="h-44 animate-pulse bg-muted/40">
                <div />
              </BaseCard>
            )}
          />
        ) : viewMode === 'grid' ? (
          <ListGrid
            data={filteredDefinitions}
            keyExtractor={item => item.id}
            emptyState={emptyState}
            renderItem={definition => {
              const category = getCategoryMeta(definition.categoria || '');

              return (
                <DomainCard
                  title={definition.nombre}
                  subtitle={definition.descripcion || 'Sin descripcion'}
                  status={{
                    label: definition.activo ? 'Activo' : 'Inactivo',
                    variant: definition.activo ? 'success' : 'secondary',
                  }}
                  onClick={() => openDetails(definition.id)}
                  meta={
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Codigo
                        </span>
                        <span className="text-xs font-mono text-foreground">
                          {definition.codigo || 'N/A'}
                        </span>
                      </div>
                      <BaseBadge
                        variant="outline"
                        className={category.colorClass}
                      >
                        {category.label}
                      </BaseBadge>
                    </div>
                  }
                  actions={[
                    {
                      label: 'Ver detalle',
                      icon: <FileText className="h-4 w-4" />,
                      onClick: () => openDetails(definition.id),
                      variant: 'ghost',
                    },
                    {
                      label: 'Editar',
                      icon: <Edit className="h-4 w-4" />,
                      onClick: () => handleEditDefinition(definition),
                      variant: 'ghost',
                    },
                  ]}
                />
              );
            }}
          />
        ) : viewMode === 'list' ? (
          <ListTable
            data={filteredDefinitions}
            keyExtractor={item => item.id}
            emptyState={emptyState}
            onRowClick={item => openDetails(item.id)}
            columns={[
              {
                header: 'Definicion',
                cell: definition => (
                  <div>
                    <p className="font-medium text-foreground">
                      {definition.nombre}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {definition.descripcion || 'Sin descripcion'}
                    </p>
                  </div>
                ),
              },
              {
                header: 'Codigo',
                cell: definition => (
                  <span className="font-mono text-xs text-muted-foreground">
                    {definition.codigo || 'N/A'}
                  </span>
                ),
              },
              {
                header: 'Categoria',
                cell: definition => {
                  const category = getCategoryMeta(definition.categoria || '');
                  return (
                    <BaseBadge
                      variant="outline"
                      className={category.colorClass}
                    >
                      {category.label}
                    </BaseBadge>
                  );
                },
              },
              {
                header: 'Estado',
                cell: definition => (
                  <BaseBadge
                    variant={definition.activo ? 'success' : 'secondary'}
                  >
                    {definition.activo ? 'Activo' : 'Inactivo'}
                  </BaseBadge>
                ),
              },
              {
                header: 'Creado',
                cell: definition => (
                  <span className="text-sm text-muted-foreground">
                    {formatDate(definition.created_at)}
                  </span>
                ),
              },
              {
                header: 'Acciones',
                className: 'text-right',
                cell: definition => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      handleEditDefinition(definition);
                    }}
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <>
            {kanbanItems.length === 0 ? (
              emptyState
            ) : (
              <UnifiedKanban
                columns={kanbanColumns}
                items={kanbanItems}
                onItemMove={() => {
                  // Esta vista es solo para organizacion visual; no persiste cambios de estado.
                }}
                onItemClick={item => openDetails(item.id)}
              />
            )}
          </>
        )}
      </Section>

      <ProcessDefinitionFormDialog
        open={showFormDialog}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editData={editingDefinition}
      />
    </div>
  );
}
