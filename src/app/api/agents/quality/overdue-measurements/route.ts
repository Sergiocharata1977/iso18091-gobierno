import { aiTelemetry } from '@/ai/telemetry';
import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentQueueService } from '@/services/agents/AgentQueueService';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'];
const QUALITY_INDICATORS_COLLECTION = 'quality_indicators';
const DEFAULT_INTENT = 'quality.measurement.overdue.detected';
const DEFAULT_MAX_SCAN = 500;
const DEFAULT_ENQUEUE_LIMIT = 100;

interface TriggerBody {
  organizationId?: string;
  organization_id?: string;
  dryRun?: boolean | string | number;
  maxScan?: number;
  enqueueLimit?: number;
  intent?: string;
  source?: string;
  userId?: string;
  user_id?: string;
  indicatorIds?: string[];
}

interface OverdueMeasurementCandidate {
  indicatorId: string;
  responsibleUserId: string;
  frequencyDays: number;
  dueDate: string | null;
  overdueDays: number | null;
  severity: 'pending' | 'overdue';
  lastMeasurementDate: string | null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in (value as Record<string, unknown>) &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime())
      ? parsed
      : null;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as Record<string, unknown>)
  ) {
    const seconds = Number((value as { seconds?: unknown }).seconds);
    if (!Number.isFinite(seconds)) return null;
    return new Date(seconds * 1000);
  }

  return null;
}

function daysForFrequency(freq?: string): number {
  switch ((freq || '').toLowerCase()) {
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
      return 30;
  }
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'si'].includes(normalized)) return true;
  if (['0', 'false', 'no'].includes(normalized)) return false;
  return defaultValue;
}

function clampInt(
  value: unknown,
  defaultValue: number,
  min: number,
  max: number
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function buildOrgScope(
  auth: { organizationId: string; role: string },
  body: TriggerBody,
  requestUrl: string
): { organizationId?: string; error?: NextResponse } {
  const url = new URL(requestUrl);
  const requestedOrgId =
    body.organizationId ||
    body.organization_id ||
    url.searchParams.get('organizationId') ||
    url.searchParams.get('organization_id') ||
    undefined;

  if (
    requestedOrgId &&
    auth.role !== 'super_admin' &&
    requestedOrgId !== auth.organizationId
  ) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden organization' },
        { status: 403 }
      ),
    };
  }

  const organizationId =
    auth.role === 'super_admin'
      ? requestedOrgId || auth.organizationId
      : auth.organizationId;

  if (!organizationId) {
    return {
      error: NextResponse.json(
        { error: 'Organization ID missing' },
        { status: 400 }
      ),
    };
  }

  return { organizationId };
}

function buildCandidateFromIndicator(
  indicatorId: string,
  indicator: Record<string, unknown>,
  now: Date
): OverdueMeasurementCandidate | null {
  const responsibleUserId =
    typeof indicator.responsible_user_id === 'string'
      ? indicator.responsible_user_id.trim()
      : '';

  if (!responsibleUserId) return null;

  const isActive = indicator.is_active !== false;
  const status = String(indicator.status || 'activo').toLowerCase();
  if (!isActive || ['inactivo', 'suspendido'].includes(status)) return null;

  const frequencyDays = daysForFrequency(
    typeof indicator.measurement_frequency === 'string'
      ? indicator.measurement_frequency
      : undefined
  );

  const lastMeasurementDate = toDate(indicator.last_measurement_date);
  if (!lastMeasurementDate) {
    return {
      indicatorId,
      responsibleUserId,
      frequencyDays,
      dueDate: null,
      overdueDays: null,
      severity: 'overdue',
      lastMeasurementDate: null,
    };
  }

  const dueDate = new Date(
    lastMeasurementDate.getTime() + frequencyDays * 86400000
  );
  if (dueDate > now) return null;

  const overdueThreshold = new Date(
    dueDate.getTime() + Math.max(1, Math.floor(frequencyDays / 2)) * 86400000
  );
  const overdueDays = Math.max(
    0,
    Math.floor((now.getTime() - dueDate.getTime()) / 86400000)
  );

  return {
    indicatorId,
    responsibleUserId,
    frequencyDays,
    dueDate: dueDate.toISOString(),
    overdueDays,
    severity: overdueThreshold <= now ? 'overdue' : 'pending',
    lastMeasurementDate: lastMeasurementDate.toISOString(),
  };
}

