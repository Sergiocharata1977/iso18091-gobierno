import { getAdminFirestore } from '@/lib/firebase/admin';
import type { CustomerLedgerEntry } from '@/types/finance';

const COLLECTION = 'customer_ledger_entries';

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class CustomerLedgerService {
  static async postEntry(
    input: Omit<CustomerLedgerEntry, 'id' | 'balance_after' | 'created_at' | 'updated_at'>
  ): Promise<CustomerLedgerEntry> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();
    const lastEntry = await this.getLastEntry(
      input.organization_id,
      input.customer_id
    );
    const previousBalance = lastEntry?.balance_after || 0;
    const nextBalance = round2(
      previousBalance + input.debit_amount - input.credit_amount
    );

    const ref = db.collection(COLLECTION).doc();
    const doc: CustomerLedgerEntry = {
      id: ref.id,
      ...input,
      balance_after: nextBalance,
      created_at: now,
      updated_at: now,
    };

    await ref.set(doc);
    return doc;
  }

  static async getLastEntry(
    organizationId: string,
    customerId: string
  ): Promise<CustomerLedgerEntry | null> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('customer_id', '==', customerId)
      .orderBy('entry_date', 'desc')
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as CustomerLedgerEntry;
  }
}
