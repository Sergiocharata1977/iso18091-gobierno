'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ComplianceMatrix as ComplianceMatrixType,
  ComplianceStatus,
  NormType,
} from '@/types/normPoints';
import { Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ComplianceMatrix() {
  const [matrix, setMatrix] = useState<ComplianceMatrixType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [normTypeFilter, setNormTypeFilter] = useState<NormType | 'all'>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/norm-points/matrix');
      if (response.ok) {
        const data = await response.json();
        setMatrix(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching matrix:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchMatrix();
  };

  const getStatusBadge = (status: ComplianceStatus, percentage: number) => {
    const variants: Record<
      ComplianceStatus,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      completo: 'default',
      parcial: 'secondary',
      pendiente: 'destructive',
      no_aplica: 'outline',
    };

    const colors: Record<ComplianceStatus, string> = {
      completo: 'bg-green-500 hover:bg-green-600',
      parcial: 'bg-yellow-500 hover:bg-yellow-600',
      pendiente: 'bg-red-500 hover:bg-red-600',
      no_aplica: 'bg-gray-400 hover:bg-gray-500',
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {percentage}%
      </Badge>
    );
  };

  const getRelation = (normPointId: string, processId: string) => {
    if (!matrix) return null;
    const key = `${normPointId}_${processId}`;
    return matrix.relations.get(key);
  };

  const filteredNormPoints =
    matrix?.norm_points.filter(
      np => normTypeFilter === 'all' || np.tipo_norma === normTypeFilter
    ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            Cargando matriz de cumplimiento...
          </p>
        </div>
      </div>
    );
  }

  if (!matrix) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            No hay datos disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Matriz de Cumplimiento</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Última actualización: {lastUpdate.toLocaleString('es-AR')}
              </p>
            </div>
            <div className="flex gap-2">
              <Select
                value={normTypeFilter}
                onValueChange={value =>
                  setNormTypeFilter(value as NormType | 'all')
                }
              >
                <SelectTrigger className="w-[180px]">
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
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="icon"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Leyenda */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">100%</Badge>
              <span>Completo</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500">50%</Badge>
              <span>Parcial</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-500">0%</Badge>
              <span>Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-400">N/A</Badge>
              <span>No aplica</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">-</span>
              <span>Sin relación</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de matriz */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[300px] border-r">
                    Punto de Norma
                  </TableHead>
                  {matrix.processes.map(process => (
                    <TableHead
                      key={process.id}
                      className="text-center min-w-[120px]"
                    >
                      {process.nombre}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNormPoints.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={matrix.processes.length + 1}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No hay puntos de norma para el filtro seleccionado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNormPoints.map(normPoint => (
                    <TableRow
                      key={normPoint.id}
                      className="border-b border-border/50"
                    >
                      <TableCell className="sticky left-0 bg-background z-10 border-r border-border/50">
                        <div>
                          <div className="font-medium">
                            {normPoint.code}: {normPoint.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {normPoint.tipo_norma === 'iso_9001' && 'ISO 9001'}
                            {normPoint.tipo_norma === 'iso_14001' &&
                              'ISO 14001'}
                            {normPoint.tipo_norma === 'iso_45001' &&
                              'ISO 45001'}
                            {normPoint.tipo_norma === 'legal' &&
                              `Legal: ${normPoint.nombre_norma || 'Sin especificar'}`}
                            {normPoint.tipo_norma === 'otra' &&
                              normPoint.nombre_norma}
                            {normPoint.is_mandatory && (
                              <Badge
                                variant="destructive"
                                className="ml-2 text-xs"
                              >
                                Obligatorio
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {matrix.processes.map(process => {
                        const relation = getRelation(normPoint.id, process.id);
                        return (
                          <TableCell key={process.id} className="text-center">
                            {relation ? (
                              <div className="flex justify-center">
                                {getStatusBadge(
                                  relation.status,
                                  relation.percentage
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Puntos de Norma</div>
              <div className="text-2xl font-bold">
                {filteredNormPoints.length}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Procesos</div>
              <div className="text-2xl font-bold">
                {matrix.processes.length}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Relaciones Totales</div>
              <div className="text-2xl font-bold">{matrix.relations.size}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Cobertura</div>
              <div className="text-2xl font-bold">
                {matrix.processes.length > 0 && filteredNormPoints.length > 0
                  ? Math.round(
                      (matrix.relations.size /
                        (matrix.processes.length * filteredNormPoints.length)) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
