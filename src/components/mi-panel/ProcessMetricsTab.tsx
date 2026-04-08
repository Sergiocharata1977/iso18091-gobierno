'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  daysForFrequency,
  type ProcessDetailStats,
} from '@/hooks/mi-panel/useProcessDetail';
import type { QualityIndicator } from '@/types/quality';
import { parseDate } from './ProcessSidebar';

interface ProcessMetricsTabProps {
  indicators: QualityIndicator[];
  stats: ProcessDetailStats;
}

type IndicatorTrafficLight = 'green' | 'yellow' | 'red';

function formatDate(value: unknown): string {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleDateString('es-AR') : 'Sin medicion';
}

function getIndicatorStatus(
  indicator: QualityIndicator
): IndicatorTrafficLight {
  if (indicator.status !== 'activo') return 'yellow';

  const lastMeasurement = parseDate(indicator.last_measurement_date);
  if (!lastMeasurement) return 'red';

  const frequencyDays = daysForFrequency(indicator.measurement_frequency);
  const diffDays = (Date.now() - lastMeasurement.getTime()) / 86400000;

  if (diffDays > frequencyDays) return 'red';
  if (diffDays >= frequencyDays * 0.8) return 'yellow';
  return 'green';
}

function getStatusMeta(status: IndicatorTrafficLight) {
  switch (status) {
    case 'red':
      return {
        icon: '🔴',
        label: 'Vencido',
        rowClassName: 'border-red-200 bg-red-50/70',
      };
    case 'yellow':
      return {
        icon: '🟡',
        label: 'Proximo a vencer',
        rowClassName: 'border-amber-200 bg-amber-50/70',
      };
    default:
      return {
        icon: '🟢',
        label: 'Al dia',
        rowClassName: 'border-emerald-200 bg-emerald-50/70',
      };
  }
}

export function ProcessMetricsTab({
  indicators,
  stats,
}: ProcessMetricsTabProps) {
  const activeIndicators = indicators.filter(
    indicator => indicator.status === 'activo'
  );
  const missingMeasurements = activeIndicators.filter(
    indicator => !parseDate(indicator.last_measurement_date)
  ).length;

  const kpis = [
    {
      label: 'Indicadores activos',
      value: stats.activeIndicators,
      detail: `${indicators.length} totales`,
    },
    {
      label: 'Cumplimiento %',
      value: `${stats.completionPercentage}%`,
      detail: `${stats.completedRecords}/${stats.totalRecords} registros`,
    },
    {
      label: 'Reg vencidos',
      value: stats.overdueRecords,
      detail: `${stats.pendingRecords} pendientes`,
    },
    {
      label: 'Med vencidas',
      value: stats.overdueIndicators,
      detail: 'segun frecuencia',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border-slate-200 shadow-sm">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {kpi.label}
              </p>
              <p className="text-3xl font-semibold text-slate-950">
                {kpi.value}
              </p>
              <p className="text-xs text-slate-500">{kpi.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {missingMeasurements > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Hay {missingMeasurements} indicador
            {missingMeasurements === 1 ? '' : 'es'} sin medicion cargada.
          </p>
        </div>
      ) : null}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Indicadores del proceso</CardTitle>
        </CardHeader>
        <CardContent>
          {activeIndicators.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay indicadores activos para mostrar.
            </p>
          ) : (
            <div className="space-y-3">
              {activeIndicators.map(indicator => {
                const status = getIndicatorStatus(indicator);
                const meta = getStatusMeta(status);
                const hasMeasurement = !!parseDate(
                  indicator.last_measurement_date
                );

                return (
                  <div
                    key={indicator.id}
                    className={`rounded-xl border px-4 py-3 ${meta.rowClassName}`}
                  >
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 text-sm text-slate-800">
                        <p className="truncate font-medium text-slate-950">
                          <span className="mr-2" aria-hidden="true">
                            {meta.icon}
                          </span>
                          {indicator.code} {indicator.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {indicator.measurement_frequency} | Ultimo:{' '}
                          {hasMeasurement
                            ? formatDate(indicator.last_measurement_date)
                            : meta.label}
                        </p>
                      </div>

                      <div className="text-sm font-medium text-slate-700">
                        {hasMeasurement &&
                        typeof indicator.current_value === 'number'
                          ? `${indicator.current_value}${indicator.unit ? ` ${indicator.unit}` : ''}`
                          : '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
