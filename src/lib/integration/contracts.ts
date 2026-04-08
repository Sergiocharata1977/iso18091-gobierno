import { randomUUID } from 'crypto';

export interface EventEnvelopeV1 {
  envelope_version: 'v1';
  event_id: string;
  event_type: string;
  organization_id: string;
  occurred_at: string;
  producer: string;
  trace_id: string;
  idempotency_key?: string | null;
  payload_ref?: {
    collection: string;
    id: string;
  };
}

export interface IntegrationDLQEntry {
  envelope_version: 'v1';
  source: 'events' | 'accounting' | 'billing' | 'other';
  operation: string;
  error_message: string;
  payload: Record<string, unknown>;
  retries: number;
  next_retry_at: Date;
  status: 'pending' | 'retrying' | 'dead';
  trace_id: string;
  created_at: unknown;
}

export function createEventEnvelopeV1(input: {
  eventType: string;
  organizationId: string;
  producer: string;
  idempotencyKey?: string | null;
  payloadRef?: { collection: string; id: string };
  traceId?: string;
}): EventEnvelopeV1 {
  return {
    envelope_version: 'v1',
    event_id: randomUUID(),
    event_type: input.eventType,
    organization_id: input.organizationId,
    occurred_at: new Date().toISOString(),
    producer: input.producer,
    trace_id: input.traceId || randomUUID(),
    idempotency_key: input.idempotencyKey || null,
    payload_ref: input.payloadRef,
  };
}
