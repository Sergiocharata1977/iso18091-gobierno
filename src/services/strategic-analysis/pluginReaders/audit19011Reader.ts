import { getAdminFirestore } from '@/lib/firebase/admin';

export interface Audit19011PluginContext {
  programas_total: number;
  programas_activos: number;
  auditorias_programadas: number;
  auditorias_completadas: number;
  auditores_certificados: number;
}

export async function readAudit19011Context(orgId: string): Promise<Audit19011PluginContext> {
  const db = getAdminFirestore();
  const base: Audit19011PluginContext = {
    programas_total: 0,
    programas_activos: 0,
    auditorias_programadas: 0,
    auditorias_completadas: 0,
    auditores_certificados: 0,
  };

  try {
    // Programa de auditorías 19011 — colección bajo el plugin
    const programasSnap = await db
      .collection('audit_programs')
      .where('organization_id', '==', orgId)
      .limit(20)
      .get()
      .catch(() => null);

    if (programasSnap) {
      base.programas_total = programasSnap.size;
      base.programas_activos = programasSnap.docs.filter(
        d => d.data().estado === 'activo' || d.data().status === 'active'
      ).length;
    }

    // Auditorías planificadas bajo el programa
    const auditoriasSnap = await db
      .collection('audits')
      .where('organization_id', '==', orgId)
      .where('tipo', '==', 'programa_19011')
      .limit(30)
      .get()
      .catch(() => null);

    if (auditoriasSnap) {
      base.auditorias_programadas = auditoriasSnap.size;
      base.auditorias_completadas = auditoriasSnap.docs.filter(
        d => d.data().estado === 'completada' || d.data().status === 'completed'
      ).length;
    }
  } catch {
    // Non-blocking
  }

  return base;
}
