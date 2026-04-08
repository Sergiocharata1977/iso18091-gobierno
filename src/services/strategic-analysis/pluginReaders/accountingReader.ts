import { getAdminFirestore } from '@/lib/firebase/admin';

export interface AccountingPluginContext {
  periodos_total: number;
  periodo_activo: boolean;
  asientos_ultimo_periodo: number;
}

export async function readAccountingContext(orgId: string): Promise<AccountingPluginContext> {
  const db = getAdminFirestore();
  const base: AccountingPluginContext = {
    periodos_total: 0,
    periodo_activo: false,
    asientos_ultimo_periodo: 0,
  };

  try {
    const periodosSnap = await db
      .collection('acc_periods')
      .where('organization_id', '==', orgId)
      .orderBy('start_date', 'desc')
      .limit(5)
      .get();

    base.periodos_total = periodosSnap.size;

    const activePeriod = periodosSnap.docs.find(d => d.data().status === 'open');
    base.periodo_activo = !!activePeriod;

    if (activePeriod) {
      const entriesSnap = await db
        .collection('acc_entries')
        .where('organization_id', '==', orgId)
        .where('period_id', '==', activePeriod.id)
        .limit(1)
        .get();
      base.asientos_ultimo_periodo = entriesSnap.size;
    }
  } catch {
    // Non-blocking
  }

  return base;
}
