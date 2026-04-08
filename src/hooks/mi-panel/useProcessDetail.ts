'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProcessRecordService } from '@/services/processRecords/ProcessRecordService';
import type { QualityIndicator, QualityObjective } from '@/types/quality';
import type { ProcessDefinition, ProcessRecord } from '@/types/processRecords';

export type ProcessDetailStats = {
  totalRecords: number;
  pendingRecords: number;
  overdueRecords: number;
  completedRecords: number;
  activeIndicators: number;
  overdueIndicators: number;
  completionPercentage: number;
};

interface UseProcessDetailParams {
  processId: string | null;
  organizationProcesses: ProcessDefinition[];
  organizationObjectives: QualityObjective[];
  organizationIndicators: QualityIndicator[];
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const candidate = (value as { toDate?: () => Date }).toDate;
    return typeof candidate === 'function' ? candidate() : null;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function daysForFrequency(
  frequency: QualityIndicator['measurement_frequency']
): number {
  switch (frequency) {
    case 'diaria':
      return 1;
    case 'semanal':
      return 7;
    case 'mensual':
      return 30;
    case 'trimestral':
      return 90;
    case 'anual':
      return 365;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

function isIndicatorOverdue(indicator: QualityIndicator, now: number): boolean {
  if (indicator.status !== 'activo') return false;
  const lastMeasurementDate = toDate(indicator.last_measurement_date);
  if (!lastMeasurementDate) return true;
  const frequencyDays = daysForFrequency(indicator.measurement_frequency);
  return now - lastMeasurementDate.getTime() > frequencyDays * 86400000;
}

export function useProcessDetail({
  processId,
  organizationProcesses,
  organizationObjectives,
  organizationIndicators,
}: UseProcessDetailParams) {
  const [records, setRecords] = useState<ProcessRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const processDefinition = useMemo(
    () =>
      processId
        ? organizationProcesses.find(process => process.id === processId) ||
          null
        : null,
    [organizationProcesses, processId]
  );

  const objectives = useMemo(
    () =>
      processId
        ? organizationObjectives.filter(
            objective => objective.process_definition_id === processId
          )
        : [],
    [organizationObjectives, processId]
  );

  const indicators = useMemo(
    () =>
      processId
        ? organizationIndicators.filter(
            indicator => indicator.process_definition_id === processId
          )
        : [],
    [organizationIndicators, processId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      if (!processId) {
        setRecords([]);
        setRecordsError(null);
        setRecordsLoading(false);
        return;
      }

      setRecordsLoading(true);
      setRecordsError(null);

      try {
        const response = await fetch(
          `/api/process-records?definition_id=${encodeURIComponent(processId)}`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          throw new Error('No se pudieron obtener los registros del proceso');
        }

        const data = (await response.json()) as ProcessRecord[];
        if (!cancelled) setRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        try {
          const fallbackRecords =
            await ProcessRecordService.getByDefinitionId(processId);
          if (!cancelled) setRecords(fallbackRecords);
        } catch {
          if (!cancelled) {
            setRecords([]);
            setRecordsError(
              error instanceof Error
                ? error.message
                : 'No se pudieron cargar los registros del proceso'
            );
          }
        }
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, [processId, refreshToken]);

  const stats = useMemo<ProcessDetailStats>(() => {
    if (!processId) {
      return {
        totalRecords: 0,
        pendingRecords: 0,
        overdueRecords: 0,
        completedRecords: 0,
        activeIndicators: 0,
        overdueIndicators: 0,
        completionPercentage: 0,
      };
    }

    const now = Date.now();
    const pendingRecords = records.filter(
      record => record.status !== 'completado' && record.status !== 'cancelado'
    );
    const overdueRecords = pendingRecords.filter(record => {
      const endDate = toDate(record.fecha_fin);
      return !!endDate && endDate.getTime() < now;
    });
    const completedRecords = records.filter(
      record => record.status === 'completado'
    );
    const activeIndicators = indicators.filter(
      indicator => indicator.status === 'activo'
    );

    return {
      totalRecords: records.length,
      pendingRecords: pendingRecords.length,
      overdueRecords: overdueRecords.length,
      completedRecords: completedRecords.length,
      activeIndicators: activeIndicators.length,
      overdueIndicators: indicators.filter(indicator =>
        isIndicatorOverdue(indicator, now)
      ).length,
      completionPercentage:
        records.length > 0
          ? Math.round((completedRecords.length / records.length) * 100)
          : 0,
    };
  }, [indicators, processId, records]);

  return {
    processDefinition,
    records,
    objectives,
    indicators,
    recordsLoading,
    recordsError,
    stats,
    refreshRecords: () => setRefreshToken(current => current + 1),
  };
}
