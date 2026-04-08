'use client';

import {
  BaseBadge,
  PageHeader,
  PageToolbar,
  ViewMode,
} from '@/components/design-system';
import { DomainCard } from '@/components/design-system/patterns/cards/DomainCard';
import { ListGrid } from '@/components/design-system/patterns/lists';
import { EvaluationFormDialog } from '@/components/rrhh/EvaluationFormDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PerformanceEvaluation } from '@/types/rrhh';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Award, Calendar, Eye, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function EvaluationListing() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/rrhh/evaluations');
      if (!response.ok) {
        throw new Error('Error al cargar evaluaciones');
      }
      const data = await response.json();
      setEvaluations(data);
    } catch (err) {
      console.error('Error al cargar evaluaciones:', err);
      setError('Error al cargar las evaluaciones');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      const matchesSearch =
        e.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.periodo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.personnel_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || e.estado === statusFilter;
      const matchesResult =
        resultFilter === 'all' || e.resultado_global === resultFilter;

      return matchesSearch && matchesStatus && matchesResult;
    });
  }, [evaluations, searchTerm, statusFilter, resultFilter]);

  const handleEdit = useCallback(
    (id: string) => {
      // For now using the same route as view, but could be different
      router.push(`/dashboard/rrhh/evaluations/${id}`);
    },
    [router]
  );

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta evaluación?')) return;

    try {
      const response = await fetch(`/api/rrhh/evaluations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al eliminar');
      loadEvaluations();
    } catch (err) {
      console.error('Error al eliminar evaluación:', err);
      setError('Error al eliminar la evaluación');
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
      case 'publicado':
        return 'success';
      case 'cerrado':
        return 'secondary';
      case 'borrador':
      default:
        return 'outline';
    }
  };

  const getResultVariant = (
    result?: string
  ): 'default' | 'success' | 'destructive' | 'warning' | 'secondary' => {
    switch (result) {
      case 'Apto':
        return 'success';
      case 'No Apto':
        return 'destructive';
      case 'Requiere Capacitación':
        return 'warning';
      default:
        return 'secondary';
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
    <div className="space-y-6">
      <PageHeader
        title="Evaluaciones de Desempeño"
        description="Gestión de evaluaciones de competencias"
        breadcrumbs={[
          { label: 'RRHH', href: '/rrhh' },
          { label: 'Evaluaciones' },
        ]}
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Evaluación
          </Button>
        }
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 font-medium">Total</p>
            <p className="text-2xl font-bold text-slate-900">
              {evaluations.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 font-medium">Aptos</p>
            <p className="text-2xl font-bold text-emerald-600">
              {evaluations.filter(e => e.resultado_global === 'Apto').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 font-medium">
              Requieren Capacitación
            </p>
            <p className="text-2xl font-bold text-amber-600">
              {
                evaluations.filter(
                  e => e.resultado_global === 'Requiere Capacitación'
                ).length
              }
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 font-medium">No Aptos</p>
            <p className="text-2xl font-bold text-red-600">
              {evaluations.filter(e => e.resultado_global === 'No Apto').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <PageToolbar
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        supportedViews={['grid', 'list']}
        searchPlaceholder="Buscar por título o período..."
        filterOptions={
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los resultados</SelectItem>
                <SelectItem value="Apto">Apto</SelectItem>
                <SelectItem value="No Apto">No Apto</SelectItem>
                <SelectItem value="Requiere Capacitación">
                  Requiere Capacitación
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Lista de Evaluaciones */}
      {filteredEvaluations.length === 0 ? (
        <div className="text-center py-12">
          <Award className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No hay evaluaciones
          </h3>
          <p className="mt-1 text-sm text-gray-500 mb-6">
            Comienza creando la primera evaluación de desempeño
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Evaluación
          </Button>
        </div>
      ) : (
        <ListGrid
          data={filteredEvaluations}
          keyExtractor={evaluation => evaluation.id}
          renderItem={evaluation => {
            const fechaEvaluacion = evaluation.fecha_evaluacion
              ? new Date(evaluation.fecha_evaluacion)
              : null;
            const totalCompetencias = evaluation.competencias?.length || 0;
            const brechas =
              evaluation.competencias?.filter(c => c.brecha > 0).length || 0;

            return (
              <DomainCard
                key={evaluation.id}
                title={
                  evaluation.titulo ||
                  `Evaluación ${evaluation.periodo || 'Sin fecha'}`
                }
                subtitle={
                  evaluation.periodo
                    ? `Período: ${evaluation.periodo}`
                    : undefined
                }
                status={{
                  label: evaluation.estado || 'Sin estado',
                  variant: getStatusVariant(evaluation.estado || ''),
                }}
                meta={
                  evaluation.resultado_global ? (
                    <BaseBadge
                      variant={getResultVariant(evaluation.resultado_global)}
                    >
                      {evaluation.resultado_global}
                    </BaseBadge>
                  ) : undefined
                }
                actions={[
                  {
                    label: 'Ver Detalles',
                    icon: <Eye className="h-4 w-4" />,
                    onClick: () => handleEdit(evaluation.id),
                  },
                  {
                    label: 'Eliminar',
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => handleDelete(evaluation.id),
                    variant: 'destructive',
                  },
                ]}
                onClick={() => handleEdit(evaluation.id)}
              >
                <div className="space-y-2 mt-2">
                  {/* Fecha de evaluación */}
                  {fechaEvaluacion && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(fechaEvaluacion, 'dd MMM yyyy', {
                          locale: es,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Competencias evaluadas */}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Award className="h-4 w-4" />
                    <span>{totalCompetencias} competencias evaluadas</span>
                  </div>

                  {/* Brechas detectadas */}
                  {brechas > 0 && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                      <AlertCircle className="h-4 w-4" />
                      <span>{brechas} brechas detectadas</span>
                    </div>
                  )}
                </div>
              </DomainCard>
            );
          }}
        />
      )}

      <EvaluationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadEvaluations}
      />
    </div>
  );
}
