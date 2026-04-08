'use client';

import { ListGrid, ListTable, PageToolbar } from '@/components/design-system';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { BaseBadge } from '@/components/design-system/primitives/BaseBadge';
import { Button } from '@/components/ui/button';
import { NormPoint } from '@/types/normPoints';
import { Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NormPointsListProps {
  refreshKey?: number;
  onEdit: (point: NormPoint) => void;
}

export function NormPointsList({
  refreshKey = 0,
  onEdit,
}: NormPointsListProps) {
  const [normPoints, setNormPoints] = useState<NormPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    fetchNormPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterFilter, priorityFilter, refreshKey]);

  const fetchNormPoints = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (chapterFilter !== 'all') params.append('chapter', chapterFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      // Ordenar por código para que aparezcan en orden numérico
      params.append('sort', 'code');
      params.append('order', 'asc');
      params.append('limit', '1000'); // Traer todos los puntos

      const response = await fetch(`/api/norm-points?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Ordenar manualmente por código para asegurar orden correcto
        const sortedPoints = (data.data || []).sort(
          (a: NormPoint, b: NormPoint) => {
            const aNum = parseFloat(a.code.replace(/[^\d.]/g, ''));
            const bNum = parseFloat(b.code.replace(/[^\d.]/g, ''));
            return aNum - bNum;
          }
        );
        setNormPoints(sortedPoints);
      }
    } catch (error) {
      console.error('Error fetching norm points:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este punto de norma?')) return;

    try {
      const response = await fetch(`/api/norm-points/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchNormPoints();
      }
    } catch (error) {
      console.error('Error deleting norm point:', error);
    }
  };

  const filteredNormPoints = normPoints.filter(
    np =>
      np.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      np.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      np.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'destructive';
      case 'media':
        return 'warning';
      case 'baja':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const filterOptions = (
    <div className="flex flex-col sm:flex-row gap-2">
      <select
        value={chapterFilter}
        onChange={e => setChapterFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="all">Todos los capítulos</option>
        <option value="4">Capítulo 4</option>
        <option value="5">Capítulo 5</option>
        <option value="6">Capítulo 6</option>
        <option value="7">Capítulo 7</option>
        <option value="8">Capítulo 8</option>
        <option value="9">Capítulo 9</option>
        <option value="10">Capítulo 10</option>
      </select>

      <select
        value={priorityFilter}
        onChange={e => setPriorityFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="all">Todas las prioridades</option>
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </select>
    </div>
  );

  if (loading) {
    return (
      <ListGrid
        data={[...Array(6)].map((_, i) => ({ id: `skeleton-${i}` }))}
        renderItem={() => (
          <div className="bg-card border border-border/50 rounded-xl p-6 animate-pulse h-40" />
        )}
        keyExtractor={item => item.id}
        columns={3}
      />
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="space-y-6">
        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          searchPlaceholder="Buscar por código, título o descripción..."
          viewMode={viewMode}
          onViewModeChange={mode => setViewMode(mode as any)}
          filterOptions={filterOptions}
        />
        <ListGrid
          data={filteredNormPoints}
          renderItem={np => (
            <DomainCard
              key={np.id}
              title={np.code}
              subtitle={np.title}
              status={{
                label: np.is_mandatory ? 'Obligatorio' : 'Opcional',
                variant: np.is_mandatory ? 'destructive' : 'secondary',
              }}
              meta={
                <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-2">
                  <div className="flex justify-between">
                    <span className="capitalize">
                      {np.tipo_norma?.replace('_', ' ')}
                    </span>
                    {np.chapter && <span>Cap. {np.chapter}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Prioridad:</span>
                    <BaseBadge variant={getPriorityVariant(np.priority)}>
                      {np.priority}
                    </BaseBadge>
                  </div>
                </div>
              }
              actions={[
                {
                  label: 'Editar',
                  icon: <Edit className="h-4 w-4" />,
                  onClick: () => onEdit(np),
                },
                {
                  label: 'Eliminar',
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: () => handleDelete(np.id),
                  variant: 'destructive',
                },
              ]}
              onClick={() => onEdit(np)}
            >
              <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {np.description}
              </div>
            </DomainCard>
          )}
          keyExtractor={np => np.id}
          columns={4}
          emptyState={
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron puntos de norma
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageToolbar
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder="Buscar por código, título o descripción..."
        viewMode={viewMode}
        onViewModeChange={mode => setViewMode(mode as any)}
        filterOptions={filterOptions}
      />
      <ListTable
        data={filteredNormPoints}
        columns={[
          {
            header: 'Código',
            cell: np => (
              <span className="font-bold text-emerald-600">{np.code}</span>
            ),
          },
          {
            header: 'Título',
            cell: np => (
              <span className="font-medium text-foreground">{np.title}</span>
            ),
          },
          {
            header: 'Tipo',
            cell: np => (
              <span className="capitalize text-muted-foreground">
                {np.tipo_norma?.replace('_', ' ')}
              </span>
            ),
          },
          {
            header: 'Capítulo',
            cell: np => (
              <span className="text-muted-foreground">{np.chapter || '-'}</span>
            ),
          },
          {
            header: 'Prioridad',
            cell: np => (
              <BaseBadge variant={getPriorityVariant(np.priority)}>
                {np.priority}
              </BaseBadge>
            ),
          },
          {
            header: 'Obligatorio',
            cell: np => (
              <BaseBadge
                variant={np.is_mandatory ? 'destructive' : 'secondary'}
              >
                {np.is_mandatory ? 'Sí' : 'No'}
              </BaseBadge>
            ),
          },
          {
            header: 'Acciones',
            cell: np => (
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    onEdit(np);
                  }}
                  className="hover:bg-muted"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(np.id);
                  }}
                  className="hover:bg-red-100 hover:text-red-700 text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        keyExtractor={np => np.id}
        onRowClick={onEdit}
        emptyState={
          <div className="text-center py-12 text-muted-foreground">
            No se encontraron puntos de norma
          </div>
        }
      />
    </div>
  );
}
