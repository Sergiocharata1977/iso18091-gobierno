import { getAdminFirestore } from '@/lib/firebase/admin';

export interface SgsiPluginContext {
  riesgos_total: number;
  riesgos_altos: number;
  controles_total: number;
  controles_implementados: number;
  activos_total: number;
  incidentes_sgsi: number;
}

export async function readSgsiContext(orgId: string): Promise<SgsiPluginContext> {
  const db = getAdminFirestore();
  const base: SgsiPluginContext = {
    riesgos_total: 0,
    riesgos_altos: 0,
    controles_total: 0,
    controles_implementados: 0,
    activos_total: 0,
    incidentes_sgsi: 0,
  };

  try {
    const [riesgosSnap, controlesSnap, activosSnap, incSnap] = await Promise.all([
      db.collection('sgsi_risks').where('organization_id', '==', orgId).limit(50).get(),
      db.collection('sgsi_controls').where('organization_id', '==', orgId).limit(50).get(),
      db.collection('sgsi_assets').where('organization_id', '==', orgId).limit(50).get(),
      db.collection('sgsi_incidents').where('organization_id', '==', orgId).limit(30).get(),
    ]);

    base.riesgos_total = riesgosSnap.size;
    base.riesgos_altos = riesgosSnap.docs.filter(d => {
      const nivel = d.data().nivel_riesgo ?? d.data().risk_level ?? '';
      return ['alto', 'critico', 'high', 'critical'].includes(nivel.toLowerCase());
    }).length;

    base.controles_total = controlesSnap.size;
    base.controles_implementados = controlesSnap.docs.filter(
      d => d.data().estado === 'implementado' || d.data().status === 'implemented'
    ).length;

    base.activos_total = activosSnap.size;
    base.incidentes_sgsi = incSnap.size;
  } catch {
    // Non-blocking
  }

  return base;
}
