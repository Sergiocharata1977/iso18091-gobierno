import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  CreateAgentJobRequest,
  JobPriority,
  QualityMeasurementOverdueJobPayload,
} from '@/types/agents';
import { AgentQueueService } from './AgentQueueService';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const OVERDUE_INTENT = 'quality.measurement.overdue.notify';

type SupportedFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';
type DetectionKind = 'missing' | 'overdue';
type NotificationStage = 'reminder' | 'escalation';

export interface RawIndicatorRecord {
  id: string;
  [key: string]: unknown;
}

export interface RawMeasurementRecord {
  id: string;
  [key: string]: unknown;
}

export interface NormalizedIndicatorSchedule {
  indicatorId: string;
  organizationId: string;
  indicatorName: string;
  frequency: SupportedFrequency;
  cadenceDays: number;
  responsibleUserId: string | null;
  processDefinitionId?: string;
  objectiveId?: string;
  createdAt: Date | null;
}

export interface DetectionEvaluation {
  indicatorId: string;
  organizationId: string;
  indicatorName: string;
  frequency: SupportedFrequency;
  cadenceDays: number;
  dueDate: Date;
  daysOverdue: number;
  detectionKind: DetectionKind;
  priority: Exclude<JobPriority, 'critical'>;
  notificationStage: NotificationStage;
  responsibleUserId: string | null;
  processDefinitionId?: string;
  objectiveId?: string;
  lastMeasurementDate: Date | null;
  latestRejectedMeasurementDate: Date | null;
}

export interface QualityMeasurementDetectorRunInput {
  organizationId: string;
  dryRun?: boolean;
  maxIndicators?: number;
}

export interface QualityMeasurementDetectorRunJobResult {
  indicator_id: string;
  indicator_name: string;
  detection_kind: DetectionKind;
  priority: Exclude<JobPriority, 'critical'>;
  notification_stage: NotificationStage;
  due_date: string;
  days_overdue: number;
  idempotency_key: string;
  job_id?: string;
}

export interface QualityMeasurementDetectorRunResult {
  organization_id: string;
  run_at: string;
  dry_run: boolean;
  scanned_indicators: number;
  detected: number;
  enqueued: number;
  skipped_inactive: number;
  skipped_invalid: number;
  jobs: QualityMeasurementDetectorRunJobResult[];
}

interface DetectorDeps {
  listIndicators: (organizationId: string) => Promise<RawIndicatorRecord[]>;
  listMeasurementsForIndicator: (
    organizationId: string,
    indicatorId: string
  ) => Promise<RawMeasurementRecord[]>;
  enqueueJob: (
    request: CreateAgentJobRequest,
    agentInstanceId: string
  ) => Promise<string>;
  now: () => Date;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const converted = (value as { toDate: () => unknown }).toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime())
      ? converted
      : null;
  }
  return null;
}

function toIsoDate(date: Date): string {
  return date.toISOString();
}

function toYmdUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(startOfUtcDay(date).getTime() + days * MS_PER_DAY);
}

function dayDiffUtc(later: Date, earlier: Date): number {
  return Math.floor(
    (startOfUtcDay(later).getTime() - startOfUtcDay(earlier).getTime()) /
      MS_PER_DAY
  );
}

export function normalizeMeasurementFrequency(
  value: unknown
): SupportedFrequency | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase();
  const map: Record<string, SupportedFrequency> = {
    daily: 'daily',
    diaria: 'daily',
    weekly: 'weekly',
    semanal: 'weekly',
    monthly: 'monthly',
    mensual: 'monthly',
    quarterly: 'quarterly',
    trimestral: 'quarterly',
    yearly: 'yearly',
    annual: 'yearly',
    anual: 'yearly',
  };
  return map[raw] || null;
}

export function frequencyToCadenceDays(frequency: SupportedFrequency): number {
  switch (frequency) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90;
    case 'yearly':
      return 365;
  }
}

export function isIndicatorActive(record: RawIndicatorRecord): boolean {
  const deletedAt = record.deletedAt ?? record.deleted_at;
  if (deletedAt) return false;

  const isActive = record.isActive ?? record.is_active;
  if (typeof isActive === 'boolean' && !isActive) return false;

  const status = String(record.status || '')
    .trim()
    .toLowerCase();
  if (
    status &&
    [
      'inactivo',
      'inactive',
      'suspendido',
      'suspended',
      'cancelado',
      'cancelled',
    ].includes(status)
  ) {
    return false;
  }

  return true;
}

