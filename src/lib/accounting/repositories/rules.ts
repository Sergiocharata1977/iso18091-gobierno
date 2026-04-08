import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AccountingRule } from '@/types/accounting';

const COLLECTION = 'acc_rules';

function isRuleEffective(rule: AccountingRule, fecha: string): boolean {
  if (rule.status !== 'active') {
    return false;
  }

  if (rule.effective_from && fecha < rule.effective_from) {
    return false;
  }

  if (rule.effective_to && fecha > rule.effective_to) {
    return false;
  }

  return true;
}

export async function getActiveRuleByOperation(params: {
  organizationId: string;
  pluginId: string;
  operationType: string;
  fecha: string;
}): Promise<AccountingRule> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .where('organization_id', '==', params.organizationId)
    .where('plugin_id', '==', params.pluginId)
    .where('operation_type', '==', params.operationType)
    .where('status', '==', 'active')
    .get();

  const rules = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }) as AccountingRule)
    .filter(rule => isRuleEffective(rule, params.fecha))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  if (rules.length === 0) {
    throw new Error(
      `No existe regla activa para ${params.pluginId}/${params.operationType}`
    );
  }

  return rules[0];
}
