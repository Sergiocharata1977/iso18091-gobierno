import { getAdminFirestore } from '@/lib/firebase/admin';

export interface CrmPluginContext {
  oportunidades_total: number;
  oportunidades_abiertas: number;
  acciones_crm_abiertas: number;
  riesgo_evaluaciones: number;
}

export async function readCrmContext(orgId: string): Promise<CrmPluginContext> {
  const db = getAdminFirestore();
  const base: CrmPluginContext = {
    oportunidades_total: 0,
    oportunidades_abiertas: 0,
    acciones_crm_abiertas: 0,
    riesgo_evaluaciones: 0,
  };

  try {
    const [opSnap, acSnap, riesgosSnap] = await Promise.all([
      db.collection('crm_oportunidades').where('organization_id', '==', orgId).limit(50).get(),
      db.collection('crm_acciones').where('organization_id', '==', orgId).where('estado', '==', 'pendiente').limit(30).get(),
      db.collection('crm_evaluaciones_riesgo').where('organization_id', '==', orgId).limit(20).get(),
    ]);

    base.oportunidades_total = opSnap.size;
    base.oportunidades_abiertas = opSnap.docs.filter(d => {
      const e = d.data().estado ?? '';
      return !['cerrada_ganada', 'cerrada_perdida', 'cancelada'].includes(e);
    }).length;
    base.acciones_crm_abiertas = acSnap.size;
    base.riesgo_evaluaciones = riesgosSnap.size;
  } catch {
    // Non-blocking — plugin puede no estar totalmente inicializado
  }

  return base;
}