export function normalizeIndicatorSchedule(
  record: RawIndicatorRecord
): NormalizedIndicatorSchedule | null {
  const organizationId = String(record.organization_id || '').trim();
  const frequency = normalizeMeasurementFrequency(
    record.frequency ?? record.measurement_frequency
  );
  if (!organizationId || !frequency) return null;

  const indicatorId = String(record.id || '').trim();
  if (!indicatorId) return null;

  const indicatorName = String(
    record.name || record.code || record.title || indicatorId
  );
  const responsibleUserId =
    String(
      (record.owner ??
        record.responsible_user_id ??
        record.responsibleUserId ??
        '') as string
    ).trim() || null;

  const processDefinitionId = String(
    (record.process_definition_id ?? record.processDefinitionId ?? '') as string
  ).trim();
  const objectiveId = String(
    (record.objective_id ?? record.objectiveId ?? '') as string
  ).trim();

  const createdAt =
    asDate(record.createdAt) ||
    asDate(record.created_at) ||
    asDate(record.startDate) ||
    null;

  return {
    indicatorId,
    organizationId,
    indicatorName,
    frequency,
    cadenceDays: frequencyToCadenceDays(frequency),
    responsibleUserId,
    processDefinitionId: processDefinitionId || undefined,
    objectiveId: objectiveId || undefined,
    createdAt,
  };
}

function measurementValidationStatus(
  record: RawMeasurementRecord
): string | null {
  const raw = record.validation_status ?? record.validationStatus;
  if (typeof raw !== 'string') return null;
  return raw.trim().toLowerCase();
}

function isRejectedMeasurement(record: RawMeasurementRecord): boolean {
  return measurementValidationStatus(record) === 'rechazado';
}

function measurementDate(record: RawMeasurementRecord): Date | null {
  return (
    asDate(record.date) ||
    asDate(record.measurement_date) ||
    asDate(record.createdAt) ||
    asDate(record.created_at)
  );
}

function sortMeasurementsDesc(
  records: RawMeasurementRecord[]
): RawMeasurementRecord[] {
  return [...records].sort((a, b) => {
    const aTime = measurementDate(a)?.getTime() ?? 0;
    const bTime = measurementDate(b)?.getTime() ?? 0;
    return bTime - aTime;
  });
}

function derivePriority(
  cadenceDays: number,
  daysOverdue: number,
  hasRecentRejected: boolean
): Exclude<JobPriority, 'critical'> {
  if (hasRecentRejected) return 'high';
  if (daysOverdue >= cadenceDays) return 'high';
  if (cadenceDays <= 7 && daysOverdue >= 3) return 'high';
  if (daysOverdue >= Math.max(2, Math.ceil(cadenceDays / 3))) return 'normal';
  return 'low';
}

export function evaluateOverdueMeasurementDetection(params: {
  indicator: NormalizedIndicatorSchedule;
  measurements: RawMeasurementRecord[];
  now: Date;
  indicatorLastMeasurementDate?: Date | null;
}): DetectionEvaluation | null {
  const { indicator, measurements, now } = params;
  const sortedMeasurements = sortMeasurementsDesc(measurements);

  const latestRejected = sortedMeasurements.find(isRejectedMeasurement);
  const latestAcceptedOrPending = sortedMeasurements.find(
    m => !isRejectedMeasurement(m)
  );

  const lastMeasurementDate =
    (latestAcceptedOrPending
      ? measurementDate(latestAcceptedOrPending)
      : null) ||
    params.indicatorLastMeasurementDate ||
    null;

  const referenceDate = lastMeasurementDate || indicator.createdAt;
  if (!referenceDate) return null;

  const dueDate = addDaysUtc(referenceDate, indicator.cadenceDays);
  const daysOverdue = dayDiffUtc(now, dueDate);
  if (daysOverdue < 1) return null;

  const detectionKind: DetectionKind = lastMeasurementDate
    ? 'overdue'
    : 'missing';
  const latestRejectedMeasurementDate =
    (latestRejected && measurementDate(latestRejected)) || null;
  const priority = derivePriority(
    indicator.cadenceDays,
    daysOverdue,
    Boolean(latestRejectedMeasurementDate)
  );
  const notificationStage: NotificationStage =
    priority === 'high' ? 'escalation' : 'reminder';

  return {
    indicatorId: indicator.indicatorId,
    organizationId: indicator.organizationId,
    indicatorName: indicator.indicatorName,
    frequency: indicator.frequency,
    cadenceDays: indicator.cadenceDays,
    dueDate,
    daysOverdue,
    detectionKind,
    priority,
    notificationStage,
    responsibleUserId: indicator.responsibleUserId,
    processDefinitionId: indicator.processDefinitionId,
    objectiveId: indicator.objectiveId,
    lastMeasurementDate,
    latestRejectedMeasurementDate,
  };
}

