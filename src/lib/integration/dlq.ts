import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const INTEGRATION_DLQ_COLLECTION = 'integration_dlq';
const RETRY_SCHEDULE_MINUTES = [1, 2, 4];

export function computeNextRetryDate(retries: number): Date {
  const index = Math.min(
    Math.max(retries, 0),
    RETRY_SCHEDULE_MINUTES.length - 1
  );
  const minutes = RETRY_SCHEDULE_MINUTES[index];
  return new Date(Date.now() + minutes * 60_000);
}

export async function writeIntegrationDLQ(params: {
  source: 'events' | 'accounting' | 'billing' | 'other';
  operation: string;
  payload: Record<string, unknown>;
  error: unknown;
  retries?: number;
  traceId?: string;
}) {
  const retries = params.retries || 0;
  const errorMessage =
    params.error instanceof Error
      ? params.error.message
      : JSON.stringify(params.error);

  await adminDb.collection(INTEGRATION_DLQ_COLLECTION).add({
    envelope_version: 'v1',
    source: params.source,
    operation: params.operation,
    payload: params.payload,
    error_message: errorMessage,
    retries,
    next_retry_at: computeNextRetryDate(retries),
    status: retries >= RETRY_SCHEDULE_MINUTES.length ? 'dead' : 'pending',
    trace_id: params.traceId || null,
    created_at: FieldValue.serverTimestamp(),
  });
}
