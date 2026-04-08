import { getAdminFirestore } from '@/lib/firebase/admin';

export interface HsePluginContext {
  incidentes_total: number;
  incidentes_abiertos: number;
  peligros_criticos: number;
  aspectos_ambientales: number;
  epp_vencidos: number;
}

export async function readHseContext(orgId: string): Promise<HsePluginContext> {
  const db = getAdminFirestore();
  const base: HsePluginContext = {
    incidentes_total: 0,
    incidentes_abiertos: 0,
    peligros_criticos: 0,
    aspectos_ambientales: 0,
    epp_vencidos: 0,
  };

  try {
    const [incSnap, pelSnap, aspSnap] = await Promise.all([
      db.collection('hse_incidentes').where('organization_id', '==', orgId).limit(50).get(),
      db.collection('hse_peligros').where('organization_id', '==', orgId).limit(50).get(),
      db.collection('hse_aspectos_ambientales').where('organization_id', '==', orgId).limit(30).get(),
    ]);

    base.incidentes_total = incSnap.size;
    base.incidentes_abiertos = incSnap.docs.filter(d => d.data().estado !== 'cerrado').length;
    base.peligros_criticos = pelSnap.docs.filter(d => d.data().nivel_riesgo === 'critico').length;
    base.aspectos_ambientales = aspSnap.size;

    // EPP vencidos
    const eppSnap = await db
      .collection('hse_epp')
      .where('organization_id', '==', orgId)
      .limit(50)
      .get();
    const now = new Date();
    base.epp_vencidos = eppSnap.docs.filter(d => {
      const exp = d.data().fecha_vencimiento;
      if (!exp) return false;
      const expDate = exp?.toDate ? exp.toDate() : new Date(exp);
      return expDate < now;
    }).length;
  } catch {
    // Non-blocking
  }

  return base;
}