export function buildQualityMeasurementOverdueIdempotencyKey(
  evaluation: Pick<
    DetectionEvaluation,
    'organizationId' | 'indicatorId' | 'notificationStage' | 'dueDate'
  >
): string {
  return [
    'quality-measurement-overdue',
    evaluation.organizationId,
    evaluation.indicatorId,
    evaluation.notificationStage,
    toYmdUtc(evaluation.dueDate),
  ].join(':');
}

function buildPayload(
  evaluation: DetectionEvaluation,
  detectedAt: Date
): QualityMeasurementOverdueJobPayload {
  return {
    event_type: 'quality.measurement.overdue',
    organization_id: evaluation.organizationId,
    indicator_id: evaluation.indicatorId,
    indicator_name: evaluation.indicatorName,
    indicator_frequency: evaluation.frequency,
    process_definition_id: evaluation.processDefinitionId,
    objective_id: evaluation.objectiveId,
    responsible_user_id: evaluation.responsibleUserId,
    detection_kind: evaluation.detectionKind,
    notification_stage: evaluation.notificationStage,
    priority: evaluation.priority,
    due_date: toIsoDate(evaluation.dueDate),
    days_overdue: evaluation.daysOverdue,
    last_measurement_date: evaluation.lastMeasurementDate
      ? toIsoDate(evaluation.lastMeasurementDate)
      : null,
    latest_rejected_measurement_date: evaluation.latestRejectedMeasurementDate
      ? toIsoDate(evaluation.latestRejectedMeasurementDate)
      : null,
    detected_at: toIsoDate(detectedAt),
    detection_criteria: {
      cadence_days: evaluation.cadenceDays,
      considered_measurement_status: 'accepted_or_pending',
      rejected_measurements_do_not_close_cycle: true,
    },
  };
}

function defaultDeps(): DetectorDeps {
  const db = getAdminFirestore();

  const safeGetDocs = async (queries: Array<() => Promise<any>>) => {
    for (const execute of queries) {
      try {
        const snapshot = await execute();
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        continue;
      }
    }
    return [] as RawMeasurementRecord[];
  };

  return {
    async listIndicators(
      organizationId: string
    ): Promise<RawIndicatorRecord[]> {
      const results: RawIndicatorRecord[] = [];

      try {
        const sdkSnapshot = await db
          .collection('qualityIndicators')
          .where('organization_id', '==', organizationId)
          .get();

        results.push(
          ...sdkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        );
      } catch (error) {
        console.warn(
          '[QualityMeasurementOverdueDetector] Error reading qualityIndicators:',
          error
        );
      }

      try {
        const legacySnapshot = await db
          .collection('quality_indicators')
          .where('organization_id', '==', organizationId)
          .get();

        const existingIds = new Set(results.map(i => i.id));
        for (const doc of legacySnapshot.docs) {
          if (existingIds.has(doc.id)) continue;
          results.push({ id: doc.id, ...doc.data() });
        }
      } catch (error) {
        console.warn(
          '[QualityMeasurementOverdueDetector] Error reading quality_indicators:',
          error
        );
      }

      return results;
    },

    async listMeasurementsForIndicator(
      organizationId: string,
      indicatorId: string
    ): Promise<RawMeasurementRecord[]> {
      const sdkMeasurements = await safeGetDocs([
        () =>
          db
            .collection('measurements')
            .where('organization_id', '==', organizationId)
            .where('indicatorId', '==', indicatorId)
            .where('deletedAt', '==', null)
            .orderBy('date', 'desc')
            .limit(5)
            .get(),
        () =>
          db
            .collection('measurements')
            .where('organization_id', '==', organizationId)
            .where('indicatorId', '==', indicatorId)
            .orderBy('date', 'desc')
            .limit(5)
            .get(),
        () =>
          db
            .collection('measurements')
            .where('organization_id', '==', organizationId)
            .where('indicatorId', '==', indicatorId)
            .get(),
      ]);

      const legacyMeasurements = await safeGetDocs([
        () =>
          db
            .collection('measurements')
            .where('organization_id', '==', organizationId)
            .where('indicator_id', '==', indicatorId)
            .orderBy('measurement_date', 'desc')
            .limit(5)
            .get(),
        () =>
          db
            .collection('measurements')
            .where('organization_id', '==', organizationId)
            .where('indicator_id', '==', indicatorId)
            .get(),
      ]);

      return sortMeasurementsDesc([
        ...sdkMeasurements,
        ...legacyMeasurements,
      ]).slice(0, 10);
    },

    enqueueJob: (request: CreateAgentJobRequest, agentInstanceId: string) =>
      AgentQueueService.enqueueJob(request, agentInstanceId),

    now: () => new Date(),
  };
}

