import { adminDb } from '@/firebase/admin';
import { createEventEnvelopeV1 } from '@/lib/integration/contracts';
import { writeIntegrationDLQ } from '@/lib/integration/dlq';
import { getPeriodByCode } from '@/lib/accounting/repositories/entries';
import {
  resolvePeriod,
  validatePeriodOpen,
} from '@/lib/accounting/validators';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  CreateJournalEntryInput,
  JournalEntry,
  JournalLineInput,
} from './types';

const COLLECTION_NAME = 'journal_entries';
const DLQ_COLLECTION_NAME = 'journal_entries_dlq';

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateLines(lines: JournalLineInput[]): {
  totalDebit: number;
  totalCredit: number;
} {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('Journal entry requires at least 2 lines');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    if (!line.account_code || !line.account_name) {
      throw new Error('Each line requires account_code and account_name');
    }

    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (debit < 0 || credit < 0) {
      throw new Error('Debit/Credit cannot be negative');
    }

    if (debit > 0 && credit > 0) {
      throw new Error('A line cannot have debit and credit at the same time');
    }

    if (debit === 0 && credit === 0) {
      throw new Error('A line must have debit or credit amount');
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  const roundedDebit = round2(totalDebit);
  const roundedCredit = round2(totalCredit);

  if (roundedDebit !== roundedCredit) {
    throw new Error(
      `Unbalanced entry. debit=${roundedDebit} credit=${roundedCredit}`
    );
  }

  return {
    totalDebit: roundedDebit,
    totalCredit: roundedCredit,
  };
}

async function logDLQ(payload: Record<string, unknown>, error: unknown) {
  try {
    await adminDb.collection(DLQ_COLLECTION_NAME).add({
      payload,
      error_message:
        error instanceof Error ? error.message : JSON.stringify(error),
      created_at: FieldValue.serverTimestamp(),
      status: 'pending',
      retries: 0,
    });
    await writeIntegrationDLQ({
      source: 'accounting',
      operation: String(payload.operation || 'postEntry'),
      payload,
      error,
      traceId: String(payload.idempotency_key || payload.source_id || ''),
    });
  } catch (dlqError) {
    console.error('[CoreLedgerService] Error logging DLQ:', dlqError);
  }
}

export const CoreLedgerService = {
  async postEntry(input: CreateJournalEntryInput): Promise<string> {
    try {
      const { totalDebit, totalCredit } = validateLines(input.lines);
      const period = resolvePeriod(input.entry_date.toISOString());
      const periodDoc = await getPeriodByCode(input.organization_id, period);

      validatePeriodOpen(periodDoc);

      if (input.idempotency_key) {
        const existing = await adminDb
          .collection(COLLECTION_NAME)
          .where('organization_id', '==', input.organization_id)
          .where('idempotency_key', '==', input.idempotency_key)
          .limit(1)
          .get();

        if (!existing.empty) {
          return existing.docs[0].id;
        }
      }

      const docRef = await adminDb.collection(COLLECTION_NAME).add({
        envelope_v1: createEventEnvelopeV1({
          eventType: 'accounting.journal_entry.posted',
          organizationId: input.organization_id,
          producer: '9001app-firebase:core-ledger',
          idempotencyKey: input.idempotency_key || null,
          payloadRef: {
            collection: input.source_module,
            id: input.source_id,
          },
        }),
        organization_id: input.organization_id,
        source_module: input.source_module,
        source_type: input.source_type,
        source_id: input.source_id,
        entry_date: input.entry_date,
        period,
        description: input.description,
        currency: input.currency || 'ARS',
        total_debit: totalDebit,
        total_credit: totalCredit,
        lines: input.lines,
        status: 'posted',
        idempotency_key: input.idempotency_key || null,
        created_by: input.created_by,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      await logDLQ(
        {
          operation: 'postEntry',
          input,
        },
        error
      );
      throw error;
    }
  },

  async getBySource(
    organizationId: string,
    sourceType: string,
    sourceId: string
  ): Promise<JournalEntry | null> {
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where('organization_id', '==', organizationId)
      .where('source_type', '==', sourceType)
      .where('source_id', '==', sourceId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as Record<string, any>;

    return {
      id: doc.id,
      organization_id: data.organization_id,
      source_module: data.source_module,
      source_type: data.source_type,
      source_id: data.source_id,
      entry_date: data.entry_date?.toDate?.() || new Date(),
      description: data.description,
      currency: data.currency || 'ARS',
      total_debit: data.total_debit || 0,
      total_credit: data.total_credit || 0,
      lines: (data.lines || []) as JournalLineInput[],
      status: data.status || 'posted',
      idempotency_key: data.idempotency_key || null,
      created_by: data.created_by,
      created_at: data.created_at?.toDate?.() || new Date(),
      updated_at: data.updated_at?.toDate?.() || new Date(),
    };
  },
};
