import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  validateSystemActivityLogEntry,
  validateSystemActivityLogFilters,
  validateSystemActivityLogWriteInput,
} from '@/lib/validations/systemActivityLog';
import type {
  SystemActivityLogEntry,
  SystemActivityLogFilters,
  SystemActivityLogWriteInput,
} from '@/types/system-activity-log';
import { Timestamp, type Query } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'system_activity_log';
const DEFAULT_LIMIT = 100;
const MAX_ENTITY_RESULTS = 100;

type FirestoreDoc = Record<string, unknown>;

type SystemActivityUserActionInput = Omit<
  SystemActivityLogWriteInput,
  | 'actor_type'
  | 'recorded_at'
  | 'related_entities'
  | 'evidence_refs'
  | 'actor_user_id'
  | 'actor_display_name'
  | 'actor_role'
  | 'actor_department_id'
  | 'actor_department_name'
> & {
  actor_user_id: string;
  actor_display_name?: string | null;
  actor_role?: string | null;
  actor_department_id?: string | null;
  actor_department_name?: string | null;
  recorded_at?: Date;
  related_entities?: SystemActivityLogWriteInput['related_entities'];
  evidence_refs?: SystemActivityLogWriteInput['evidence_refs'];
};

type SystemActivitySystemActionInput = Omit<
  SystemActivityLogWriteInput,
  | 'actor_type'
  | 'recorded_at'
  | 'related_entities'
  | 'evidence_refs'
  | 'actor_user_id'
  | 'actor_display_name'
  | 'actor_role'
  | 'actor_department_id'
  | 'actor_department_name'
> & {
  actor_type?: SystemActivityLogWriteInput['actor_type'];
  actor_user_id?: string | null;
  actor_display_name?: string | null;
  actor_role?: string | null;
  actor_department_id?: string | null;
  actor_department_name?: string | null;
  recorded_at?: Date;
  related_entities?: SystemActivityLogWriteInput['related_entities'];
  evidence_refs?: SystemActivityLogWriteInput['evidence_refs'];
};

function normalizeOptionalArrays(
  input: SystemActivityLogWriteInput
): SystemActivityLogWriteInput {
  return {
    ...input,
    related_entities: input.related_entities ?? [],
    evidence_refs: input.evidence_refs ?? [],
  };
}

function asDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return undefined;
}

function mapDocToEntry(id: string, data: FirestoreDoc): SystemActivityLogEntry {
  return validateSystemActivityLogEntry({
    id,
    ...data,
    occurred_at: asDate(data.occurred_at),
    recorded_at: asDate(data.recorded_at),
    metadata:
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : undefined,
  });
}

function applyScalarFilters(
  baseQuery: Query,
  filters: SystemActivityLogFilters
): Query {
  let query = baseQuery;

  if (filters.source_module) {
    query = query.where('source_module', '==', filters.source_module);
  }

  if (filters.source_submodule) {
    query = query.where('source_submodule', '==', filters.source_submodule);
  }

  if (filters.actor_user_id) {
    query = query.where('actor_user_id', '==', filters.actor_user_id);
  }

  if (filters.actor_department_id) {
    query = query.where(
      'actor_department_id',
      '==',
      filters.actor_department_id
    );
  }

  if (filters.channel) {
    query = query.where('channel', '==', filters.channel);
  }

  if (filters.entity_type) {
    query = query.where('entity_type', '==', filters.entity_type);
  }

  if (filters.entity_id) {
    query = query.where('entity_id', '==', filters.entity_id);
  }

  if (filters.action_type) {
    query = query.where('action_type', '==', filters.action_type);
  }

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters.severity) {
    query = query.where('severity', '==', filters.severity);
  }

  if (filters.correlation_id) {
    query = query.where('correlation_id', '==', filters.correlation_id);
  }

  return query;
}

function applyPreferredDateRange(
  baseQuery: Query,
  filters: SystemActivityLogFilters
): Query {
  let query = baseQuery;

  if (filters.recorded_from) {
    query = query.where(
      'recorded_at',
      '>=',
      Timestamp.fromDate(filters.recorded_from)
    );
  }

  if (filters.recorded_to) {
    query = query.where(
      'recorded_at',
      '<=',
      Timestamp.fromDate(filters.recorded_to)
    );
  }

  if (!filters.recorded_from && !filters.recorded_to) {
    if (filters.occurred_from) {
      query = query.where(
        'occurred_at',
        '>=',
        Timestamp.fromDate(filters.occurred_from)
      );
    }

    if (filters.occurred_to) {
      query = query.where(
        'occurred_at',
        '<=',
        Timestamp.fromDate(filters.occurred_to)
      );
    }
  }

  return query;
}