export class QualityMeasurementOverdueDetectorService {
  private readonly deps: DetectorDeps;

  constructor(deps?: Partial<DetectorDeps>) {
    if (
      deps?.listIndicators &&
      deps?.listMeasurementsForIndicator &&
      deps?.enqueueJob &&
      deps?.now
    ) {
      this.deps = deps as DetectorDeps;
      return;
    }

    const base = defaultDeps();
    this.deps = { ...base, ...deps };
  }

  async detectAndEnqueue(
    input: QualityMeasurementDetectorRunInput
  ): Promise<QualityMeasurementDetectorRunResult> {
    const now = this.deps.now();
    const dryRun = Boolean(input.dryRun);
    const rawIndicators = await this.deps.listIndicators(input.organizationId);
    const maxIndicators = Math.max(
      1,
      input.maxIndicators || rawIndicators.length
    );
    const indicators = rawIndicators.slice(0, maxIndicators);

    let skippedInactive = 0;
    let skippedInvalid = 0;
    const jobs: QualityMeasurementDetectorRunJobResult[] = [];

    for (const rawIndicator of indicators) {
      if (!isIndicatorActive(rawIndicator)) {
        skippedInactive++;
        continue;
      }

      const normalized = normalizeIndicatorSchedule(rawIndicator);
      if (!normalized || normalized.organizationId !== input.organizationId) {
        skippedInvalid++;
        continue;
      }

      const indicatorLastMeasurementDate =
        asDate(rawIndicator.lastMeasurement) ||
        asDate(rawIndicator.last_measurement_date) ||
        null;

      const measurements = await this.deps.listMeasurementsForIndicator(
        input.organizationId,
        normalized.indicatorId
      );

      const evaluation = evaluateOverdueMeasurementDetection({
        indicator: normalized,
        measurements,
        now,
        indicatorLastMeasurementDate,
      });

      if (!evaluation) continue;

      const idempotencyKey =
        buildQualityMeasurementOverdueIdempotencyKey(evaluation);
      const payload = buildPayload(evaluation, now);

      const jobResult: QualityMeasurementDetectorRunJobResult = {
        indicator_id: evaluation.indicatorId,
        indicator_name: evaluation.indicatorName,
        detection_kind: evaluation.detectionKind,
        priority: evaluation.priority,
        notification_stage: evaluation.notificationStage,
        due_date: payload.due_date,
        days_overdue: evaluation.daysOverdue,
        idempotency_key: idempotencyKey,
      };

      if (!dryRun) {
        const userId = evaluation.responsibleUserId || 'system';
        const agentInstanceId = evaluation.responsibleUserId || 'system';

        const request: CreateAgentJobRequest = {
          organization_id: input.organizationId,
          user_id: userId,
          intent: OVERDUE_INTENT,
          payload,
          priority: evaluation.priority,
          idempotency_key: idempotencyKey,
        };

        jobResult.job_id = await this.deps.enqueueJob(request, agentInstanceId);
      }

      jobs.push(jobResult);
    }

    return {
      organization_id: input.organizationId,
      run_at: now.toISOString(),
      dry_run: dryRun,
      scanned_indicators: indicators.length,
      detected: jobs.length,
      enqueued: dryRun ? 0 : jobs.filter(job => Boolean(job.job_id)).length,
      skipped_inactive: skippedInactive,
      skipped_invalid: skippedInvalid,
      jobs,
    };
  }
}

export const QUALITY_MEASUREMENT_OVERDUE_INTENT = OVERDUE_INTENT;
