'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress'; // Componente no disponible
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { CompetenceEvaluation } from '@/types/rrhh';

interface Props {
  competenceEvaluations: CompetenceEvaluation[];
  showActions?: boolean;
  onCompetenceClick?: (competenceId: string) => void;
}

export function CompetenceComparisonTable({
  competenceEvaluations,
  showActions = false,
  onCompetenceClick,
}: Props) {
  const getGapSeverity = (brecha: number) => {
    if (brecha >= 3)
      return { level: 'critica', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (brecha >= 2)
      return {
        level: 'media',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      };
    if (brecha >= 1)
      return { level: 'baja', color: 'text-green-600', bgColor: 'bg-green-50' };
    return {
      level: 'ninguna',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    };
  };

  const getGapIcon = (brecha: number) => {
    if (brecha >= 3) return <XCircle className="h-4 w-4 text-red-500" />;
    if (brecha >= 2)
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getProgressColor = (brecha: number) => {
    if (brecha >= 3) return 'bg-red-500';
    if (brecha >= 2) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const calculateOverallScore = () => {
    if (competenceEvaluations.length === 0) return 0;

    const totalEvaluated = competenceEvaluations.reduce(
      (sum, comp) => sum + comp.nivelEvaluado,
      0
    );
    const totalRequired = competenceEvaluations.reduce(
      (sum, comp) => sum + comp.nivelRequerido,
      0
    );
    const score = (totalEvaluated / totalRequired) * 100;

    return Math.max(0, Math.min(100, score));
  };

  const overallScore = calculateOverallScore();
  const gapsCount = competenceEvaluations.filter(
    comp => comp.brecha > 0
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Comparación de Competencias</span>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span>Puntuación general:</span>
              <Badge variant="outline">{Math.round(overallScore)}%</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Brechas:</span>
              <Badge variant={gapsCount > 0 ? 'destructive' : 'secondary'}>
                {gapsCount}
              </Badge>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Barra de progreso general */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso general</span>
              <span>{Math.round(overallScore)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${overallScore}%` }}
              ></div>
            </div>
          </div>

          {/* Tabla de comparación */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competencia</TableHead>
                <TableHead className="text-center">Requerido</TableHead>
                <TableHead className="text-center">Evaluado</TableHead>
                <TableHead className="text-center">Brecha</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead>Observaciones</TableHead>
                {showActions && <TableHead>Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {competenceEvaluations.map(comp => {
                const severity = getGapSeverity(comp.brecha);
                const progressValue =
                  comp.nivelRequerido > 0
                    ? (comp.nivelEvaluado / comp.nivelRequerido) * 100
                    : 0;

                return (
                  <TableRow
                    key={comp.competenciaId}
                    className={`${
                      comp.brecha > 0 ? severity.bgColor : ''
                    } ${onCompetenceClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => onCompetenceClick?.(comp.competenciaId)}
                  >
                    <TableCell className="font-medium">
                      {comp.nombreCompetencia}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline">{comp.nivelRequerido}</Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="secondary">{comp.nivelEvaluado}</Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {comp.brecha > 0 && getGapIcon(comp.brecha)}
                        <span className={`font-medium ${severity.color}`}>
                          {comp.brecha > 0 ? `-${comp.brecha}` : '0'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <Badge
                          className={`${
                            comp.brecha === 0
                              ? 'bg-green-100 text-green-800'
                              : severity.color
                          }`}
                        >
                          {comp.brecha === 0
                            ? 'Cumple'
                            : severity.level.toUpperCase()}
                        </Badge>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${getProgressColor(comp.brecha)}`}
                            style={{ width: `${progressValue}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-xs">
                      <p className="text-sm text-gray-600 truncate">
                        {comp.observaciones || 'Sin observaciones'}
                      </p>
                    </TableCell>

                    {showActions && (
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            onClick={e => {
                              e.stopPropagation();
                              // Acción para ver historial
                            }}
                          >
                            Ver historial
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Resumen */}
          {competenceEvaluations.length > 0 && (
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {competenceEvaluations.filter(c => c.brecha === 0).length}
                  </div>
                  <div className="text-sm text-green-700">Completas</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {
                      competenceEvaluations.filter(
                        c => c.brecha > 0 && c.brecha < 3
                      ).length
                    }
                  </div>
                  <div className="text-sm text-yellow-700">
                    Con brechas menores
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {competenceEvaluations.filter(c => c.brecha >= 3).length}
                  </div>
                  <div className="text-sm text-red-700">Críticas</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {competenceEvaluations.length}
                  </div>
                  <div className="text-sm text-blue-700">Total</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
