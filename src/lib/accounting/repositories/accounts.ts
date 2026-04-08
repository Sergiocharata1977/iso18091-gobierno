import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AccountingAccount } from '@/types/accounting';

const COLLECTION = 'acc_accounts';

export async function getAccountsByCodes(
  organizationId: string,
  codes: string[]
): Promise<Map<string, AccountingAccount>> {
  const db = getAdminFirestore();
  const uniqueCodes = [...new Set(codes.filter(Boolean))];
  const accounts = new Map<string, AccountingAccount>();

  for (const code of uniqueCodes) {
    const snapshot = await db
      .collection(COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('codigo', '==', code)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error(`No existe la cuenta contable ${code}`);
    }

    const doc = snapshot.docs[0];
    accounts.set(code, {
      id: doc.id,
      ...doc.data(),
    } as AccountingAccount);
  }

  return accounts;
}
