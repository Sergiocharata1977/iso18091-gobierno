import { getAdminFirestore } from '@/lib/firebase/admin';
import { mirrorAccountingAuditLogToSystemActivity } from '@/lib/accounting/periods';
import type {
  AccountingAuditLog,
  AccountingEntry,
  AccountingEntryLine,
  AccountingPeriod,
} from '@/types/accounting';

const ENTRIES_COLLECTION = 'acc_entries';
const LINES_COLLECTION = 'acc_entry_lines';
const AUDIT_COLLECTION = 'acc_audit_log';
const PERIODS_COLLECTION = 'acc_periods';

export interface AccountingProcessResult {
  entry_id: string;
  total_debe: number;
  total_haber: number;
}

function mapEntry(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): AccountingEntry {
  return {
    id,
    ...(data || {}),
  } as AccountingEntry;
}

function mapLine(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): AccountingEntryLine {
  return {
    id,
    ...(data || {}),
  } as AccountingEntryLine;
}

export async function findPostedEntryByIdempotencyKey(
  organizationId: string,
  idempotencyKey: string
): Promise<AccountingEntry | null> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(ENTRIES_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('idempotency_key', '==', idempotencyKey)
    .where('status', '==', 'posted')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return mapEntry(doc.id, doc.data());
}

export async function findEntryByIdempotencyKey(
  organizationId: string,
  idempotencyKey: string
): Promise<AccountingEntry | null> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(ENTRIES_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('idempotency_key', '==', idempotencyKey)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return mapEntry(doc.id, doc.data());
}

export async function getPeriodByCode(
  organizationId: string,
  periodo: string
): Promise<AccountingPeriod | null> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(PERIODS_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('periodo', '==', periodo)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as AccountingPeriod;
}

export async function writeEntryBundle(params: {
  entry: Omit<AccountingEntry, 'id'>;
  lines: Array<Omit<AccountingEntryLine, 'id'>>;
  auditLog: Omit<AccountingAuditLog, 'id'>;
  entryId?: string;
}): Promise<AccountingProcessResult> {
  const db = getAdminFirestore();
  const entryRef = params.entryId
    ? db.collection(ENTRIES_COLLECTION).doc(params.entryId)
    : db.collection(ENTRIES_COLLECTION).doc();
  const lineRefs = params.lines.map(() => db.collection(LINES_COLLECTION).doc());
  const auditRef = db.collection(AUDIT_COLLECTION).doc();

  const result = await db.runTransaction(async tx => {
    tx.set(entryRef, params.entry);

    params.lines.forEach((line, index) => {
      tx.set(lineRefs[index], {
        ...line,
        entry_id: entryRef.id,
      });
    });

    tx.set(auditRef, {
      ...params.auditLog,
      entity_id:
        params.auditLog.entity_type === 'entry'
          ? entryRef.id
          : params.auditLog.entity_id,
    });

    return {
      entry_id: entryRef.id,
      total_debe: params.entry.total_debe,
      total_haber: params.entry.total_haber,
    };
  });

  await mirrorAccountingAuditLogToSystemActivity({
    auditLog: {
      ...params.auditLog,
      entity_id:
        params.auditLog.entity_type === 'entry'
          ? entryRef.id
          : params.auditLog.entity_id,
    },
  });

  return result;
}

export async function getEntryById(
  organizationId: string,
  entryId: string
): Promise<AccountingEntry | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(ENTRIES_COLLECTION).doc(entryId).get();

  if (!doc.exists) {
    return null;
  }

  const entry = mapEntry(doc.id, doc.data());
  if (entry.organization_id !== organizationId) {
    return null;
  }

  return entry;
}

