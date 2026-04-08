'use client';

import {
  BaseBadge,
  PageHeader,
  PageToolbar,
  ViewMode,
} from '@/components/design-system';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { ListGrid } from '@/components/design-system/patterns/lists';
import { CompetenceFormDialog } from '@/components/rrhh/CompetenceFormDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Competence } from '@/types/rrhh';
import {
  BookOpen,
  Briefcase,
  Eye,
  FileText,
  Plus,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function CompetenciasPage() {
  const router = useRouter();
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchCompetences();
  }, []);

  const fetchCompetences = async () => {
    try {
      const response = await fetch('/api/rrhh/competencias');
      if (response.ok) {
        const data = await response.json();
        setCompetences(data);
      }
    } catch (error) {
      console.error('Error fetching competences:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompetences = useMemo(() => {
    return competences.filter(competence => {
      const matchesSearch =
        competence.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (competence.descripcion &&
          competence.descripcion
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));

      const matchesCategory =
        categoryFilter === 'all' || competence.categoria === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [competences, searchTerm, categoryFilter]);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/rrhh/competencias/${id}`);
    },
    [router]
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta competencia?')) return;

    try {
      const response = await fetch(`/api/rrhh/competencias/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCompetences(prev => prev.filter(comp => comp.id !== id));
      }
    } catch (error) {
      console.error('Error deleting competence:', error);
    }
  }, []);

  const getCategoryIcon = (categoria: string) => {
    switch (categoria) {
      case 'tecnica':
        return <Briefcase className="h-5 w-5" />;
      case 'blanda':
        return <Users className="h-5 w-5" />;
      case 'seguridad':
        return <Shield className="h-5 w-5" />;
      case 'iso_9001':
        return <FileText className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getCategoryText = (categoria: string) => {
    switch (categoria) {
      case 'tecnica':
        return 'Técnica';
      case 'blanda':
        return 'Blanda';
      case 'seguridad':
        return 'Seguridad';
      case 'iso_9001':
        return 'ISO 9001';
      default:
        return 'Otra';
    }
  };

  const getCategoryVariant = (
    categoria: string
  ):
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning' => {
    switch (categoria) {
      case 'tecnica':
        return 'default';
      case 'blanda':
        return 'secondary';
      case 'seguridad':
        return 'destructive';
      case 'iso_9001':
        return 'success';
      default:
        return 'outline';
    }
  };

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
          title="Competencias"
          description="Gestión del catálogo maestro de competencias"
          breadcrumbs={[
            { label: 'RRHH', href: '/rrhh' },
            { label: 'Competencias' },
          ]}
          actions={
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Competencia
            </Button>
          }
        />

        {/* Toolbar */}
        <PageToolbar
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={mode => setViewMode(mode)}
          supportedViews={['grid', 'list']}
          searchPlaceholder="Buscar competencias..."
          filterOptions={
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="tecnica">Técnica</SelectItem>
                <SelectItem value="blanda">Blanda</SelectItem>
                <SelectItem value="seguridad">Seguridad</SelectItem>
                <SelectItem value="iso_9001">ISO 9001</SelectItem>
                <SelectItem value="otra">Otra</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Content */}
        {filteredCompetences.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No hay competencias
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando tu primera competencia
            </p>
            <div className="mt-6">
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Competencia
              </Button>
            </div>
          </div>
        ) : (
          <ListGrid
            data={filteredCompetences}
            keyExtractor={competence => competence.id}
            renderItem={competence => (
              <DomainCard
                key={competence.id}
                title={competence.nombre}
                subtitle={competence.fuente?.replace('_', ' ')}
                status={{
                  label: getCategoryText(competence.categoria),
                  variant: getCategoryVariant(competence.categoria),
                }}
                meta={
                  <BaseBadge
                    variant={competence.activo ? 'success' : 'secondary'}
                  >
                    {competence.activo ? 'Activa' : 'Inactiva'}
                  </BaseBadge>
                }
                actions={[
                  {
                    label: 'Ver',
                    icon: <Eye className="h-4 w-4" />,
                    onClick: () => handleView(competence.id),
                  },
                  {
                    label: 'Eliminar',
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => handleDelete(competence.id),
                    variant: 'destructive',
                  },
                ]}
                onClick={() => handleView(competence.id)}
              >
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {competence.descripcion || 'Sin descripción'}
                </p>
              </DomainCard>
            )}
          />
        )}

        <CompetenceFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={fetchCompetences}
        />
      </div>
    </div>
  );
}
