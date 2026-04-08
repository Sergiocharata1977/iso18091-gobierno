import { AccountingEngine } from '@/lib/accounting/AccountingEngine';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  AccountingEvent,
  AccountingOutboxEntry,
  AccountingOutboxStatus,
} from '@/types/accounting';

const OUTBOX_COLLECTION = 'acc_outbox';

interface AccountingProcessResult {
  entry_id: string;
  total_debe: number;
  total_haber: number;
}

export interface OutboxProcessResult extends AccountingProcessResult {
  outbox_id: string;
  outbox_status: AccountingOutboxStatus;
  attempts: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildOutboxId(event: AccountingEvent): string {
  return Buffer.from(
    `${event.organization_id}:${event.idempotency_key}`,
    'utf8'
  ).toString('base64url');
}

function mapOutboxEntry(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): AccountingOutboxEntry {
  return {
    id,
    ...(data || {}),
  } as AccountingOutboxEntry;
}

async function loadOutboxEntry(
  outboxId: string
): Promise<AccountingOutboxEntry | null> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(OUTBOX_COLLECTION).doc(outboxId).get();

  if (!snapshot.exists) {
    return null;
  }

  return mapOutboxEntry(snapshot.id, snapshot.data());
}

async function ensurePendingEntry(
  event: AccountingEvent
): Promise<AccountingOutboxEntry> {
  const db = getAdminFirestore();
  const outboxId = buildOutboxId(event);
  const outboxRef = db.collection(OUTBOX_COLLECTION).doc(outboxId);

  return db.runTransaction(async tx => {
    const snapshot = await tx.get(outboxRef);
    const timestamp = nowIso();

    if (snapshot.exists) {
      const current = mapOutboxEntry(snapshot.id, snapshot.data());
      if (current.organization_id !== event.organization_id) {
        throw new Error('Conflicto de outbox para otra organizacion');
      }

      if (current.status === 'processed') {
        return current;
      }

      const nextState: Partial<AccountingOutboxEntry> = {
        event,
        status: 'pending',
        updated_at: timestamp,
        last_error: current.last_error || null,
      };

      tx.set(outboxRef, nextState, { merge: true });
      return {
        ...current,
        ...nextState,
      } as AccountingOutboxEntry;
    }

    const created: AccountingOutboxEntry = {
      id: outboxId,
      organization_id: event.organization_id,
      event_id: event.id,
      idempotency_key: event.idempotency_key,
      plugin_id: event.plugin_id,
      operation_type: event.operation_type,
      status: 'pending',
      event,
      attempts: 0,
      last_error: null,
      process_result: null,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: event.created_by,
    };

    const { id: _id, ...persisted } = created;
    void _id;
    tx.set(outboxRef, persisted);
    return created;
  });
}

async function finalizeOutboxEntry(params: {
  outboxId: string;
  status: 'processed' | 'failed';
  errorMessage?: string;
  processResult?: AccountingProcessResult;
}): Promise<AccountingOutboxEntry> {
  const db = getAdminFirestore();
  const outboxRef = db.collection(OUTBOX_COLLECTION).doc(params.outboxId);

  return db.runTransaction(async tx => {
    const snapshot = await tx.get(outboxRef);
    if (!snapshot.exists) {
      throw new Error('Evento de outbox no encontrado');
    }

    const current = mapOutboxEntry(snapshot.id, snapshot.data());
    const timestamp = nowIso();
    const attempts = Number(current.attempts || 0) + 1;
    const nextState: Partial<AccountingOutboxEntry> = {
      attempts,
      status: params.status,
      updated_at: timestamp,
      last_attempt_at: timestamp,
      last_error:
        params.status === 'failed' ? params.errorMessage || 'unknown_error' : null,
      process_result:
        params.status === 'processed' ? params.processResult || null : null,
      processed_at: params.status === 'processed' ? timestamp : current.processed_at,
      failed_at: params.status === 'failed' ? timestamp : current.failed_at,
    };

    tx.set(outboxRef, nextState, { merge: true });
    return {
      ...current,
      ...nextState,
    } as AccountingOutboxEntry;
  });
}

async function executeOutboxEntry(
  outboxEntry: AccountingOutboxEntry
): Promise<OutboxProcessResult> {
  try {
    const result = await AccountingEngine.process(outboxEntry.event);
    const updated = await finalizeOutboxEntry({
      outboxId: outboxEntry.id,
      status: 'processed',
      processResult: result,
    });

    return {
      ...result,
      outbox_id: updated.id,
      outbox_status: updated.status,
      attempts: updated.attempts,
    };
  } catch (error) {
    await finalizeOutboxEntry({
      outboxId: outboxEntry.id,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    throw error;
  }
}

export const OutboxService = {
  async processEvent(event: AccountingEvent): Promise<OutboxProcessResult> {
    const outboxEntry = await ensurePendingEntry(event);

    if (outboxEntry.status === 'processed' && outboxEntry.process_result) {
      return {
        ...outboxEntry.process_result,
        outbox_id: outboxEntry.id,
        outbox_status: outboxEntry.status,
        attempts: outboxEntry.attempts,
      };
    }

    return executeOutboxEntry(outboxEntry);
  },

  async getById(
    organizationId: string,
    outboxId: string
  ): Promise<AccountingOutboxEntry | null> {
    const entry = await loadOutboxEntry(outboxId);
    if (!entry || entry.organization_id !== organizationId) {
      return null;
    }

    return entry;
  },

  async reprocessFailedEvent(params: {
    organizationId: string;
    outboxId: string;
  }): Promise<OutboxProcessResult> {
    const entry = await this.getById(params.organizationId, params.outboxId);
    if (!entry) {
      throw new Error('Evento de outbox no encontrado');
    }

    if (entry.status === 'processed' && entry.process_result) {
      return {
        ...entry.process_result,
        outbox_id: entry.id,
        outbox_status: entry.status,
        attempts: entry.attempts,
      };
    }

    return executeOutboxEntry(entry);
  },
};