export async function getLinesByEntryId(
  organizationId: string,
  entryId: string
): Promise<AccountingEntryLine[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(LINES_COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('entry_id', '==', entryId)
    .get();

  return snapshot.docs.map(doc => mapLine(doc.id, doc.data()));
}

export async function confirmDraftEntry(params: {
  organizationId: string;
  entryId: string;
  performedBy?: string;
}): Promise<AccountingEntry> {
  const db = getAdminFirestore();
  const entryRef = db.collection(ENTRIES_COLLECTION).doc(params.entryId);
  const auditRef = db.collection(AUDIT_COLLECTION).doc();
  const timestamp = new Date().toISOString();

  const nextAuditLog = {
    organization_id: params.organizationId,
    action: 'entry_posted',
    entity_type: 'entry',
    entity_id: params.entryId,
    performed_by: params.performedBy,
    performed_at: timestamp,
    details: {
      source: 'manual_confirm',
    },
    previous_state: {
      status: 'draft',
    },
    next_state: {
      status: 'posted',
    },
    trace_id: undefined,
  } satisfies Omit<AccountingAuditLog, 'id'>;

  const result = await db.runTransaction(async tx => {
    const entrySnap = await tx.get(entryRef);
    if (!entrySnap.exists) {
      throw new Error('Asiento no encontrado');
    }

    const current = mapEntry(entrySnap.id, entrySnap.data());
    if (current.organization_id !== params.organizationId) {
      throw new Error('Asiento no encontrado');
    }
    if (current.status !== 'draft') {
      throw new Error('Solo se pueden confirmar asientos en borrador');
    }

    const nextState: Partial<AccountingEntry> = {
      status: 'posted',
      updated_at: timestamp,
      posted_at: timestamp,
    };

    tx.set(entryRef, nextState, { merge: true });
    tx.set(auditRef, {
      ...nextAuditLog,
      previous_state: {
        status: current.status,
      },
      trace_id: current.idempotency_key,
    });

    return {
      ...current,
      ...nextState,
    } as AccountingEntry;
  });

  await mirrorAccountingAuditLogToSystemActivity({
    auditLog: {
      ...nextAuditLog,
      trace_id: result.idempotency_key,
    },
  });

  return result;
}

export async function voidEntry(params: {
  organizationId: string;
  entryId: string;
  performedBy?: string;
  reason?: string;
}): Promise<AccountingEntry> {
  const db = getAdminFirestore();
  const entryRef = db.collection(ENTRIES_COLLECTION).doc(params.entryId);
  const auditRef = db.collection(AUDIT_COLLECTION).doc();
  const timestamp = new Date().toISOString();

  const nextAuditLog = {
    organization_id: params.organizationId,
    action: 'entry_cancelled',
    entity_type: 'entry',
    entity_id: params.entryId,
    performed_by: params.performedBy,
    performed_at: timestamp,
    details: {
      reason: params.reason || null,
    },
    previous_state: {
      status: 'posted',
    },
    next_state: {
      status: 'cancelled',
    },
    trace_id: undefined,
  } satisfies Omit<AccountingAuditLog, 'id'>;

  const result = await db.runTransaction(async tx => {
    const entrySnap = await tx.get(entryRef);
    if (!entrySnap.exists) {
      throw new Error('Asiento no encontrado');
    }

    const current = mapEntry(entrySnap.id, entrySnap.data());
    if (current.organization_id !== params.organizationId) {
      throw new Error('Asiento no encontrado');
    }
    if (current.status === 'cancelled') {
      return current;
    }

    const nextMetadata = {
      ...(current.metadata || {}),
      void_reason: params.reason || null,
    };

    const nextState: Partial<AccountingEntry> = {
      status: 'cancelled',
      updated_at: timestamp,
      cancelled_at: timestamp,
      cancelled_by: params.performedBy,
      metadata: nextMetadata,
    };

    tx.set(entryRef, nextState, { merge: true });
    tx.set(auditRef, {
      ...nextAuditLog,
      previous_state: {
        status: current.status,
      },
      trace_id: current.idempotency_key,
    });

    return {
      ...current,
      ...nextState,
    } as AccountingEntry;
  });

  await mirrorAccountingAuditLogToSystemActivity({
    auditLog: {
      ...nextAuditLog,
      trace_id: result.idempotency_key,
    },
  });

  return result;
}