async function detectOverdueMeasurementCandidates(
  organizationId: string,
  now: Date,
  maxScan: number,
  filters?: { userId?: string; indicatorIds?: string[] }
): Promise<{
  candidates: OverdueMeasurementCandidate[];
  scanned: number;
  skippedNoResponsible: number;
}> {
  const db = getAdminFirestore();
  let query = db
    .collection(QUALITY_INDICATORS_COLLECTION)
    .where('organization_id', '==', organizationId) as any;

  query = query.limit(maxScan);
  const snapshot = await query.get();

  let skippedNoResponsible = 0;
  const indicatorIdFilter =
    filters?.indicatorIds && filters.indicatorIds.length > 0
      ? new Set(filters.indicatorIds.map(id => id.trim()).filter(Boolean))
      : null;
  const userIdFilter = filters?.userId?.trim() || null;

  const candidates: OverdueMeasurementCandidate[] = [];
  for (const doc of snapshot.docs as Array<{ id: string; data: () => any }>) {
    if (indicatorIdFilter && !indicatorIdFilter.has(doc.id)) continue;

    const raw = (doc.data?.() || {}) as Record<string, unknown>;
    if (
      !raw.responsible_user_id ||
      typeof raw.responsible_user_id !== 'string' ||
      !raw.responsible_user_id.trim()
    ) {
      skippedNoResponsible++;
      continue;
    }

    if (userIdFilter && raw.responsible_user_id !== userIdFilter) continue;

    const candidate = buildCandidateFromIndicator(doc.id, raw, now);
    if (candidate) candidates.push(candidate);
  }

  candidates.sort((a, b) => {
    const aWeight = a.severity === 'overdue' ? 0 : 1;
    const bWeight = b.severity === 'overdue' ? 0 : 1;
    if (aWeight !== bWeight) return aWeight - bWeight;
    return (b.overdueDays || 0) - (a.overdueDays || 0);
  });

  return {
    candidates,
    scanned: snapshot.docs.length,
    skippedNoResponsible,
  };
}

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    const startedAt = Date.now();
    const requestId = `agents-overdue-measurements:${startedAt}:${auth.uid}`;
    const routeId = '/api/agents/quality/overdue-measurements';

    try {
      const body = ((await request.json().catch(() => ({}))) ||
        {}) as TriggerBody;
      const orgScope = buildOrgScope(auth, body, request.url);
      if (orgScope.error) return orgScope.error;
      const organizationId = orgScope.organizationId!;

      const dryRun = parseBoolean(body.dryRun, true);
      const maxScan = clampInt(body.maxScan, DEFAULT_MAX_SCAN, 1, 2000);
      const enqueueLimit = clampInt(
        body.enqueueLimit,
        DEFAULT_ENQUEUE_LIMIT,
        1,
        500
      );
      const intent = (body.intent || DEFAULT_INTENT).trim() || DEFAULT_INTENT;
      const source = (body.source || 'manual').trim().toLowerCase() || 'manual';
      const targetUserId =
        (body.userId || body.user_id || '').trim() || undefined;
      const indicatorIds = Array.isArray(body.indicatorIds)
        ? body.indicatorIds.slice(0, 500)
        : undefined;

      aiTelemetry.requestStarted({
        route: routeId,
        org_id: organizationId,
        user_id: auth.uid,
        capability: 'agents_quality_overdue_measurements_trigger',
        request_id: requestId,
        metadata: {
          dryRun,
          source,
          maxScan,
          enqueueLimit,
        },
      });

      const now = new Date();
      const detection = await detectOverdueMeasurementCandidates(
        organizationId,
        now,
        maxScan,
        {
          userId: targetUserId,
          indicatorIds,
        }
      );

      const limitedCandidates = detection.candidates.slice(0, enqueueLimit);
      const skippedByLimit = Math.max(
        0,
        detection.candidates.length - limitedCandidates.length
      );

      let jobsCreated = 0;
      let jobsFailed = 0;
      const enqueueErrors: Array<{ indicatorId: string; code: string }> = [];

      if (!dryRun) {
        for (let index = 0; index < limitedCandidates.length; index++) {
          const candidate = limitedCandidates[index];
          try {
            const idempotencyKey = [
              'quality.measurement.overdue',
              organizationId,
              candidate.indicatorId,
              candidate.dueDate?.slice(0, 10) || 'no-last-measurement',
            ].join(':');

            await AgentQueueService.enqueueJob(
              {
                organization_id: organizationId,
                user_id: auth.uid,
                intent,
                priority: candidate.severity === 'overdue' ? 'high' : 'normal',
                payload: {
                  kind: 'quality_measurement_overdue',
                  organization_id: organizationId,
                  indicator_id: candidate.indicatorId,
                  responsible_user_id: candidate.responsibleUserId,
                  last_measurement_date: candidate.lastMeasurementDate,
                  due_date: candidate.dueDate,
                  overdue_days: candidate.overdueDays,
                  severity: candidate.severity,
                  trigger: {
                    source,
                    request_id: requestId,
                    triggered_by: auth.uid,
                    triggered_at: now.toISOString(),
                    dry_run: false,
                  },
                },
                workflow_id: `quality-measurements-overdue:${organizationId}:${now.toISOString().slice(0, 10)}`,
                step_index: index,
                idempotency_key: idempotencyKey,
              },
              candidate.responsibleUserId
            );
            jobsCreated++;
          } catch (error) {
            jobsFailed++;
            const normalized =
              error instanceof Error ? error : new Error(String(error));
            enqueueErrors.push({
              indicatorId: candidate.indicatorId,
              code: normalized.name || 'ENQUEUE_JOB_FAILED',
            });

            aiTelemetry.requestFailed({
              route: routeId,
              org_id: organizationId,
              user_id: auth.uid,
              capability: 'agents_quality_overdue_measurements_trigger',
              request_id: requestId,
              error_code: normalized.name || 'ENQUEUE_JOB_FAILED',
              error_message: normalized.message,
              metadata: {
                phase: 'enqueue_job',
                indicator_id: candidate.indicatorId,
              },
            });
          }
        }
      }

      const latency = Date.now() - startedAt;
      aiTelemetry.requestSucceeded({
        route: routeId,
        org_id: organizationId,
        user_id: auth.uid,
        capability: 'agents_quality_overdue_measurements_trigger',
        request_id: requestId,
        latency,
        metadata: {
          source,
          dryRun,
          scanned: detection.scanned,
          detected: detection.candidates.length,
          enqueued_attempted: dryRun ? 0 : limitedCandidates.length,
          jobs_created: jobsCreated,
          jobs_failed: jobsFailed,
          skipped_no_responsible: detection.skippedNoResponsible,
          skipped_by_limit: skippedByLimit,
        },
      });

      return NextResponse.json({
        ok: true,
        dryRun,
        requestId,
        organizationId,
        source,
        intent,
        summary: {
          scannedIndicators: detection.scanned,
          detectedCandidates: detection.candidates.length,
          queuedJobs: jobsCreated,
          failedJobs: jobsFailed,
          skippedNoResponsible: detection.skippedNoResponsible,
          skippedByLimit,
        },
        sample: limitedCandidates.slice(0, 10).map(candidate => ({
          indicatorId: candidate.indicatorId,
          severity: candidate.severity,
          dueDate: candidate.dueDate,
          overdueDays: candidate.overdueDays,
        })),
        timestamp: now.toISOString(),
      });
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      aiTelemetry.requestFailed({
        route: '/api/agents/quality/overdue-measurements',
        org_id: auth.organizationId || null,
        user_id: auth.uid,
        capability: 'agents_quality_overdue_measurements_trigger',
        request_id: requestId,
        latency: Date.now() - startedAt,
        error_code: normalized.name || 'TRIGGER_FAILED',
        error_message: normalized.message,
      });
      console.error('[API /agents/quality/overdue-measurements] Error:', error);

      return NextResponse.json(
        { error: 'Error al ejecutar trigger de mediciones vencidas' },
        { status: 500 }
      );
    }
  },
  { roles: ALLOWED_ROLES as any }
);
