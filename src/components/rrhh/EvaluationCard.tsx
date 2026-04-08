'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PerformanceEvaluation } from '@/types/rrhh';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Award, Calendar } from 'lucide-react';

interface EvaluationCardProps {
  evaluation: PerformanceEvaluation;
  personnelName?: string;
  onEdit?: (evaluation: PerformanceEvaluation) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

// Helper to parse date that may come as string or Date
const parseDate = (date: Date | string | undefined): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  return new Date(date);
};

export function EvaluationCard({
  evaluation,
  personnelName,
  onEdit,
  onDelete,
  onViewDetails,
}: EvaluationCardProps) {
  const getResultColor = (
    result: PerformanceEvaluation['resultado_global']
  ) => {
    switch (result) {
      case 'Apto':
        return 'bg-green-500';
      case 'No Apto':
        return 'bg-red-500';
      case 'Requiere Capacitación':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: PerformanceEvaluation['estado']) => {
    switch (status) {
      case 'borrador':
        return 'bg-gray-500';
      case 'publicado':
        return 'bg-blue-500';
      case 'cerrado':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const totalCompetencias = evaluation.competencias?.length || 0;
  const brechas =
    evaluation.competencias?.filter(c => c.brecha > 0).length || 0;

  const fechaEvaluacion = parseDate(evaluation.fecha_evaluacion);

  // Display title if available, otherwise fallback to period
  const displayTitle =
    evaluation.titulo || `Evaluación ${evaluation.periodo || 'Sin fecha'}`;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onEdit?.(evaluation)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              {personnelName || displayTitle}
            </CardTitle>
            {evaluation.periodo && (
              <p className="text-sm text-gray-500 mt-1">
                Período: {evaluation.periodo}
              </p>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            <Badge className={getResultColor(evaluation.resultado_global)}>
              {evaluation.resultado_global}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Fecha de evaluación */}
          {fechaEvaluacion && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>
                {format(fechaEvaluacion, 'dd MMM yyyy', {
                  locale: es,
                })}
              </span>
            </div>
          )}

          {/* Estado */}
          <div className="flex items-center gap-2 text-sm">
            <Badge
              className={getStatusColor(evaluation.estado)}
              variant="outline"
            >
              {evaluation.estado}
            </Badge>
          </div>

          {/* Competencias evaluadas */}
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-gray-500" />
            <span>{totalCompetencias} competencias evaluadas</span>
          </div>

          {/* Brechas detectadas */}
          {brechas > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{brechas} brechas detectadas</span>
            </div>
          )}

          {/* Próxima evaluación */}
          {evaluation.fechaProximaEvaluacion && (
            <div className="text-sm">
              <span className="text-gray-500">Próxima evaluación:</span>{' '}
              <span className="font-medium">
                {format(evaluation.fechaProximaEvaluacion, 'dd MMM yyyy', {
                  locale: es,
                })}
              </span>
            </div>
          )}

          {/* Plan de mejora */}
          {evaluation.plan_mejora && (
            <div className="text-sm">
              <span className="text-gray-500">Plan de mejora:</span>{' '}
              <p className="text-xs mt-1 line-clamp-2">
                {evaluation.plan_mejora}
              </p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(evaluation.id)}
                className="flex-1"
              >
                Ver Detalles
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(evaluation)}
              >
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(evaluation.id)}
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
