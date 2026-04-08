'use client';

import { Section } from '@/components/design-system/layout/Section';
import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Badge } from '@/components/ui/badge';
import {
  Measurement,
  QualityIndicator,
  QualityObjective,
} from '@/types/quality';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
} from 'lucide-react';

interface ProcessQualityMetricsProps {
  objectives: QualityObjective[];
  indicators: QualityIndicator[];
  measurements: Measurement[];
}

export function ProcessQualityMetrics({
  objectives,
  indicators,
  measurements,
}: ProcessQualityMetricsProps) {
  // Calculate metrics
  const totalObjectives = objectives.length;
  const completedObjectives = objectives.filter(
    obj => obj.status === 'completado'
  ).length;
  const activeObjectives = objectives.filter(
    obj => obj.status === 'activo'
  ).length;
  const overdueObjectives = objectives.filter(obj => {
    const dueDate = new Date(obj.due_date);
    const now = new Date();
    return obj.status === 'activo' && dueDate < now;
  }).length;

  const complianceRate =
    totalObjectives > 0
      ? Math.round((completedObjectives / totalObjectives) * 100)
      : 0;

  const totalIndicators = indicators.length;
  const activeIndicators = indicators.filter(
    ind => ind.status === 'activo'
  ).length;

  const totalMeasurements = measurements.length;
  const recentMeasurements = measurements.filter(m => {
    const measurementDate = new Date(m.measurement_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return measurementDate >= thirtyDaysAgo;
  }).length;

  const objectivesAtRisk = objectives.filter(obj => {
    const dueDate = new Date(obj.due_date);
    const now = new Date();
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      obj.status === 'activo' &&
      (obj.progress_percentage < obj.alert_threshold || daysUntilDue < 30)
    );
  }).length;

  const avgProgress =
    totalObjectives > 0
      ? Math.round(
          objectives.reduce((sum, obj) => sum + obj.progress_percentage, 0) /
            totalObjectives
        )
      : 0;

  const metrics = [
    {
      title: 'Cumplimiento',
      value: `${complianceRate}%`,
      description: `${completedObjectives}/${totalObjectives} completados`,
      icon: Target,
      color:
        complianceRate >= 80
          ? 'text-green-600'
          : complianceRate >= 60
            ? 'text-yellow-600'
            : 'text-red-600',
      bgColor:
        complianceRate >= 80
          ? 'bg-green-100'
          : complianceRate >= 60
            ? 'bg-yellow-100'
            : 'bg-red-100',
    },
    {
      title: 'Activos',
      value: activeObjectives.toString(),
      description: `${overdueObjectives} vencidos`,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Indicadores',
      value: activeIndicators.toString(),
      description: `de ${totalIndicators} totales`,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Mediciones (30d)',
      value: recentMeasurements.toString(),
      description: 'registros recientes',
      icon: Activity,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'Progreso Prom.',
      value: `${avgProgress}%`,
      description: 'global',
      icon: TrendingUp,
      color:
        avgProgress >= 70
          ? 'text-green-600'
          : avgProgress >= 50
            ? 'text-yellow-600'
            : 'text-red-600',
      bgColor:
        avgProgress >= 70
          ? 'bg-green-100'
          : avgProgress >= 50
            ? 'bg-yellow-100'
            : 'bg-red-100',
    },
    {
      title: 'En Riesgo',
      value: objectivesAtRisk.toString(),
      description: 'atención requerida',
      icon: AlertTriangle,
      color: objectivesAtRisk > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: objectivesAtRisk > 0 ? 'bg-red-100' : 'bg-green-100',
    },
  ];

  const getStatusSummary = () => {
    const statusCounts = objectives.reduce(
      (acc, obj) => {
        acc[obj.status] = (acc[obj.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage:
        totalObjectives > 0 ? Math.round((count / totalObjectives) * 100) : 0,
    }));
  };

  const statusSummary = getStatusSummary();

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <Section title="Métricas Clave" className="pb-0" contentClassName="p-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {metrics.map((metric, index) => (
            <BaseCard
              key={index}
              className="border-0 shadow-sm bg-card hover:bg-muted/10 transition-colors"
              padding="sm"
            >
              <div className="flex flex-col items-center text-center p-1">
                <div className={`p-2 rounded-full ${metric.bgColor} mb-2`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground mb-0 leading-none">
                  {metric.value}
                </p>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {metric.title}
                </p>
                <p className="text-[10px] text-muted-foreground/80 truncate w-full">
                  {metric.description}
                </p>
              </div>
            </BaseCard>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Summary */}
        {statusSummary.length > 0 && (
          <Section title="Estado de Objetivos">
            <div className="space-y-4">
              {statusSummary.map(({ status, count, percentage }) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className="capitalize w-24 justify-center"
                    >
                      {status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {count} objetivos
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 flex-1 justify-end">
                    <div className="w-24 bg-secondary rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          status === 'completado'
                            ? 'bg-green-500'
                            : status === 'activo'
                              ? 'bg-blue-500'
                              : status === 'atrasado'
                                ? 'bg-red-500'
                                : 'bg-gray-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Quick Insights */}
        <Section title="Insights">
          <div className="space-y-3">
            {complianceRate >= 80 ? (
              <div className="flex items-start space-x-3 p-3 bg-green-50/50 rounded-lg border border-green-100">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span className="text-sm text-green-800">
                  Excelente cumplimiento de objetivos. El proceso va por buen
                  camino.
                </span>
              </div>
            ) : null}

            {objectivesAtRisk > 0 ? (
              <div className="flex items-start space-x-3 p-3 bg-red-50/50 rounded-lg border border-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <span className="text-sm text-red-800">
                  <strong>{objectivesAtRisk} objetivos</strong> requieren
                  atención inmediata por retrasos o bajo progreso.
                </span>
              </div>
            ) : null}

            {recentMeasurements === 0 && totalIndicators > 0 ? (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                <span className="text-sm text-yellow-800">
                  No se han registrado mediciones en los últimos 30 días. Es
                  importante mantener los indicadores actualizados.
                </span>
              </div>
            ) : null}

            {totalObjectives === 0 ? (
              <div className="flex items-start space-x-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                <span className="text-sm text-blue-800">
                  Este proceso aún no tiene objetivos definidos. Comienza
                  creando objetivos SMART para medir su desempeño.
                </span>
              </div>
            ) : null}
            {/* Default Insight if everything is fine but no special message */}
            {totalObjectives > 0 &&
              objectivesAtRisk === 0 &&
              complianceRate < 80 && (
                <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm text-muted-foreground">
                    El proceso se encuentra en monitoreo regular.
                  </span>
                </div>
              )}
          </div>
        </Section>
      </div>
    </div>
  );
}
