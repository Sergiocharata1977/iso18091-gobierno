'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle, BookOpen } from 'lucide-react';
import type { CompetenceGap } from '@/types/rrhh';

interface Props {
  personnelId: string;
}

export function EvaluationGapAnalysis({ personnelId }: Props) {
  const [gaps, setGaps] = useState<CompetenceGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGaps();
  }, [personnelId]);

  const loadGaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/rrhh/evaluaciones/gaps/${personnelId}`
      );

      if (!response.ok) {
        throw new Error('Error al cargar análisis de brechas');
      }

      const data = await response.json();
      setGaps(data);
    } catch (err) {
      console.error('Error al cargar brechas:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severidad: string) => {
    switch (severidad) {
      case 'critica':
        return 'bg-red-500';
      case 'media':
        return 'bg-yellow-500';
      case 'baja':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severidad: string) => {
    switch (severidad) {
      case 'critica':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'media':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'baja':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getProgressColor = (brecha: number) => {
    if (brecha >= 3) return 'bg-red-500';
    if (brecha >= 2) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const calculateOverallProgress = () => {
    if (gaps.length === 0) return 100;

    const totalBrechas = gaps.reduce((sum, gap) => sum + gap.brecha, 0);
    const maxPossibleBrechas = gaps.length * 5; // Máxima brecha posible por competencia
    const progress =
      ((maxPossibleBrechas - totalBrechas) / maxPossibleBrechas) * 100;

    return Math.max(0, Math.min(100, progress));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar análisis de brechas: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Análisis de Brechas de Competencias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ El empleado cumple con todas las competencias requeridas para
              su puesto
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const overallProgress = calculateOverallProgress();
  const criticalGaps = gaps.filter(g => g.severidad === 'critica').length;
  const mediumGaps = gaps.filter(g => g.severidad === 'media').length;
  const lowGaps = gaps.filter(g => g.severidad === 'baja').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Análisis de Brechas de Competencias
        </CardTitle>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progreso general de competencias:</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Resumen de brechas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {criticalGaps}
            </div>
            <div className="text-sm text-red-700">Críticas</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {mediumGaps}
            </div>
            <div className="text-sm text-yellow-700">Medias</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{lowGaps}</div>
            <div className="text-sm text-green-700">Bajas</div>
          </div>
        </div>

        {/* Lista detallada de brechas */}
        <div className="space-y-4">
          <h3 className="font-medium">Detalle de Brechas</h3>
          {gaps.map(gap => (
            <div
              key={gap.competenciaId}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getSeverityIcon(gap.severidad)}
                  <div>
                    <h4 className="font-medium">{gap.competenciaNombre}</h4>
                    <p className="text-sm text-gray-600">{gap.puestoName}</p>
                  </div>
                </div>
                <Badge className={getSeverityColor(gap.severidad)}>
                  {gap.severidad.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Nivel Requerido:</span>
                  <span className="ml-2 font-medium">{gap.nivelRequerido}</span>
                </div>
                <div>
                  <span className="text-gray-500">Nivel Actual:</span>
                  <span className="ml-2 font-medium">{gap.nivelActual}</span>
                </div>
                <div>
                  <span className="text-gray-500">Brecha:</span>
                  <span className="ml-2 font-medium text-red-600">
                    -{gap.brecha}
                  </span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progreso</span>
                  <span>
                    {gap.nivelActual}/{gap.nivelRequerido}
                  </span>
                </div>
                <Progress
                  value={(gap.nivelActual / gap.nivelRequerido) * 100}
                  className="h-2"
                />
              </div>

              {/* Capacitaciones sugeridas */}
              {gap.capacitacionesSugeridas.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">
                      Capacitaciones sugeridas:
                    </span>
                  </div>
                  <Button size="sm" variant="outline">
                    Ver {gap.capacitacionesSugeridas.length} capacitación(es)
                  </Button>
                </div>
              )}

              {/* Fecha de última evaluación */}
              {gap.fechaUltimaEvaluacion && (
                <div className="text-xs text-gray-500 pt-2 border-t">
                  Última evaluación:{' '}
                  {gap.fechaUltimaEvaluacion.toLocaleDateString('es-ES')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Acciones recomendadas */}
        <div className="pt-4 border-t">
          <h3 className="font-medium mb-3">Acciones Recomendadas</h3>
          <div className="space-y-2">
            {criticalGaps > 0 && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Urgente:</strong> {criticalGaps} competencia(s)
                  crítica(s) requieren atención inmediata. Se recomienda
                  programar capacitación especializada.
                </AlertDescription>
              </Alert>
            )}
            <Button className="w-full">
              Generar Plan de Capacitación Personalizado
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