function matchesPostQueryRanges(
  entry: SystemActivityLogEntry,
  filters: SystemActivityLogFilters
): boolean {
  if (filters.recorded_from && entry.recorded_at < filters.recorded_from) {
    return false;
  }

  if (filters.recorded_to && entry.recorded_at > filters.recorded_to) {
    return false;
  }

  if (filters.occurred_from && entry.occurred_at < filters.occurred_from) {
    return false;
  }

  if (filters.occurred_to && entry.occurred_at > filters.occurred_to) {
    return false;
  }

  return true;
}

export class SystemActivityLogService {
  static async log(input: SystemActivityLogWriteInput): Promise<string> {
    try {
      const db = getAdminFirestore();
      const validated = validateSystemActivityLogWriteInput(input);
      const normalized = normalizeOptionalArrays(validated);
      const recordedAt = normalized.recorded_at ?? new Date();

      const payload = {
        ...normalized,
        recorded_at: Timestamp.fromDate(recordedAt),
        occurred_at: Timestamp.fromDate(normalized.occurred_at),
      };

      const docRef = await db.collection(COLLECTION_NAME).add(payload);
      return docRef.id;
    } catch (error) {
      console.error(
        '[SystemActivityLogService] Error logging activity:',
        error
      );
      return '';
    }
  }

  static async logUserAction(
    input: SystemActivityUserActionInput
  ): Promise<string> {
    return this.log({
      ...input,
      actor_type: 'user',
      actor_display_name: input.actor_display_name ?? null,
      actor_role: input.actor_role ?? null,
      actor_department_id: input.actor_department_id ?? null,
      actor_department_name: input.actor_department_name ?? null,
      related_entities: input.related_entities ?? [],
      evidence_refs: input.evidence_refs ?? [],
    });
  }

  static async logSystemAction(
    input: SystemActivitySystemActionInput
  ): Promise<string> {
    return this.log({
      ...input,
      actor_type: input.actor_type ?? 'system',
      actor_user_id: input.actor_user_id ?? null,
      actor_display_name: input.actor_display_name ?? null,
      actor_role: input.actor_role ?? null,
      actor_department_id: input.actor_department_id ?? null,
      actor_department_name: input.actor_department_name ?? null,
      related_entities: input.related_entities ?? [],
      evidence_refs: input.evidence_refs ?? [],
    });
  }

  static async getByOrganization(
    organizationId: string,
    filters?: Omit<SystemActivityLogFilters, 'organization_id'>
  ): Promise<SystemActivityLogEntry[]> {
    try {
      const db = getAdminFirestore();
      const validatedFilters = validateSystemActivityLogFilters({
        ...filters,
        organization_id: organizationId,
      });
      const limit = validatedFilters.limit ?? DEFAULT_LIMIT;

      let query: Query = db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId);

      query = applyScalarFilters(query, validatedFilters);
      query = applyPreferredDateRange(query, validatedFilters);
      query = query.orderBy('occurred_at', 'desc').limit(limit);

      const snapshot = await query.get();
      const entries = snapshot.docs
        .map(doc => mapDocToEntry(doc.id, doc.data() as FirestoreDoc))
        .filter(entry => matchesPostQueryRanges(entry, validatedFilters));

      return entries;
    } catch (error) {
      console.error(
        '[SystemActivityLogService] Error fetching organization activity:',
        error
      );
      return [];
    }
  }

  static async getByEntity(
    organizationId: string,
    entityType: string,
    entityId: string
  ): Promise<SystemActivityLogEntry[]> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .where('entity_type', '==', entityType)
        .where('entity_id', '==', entityId)
        .orderBy('occurred_at', 'desc')
        .limit(MAX_ENTITY_RESULTS)
        .get();

      return snapshot.docs.map(doc =>
        mapDocToEntry(doc.id, doc.data() as FirestoreDoc)
      );
    } catch (error) {
      console.error(
        '[SystemActivityLogService] Error fetching entity activity:',
        error
      );
      return [];
    }
  }
}
