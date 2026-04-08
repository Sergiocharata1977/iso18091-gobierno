'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NormPoint, NormType } from '@/types/normPoints';
import {
  AlertCircle,
  FileText,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface GapWithDetails extends NormPoint {
  relatedProcessNames?: string[];
}

export function GapsAnalysis() {
  const [gaps, setGaps] = useState<GapWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Filtros
  const [priorityFilter, setPriorityFilter] = useState<
    'all' | 'alta' | 'media' | 'baja'
  >('all');
  const [normTypeFilter, setNormTypeFilter] = useState<NormType | 'all'>('all');
  const [mandatoryOnly, setMandatoryOnly] = useState(false);

  useEffect(() => {
    fetchGaps();
  }, [priorityFilter, normTypeFilter, mandatoryOnly]);

  const fetchGaps = async () => {
    try {
      setRefreshing(true);

      // Obtener TODOS los puntos de norma
      const allNormPointsResponse = await fetch('/api/norm-points');
      const allNormPoints: NormPoint[] = await allNormPointsResponse.json();

      // Obtener TODAS las relaciones
      const relationsResponse = await fetch('/api/norm-points/relations');
      const allRelations = await relationsResponse.json();

      // Identificar puntos de norma SIN NINGUNA RELACIÓN (verdaderos gaps)
      const normPointsWithRelations = new Set(
        allRelations.map((r: any) => r.norm_point_id)
      );
      let unassignedNormPoints = allNormPoints.filter(
        np => !normPointsWithRelations.has(np.id)
      );

      // Aplicar filtros
      if (priorityFilter !== 'all') {
        unassignedNormPoints = unassignedNormPoints.filter(
          np => np.priority === priorityFilter
        );
      }

      if (normTypeFilter !== 'all') {
        unassignedNormPoints = unassignedNormPoints.filter(
          np => np.tipo_norma === normTypeFilter
        );
      }

      if (mandatoryOnly) {
        unassignedNormPoints = unassignedNormPoints.filter(
          np => np.is_mandatory
        );
      }

      // Ordenar por prioridad (obligatorios primero, luego por prioridad)
      const priorityOrder: Record<string, number> = {
        alta: 0,
        media: 1,
        baja: 2,
      };

      unassignedNormPoints.sort((a, b) => {
        // Obligatorios primero
        if (a.is_mandatory && !b.is_mandatory) return -1;
        if (!a.is_mandatory && b.is_mandatory) return 1;

        // Luego por prioridad
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setGaps(unassignedNormPoints);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching gaps:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchGaps();
  };

  const getPriorityVariant = (priority: 'alta' | 'media' | 'baja') => {
    const variants = {
      alta: 'destructive' as const,
      media: 'default' as const,
      baja: 'secondary' as const,
    };
    return variants[priority];
  };

  const getPriorityColor = (priority: 'alta' | 'media' | 'baja') => {
    const colors = {
      alta: 'border-l-red-500',
      media: 'border-l-yellow-500',
      baja: 'border-l-blue-500',
    };
    return colors[priority];
  };

  const getNormTypeLabel = (tipo: NormType, nombre?: string) => {
    const labels: Record<NormType, string> = {
      iso_9001: 'ISO 9001',
      iso_14001: 'ISO 14001',
      iso_45001: 'ISO 45001',
      legal: nombre || 'Requisito Legal',
      otra: nombre || 'Otra Norma',
    };
    return labels[tipo];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            Analizando gaps de cumplimiento...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Análisis de Gaps de Cumplimiento</CardTitle>
              <CardDescription>
                Puntos de norma que aún NO están asignados a ningún proceso
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-1">
                Última actualización: {lastUpdate.toLocaleString('es-AR')}
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              Actualizar análisis
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={priorityFilter}
              onValueChange={value =>
                setPriorityFilter(value as typeof priorityFilter)
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={normTypeFilter}
              onValueChange={value =>
                setNormTypeFilter(value as typeof normTypeFilter)
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tipo de norma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las normas</SelectItem>
                <SelectItem value="iso_9001">ISO 9001</SelectItem>
                <SelectItem value="iso_14001">ISO 14001</SelectItem>
                <SelectItem value="iso_45001">ISO 45001</SelectItem>
                <SelectItem value="legal">Requisitos Legales</SelectItem>
                <SelectItem value="otra">Otras</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mandatory"
                checked={mandatoryOnly}
                onCheckedChange={checked =>
                  setMandatoryOnly(checked as boolean)
                }
              />
              <label
                htmlFor="mandatory"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Solo obligatorios
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Gaps</div>
              <div className="text-2xl font-bold">{gaps.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Alta Prioridad</div>
              <div className="text-2xl font-bold text-red-600">
                {gaps.filter(g => g.priority === 'alta').length}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Obligatorios</div>
              <div className="text-2xl font-bold text-orange-600">
                {gaps.filter(g => g.is_mandatory).length}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Media/Baja</div>
              <div className="text-2xl font-bold text-blue-600">
                {
                  gaps.filter(
                    g => g.priority === 'media' || g.priority === 'baja'
                  ).length
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de gaps */}
      <div className="space-y-4">
        {gaps.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">
                  ¡Excelente! No hay gaps de cumplimiento
                </h3>
                <p className="text-muted-foreground">
                  Todos los puntos de norma están asignados a procesos según los
                  filtros seleccionados.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  💡 Tip: Para ver el estado de cumplimiento de cada asignación,
                  ve a la pestaña "Matriz de Cumplimiento"
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          gaps.map(gap => (
            <Card
              key={gap.id}
              className={`border-l-4 ${getPriorityColor(gap.priority)}`}
            >
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <CardTitle className="text-lg">
                          {gap.code}: {gap.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {gap.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getPriorityVariant(gap.priority)}>
                      Prioridad {gap.priority}
                    </Badge>
                    {gap.is_mandatory && (
                      <Badge variant="destructive">Obligatorio</Badge>
                    )}
                    <Badge variant="outline">
                      {getNormTypeLabel(gap.tipo_norma, gap.nombre_norma)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Requisito */}
                  <div className="bg-muted p-3 rounded-md">
                    <div className="text-sm font-medium mb-1">Requisito:</div>
                    <div className="text-sm text-muted-foreground">
                      {gap.requirement}
                    </div>
                  </div>

                  {/* Información adicional para requisitos legales */}
                  {gap.tipo_norma === 'legal' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      {gap.jurisdiccion && (
                        <div>
                          <span className="font-medium">Jurisdicción:</span>{' '}
                          {gap.jurisdiccion}
                        </div>
                      )}
                      {gap.numero_ley && (
                        <div>
                          <span className="font-medium">Ley N°:</span>{' '}
                          {gap.numero_ley}
                        </div>
                      )}
                      {gap.articulo && (
                        <div>
                          <span className="font-medium">Artículo:</span>{' '}
                          {gap.articulo}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clasificación ISO */}
                  {(gap.chapter || gap.category) && (
                    <div className="flex gap-4 text-sm">
                      {gap.chapter && (
                        <div>
                          <span className="font-medium">Capítulo:</span>{' '}
                          {gap.chapter}
                        </div>
                      )}
                      {gap.category && (
                        <div>
                          <span className="font-medium">Categoría:</span>{' '}
                          <span className="capitalize">{gap.category}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Procesos relacionados */}
                  {gap.related_process_ids &&
                    gap.related_process_ids.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">
                          Procesos relacionados:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {gap.related_process_ids.map(processId => (
                            <Badge key={processId} variant="outline">
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Proceso ID: {processId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Documentos relacionados */}
                  {gap.related_document_ids &&
                    gap.related_document_ids.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">
                          Documentos relacionados:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {gap.related_document_ids.map(docId => (
                            <Badge key={docId} variant="outline">
                              <FileText className="h-3 w-3 mr-1" />
                              Doc ID: {docId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Acciones */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="default">
                      Asignar a proceso
                    </Button>
                    <Button size="sm" variant="outline">
                      Ver detalles completos
                    </Button>
                    {gap.related_document_ids &&
                      gap.related_document_ids.length > 0 && (
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-1" />
                          Ver documentos ({gap.related_document_ids.length})
                        </Button>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
