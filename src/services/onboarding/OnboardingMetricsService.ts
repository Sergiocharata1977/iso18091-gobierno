import { getAdminFirestore } from '@/lib/firebase/admin';

export type OnboardingMetricEventType =
  | 'onboarding_started'
  | 'onboarding_step_changed'
  | 'provision_requested'
  | 'provision_completed'
  | 'provision_failed'
  | 'onboarding_completed_ui'
  | 'onboarding_failed_ui'
  | 'strategy_checklist_viewed'
  | 'strategy_checklist_completed'
  | 'draft_generation_requested'
  | 'draft_generation_completed'
  | 'draft_generation_failed';

export interface OnboardingMetricEventInput {
  organizationId: string;
  systemId?: string;
  sessionId: string;
  eventType: OnboardingMetricEventType;
  createdBy: string;
  step?: number;
  success?: boolean;
  durationMs?: number;
  createdProcesses?: number;
  skippedProcesses?: number;
  createdNormPoints?: number;
  skippedNormPoints?: number;
  processKeysCount?: number;
  startedAt?: string;
  finishedAt?: string;
  metadata?: Record<string, unknown>;
}

type FirestoreDateLike = {
  toDate?: () => Date;
  _seconds?: number;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null) {
    const maybe = value as FirestoreDateLike;
    if (typeof maybe.toDate === 'function') return maybe.toDate();
    if (typeof maybe._seconds === 'number') {
      return new Date(maybe._seconds * 1000);
    }
  }
  return null;
}

function toIsoOrNull(value: unknown): string | null {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString() : null;
}

export class OnboardingMetricsService {
  static async trackEvent(input: OnboardingMetricEventInput): Promise<string> {
    const db = getAdminFirestore();
    const now = new Date();

    const doc = await db.collection('onboarding_metrics').add({
      organization_id: input.organizationId,
      system_id: input.systemId || 'iso9001',
      session_id: input.sessionId,
      event_type: input.eventType,
      created_by: input.createdBy,
      step: input.step ?? null,
      success: input.success ?? null,
      duration_ms:
        typeof input.durationMs === 'number'
          ? Math.max(0, input.durationMs)
          : null,
      created_processes: input.createdProcesses ?? null,
      skipped_processes: input.skippedProcesses ?? null,
      created_norm_points: input.createdNormPoints ?? null,
      skipped_norm_points: input.skippedNormPoints ?? null,
      process_keys_count: input.processKeysCount ?? null,
      started_at: input.startedAt ? new Date(input.startedAt) : null,
      finished_at: input.finishedAt ? new Date(input.finishedAt) : null,
      metadata: input.metadata ?? {},
      created_at: now,
    });

    return doc.id;
  }

  static async getOrganizationOverview(organizationId: string, limit = 20) {
    const db = getAdminFirestore();
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const snapshot = await db
      .collection('onboarding_metrics')
      .where('organization_id', '==', organizationId)
      .orderBy('created_at', 'desc')
      .limit(safeLimit)
      .get();

    const events = snapshot.docs.map(doc => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        organization_id: String(data.organization_id || ''),
        system_id: String(data.system_id || 'iso9001'),
        session_id: String(data.session_id || ''),
        event_type: String(data.event_type || ''),
        created_by: String(data.created_by || ''),
        step: typeof data.step === 'number' ? data.step : null,
        success: typeof data.success === 'boolean' ? data.success : null,
        duration_ms:
          typeof data.duration_ms === 'number' ? data.duration_ms : null,
        created_processes:
          typeof data.created_processes === 'number'
            ? data.created_processes
            : null,
        skipped_processes:
          typeof data.skipped_processes === 'number'
            ? data.skipped_processes
            : null,
        created_norm_points:
          typeof data.created_norm_points === 'number'
            ? data.created_norm_points
            : null,
        skipped_norm_points:
          typeof data.skipped_norm_points === 'number'
            ? data.skipped_norm_points
            : null,
        process_keys_count:
          typeof data.process_keys_count === 'number'
            ? data.process_keys_count
            : null,
        started_at: toIsoOrNull(data.started_at),
        finished_at: toIsoOrNull(data.finished_at),
        created_at: toIsoOrNull(data.created_at),
      };
    });

    const completed = events.filter(
      item => item.event_type === 'provision_completed' && item.success === true
    );
    const uniqueSessions = new Set(
      events.map(item => item.session_id).filter(Boolean)
    );
    const durations = completed
      .map(item => item.duration_ms)
      .filter((value): value is number => typeof value === 'number');
    const totalDurationMs = durations.reduce((acc, curr) => acc + curr, 0);
    const averageEndToEndMs =
      durations.length > 0
        ? Math.round(totalDurationMs / durations.length)
        : null;

    return {
      summary: {
        organization_id: organizationId,
        total_sessions: uniqueSessions.size,
        successful_onboardings: completed.length,
        average_end_to_end_ms: averageEndToEndMs,
        total_processes_created: completed.reduce(
          (acc, curr) => acc + (curr.created_processes || 0),
          0
        ),
        last_completed_at:
          completed
            .map(item => item.finished_at || item.created_at)
            .filter(Boolean)
            .sort()
            .reverse()[0] || null,
      },
      events,
    };
  }
}
