import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { checkHseCapability } from '../_lib/checkHseCapability';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest, _context, auth) => {
  try {
    const orgIdParam = request.nextUrl.searchParams.get('organization_id');
    const scope = await resolveAuthorizedOrganizationId(auth, orgIdParam);
    if (!scope.ok || !scope.organizationId) {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
    }
    const orgId = scope.organizationId;
    const capCheck = await checkHseCapability(orgId);
    if (capCheck) return capCheck;
    const db = getAdminFirestore();
    const orgRef = db.collection('organizations').doc(orgId);

    const [
      incidentesSnap,
      peligrosSnap,
      eppSnap,
      aspectosSnap,
      requisitosSnap,
      objetivosSnap,
    ] = await Promise.all([
      orgRef.collection('hse_incidentes').get(),
      orgRef.collection('hse_peligros').get(),
      orgRef.collection('hse_epp').get(),
      orgRef.collection('hse_aspectos_ambientales').get(),
      orgRef.collection('hse_requisitos_legales').get(),
      orgRef.collection('hse_objetivos_ambientales').get(),
    ]);

    // Incidentes stats
    const incidentesPorTipo: Record<string, number> = {};
    let incidentesAbiertos = 0;
    let incidentesCerrados = 0;
    incidentesSnap.forEach(doc => {
      const d = doc.data();
      const tipo = (d.tipo as string) ?? 'desconocido';
      incidentesPorTipo[tipo] = (incidentesPorTipo[tipo] ?? 0) + 1;
      if (d.estado === 'cerrado') incidentesCerrados++;
      else incidentesAbiertos++;
    });

    // Peligros por nivel de riesgo
    const peligrosPorNivel: Record<string, number> = {};
    peligrosSnap.forEach(doc => {
      const nivel = (doc.data().nivel_riesgo as string) ?? 'desconocido';
      peligrosPorNivel[nivel] = (peligrosPorNivel[nivel] ?? 0) + 1;
    });

    // Aspectos significativos
    let aspectosSignificativos = 0;
    aspectosSnap.forEach(doc => {
      if (doc.data().significativo === true) aspectosSignificativos++;
    });

    // Requisitos por estado de cumplimiento
    const requisitosPorEstado: Record<string, number> = {};
    requisitosSnap.forEach(doc => {
      const estado = (doc.data().estado_cumplimiento as string) ?? 'no_aplica';
      requisitosPorEstado[estado] = (requisitosPorEstado[estado] ?? 0) + 1;
    });

    // Objetivos por estado
    const objetivosPorEstado: Record<string, number> = {};
    objetivosSnap.forEach(doc => {
      const estado = (doc.data().estado as string) ?? 'pendiente';
      objetivosPorEstado[estado] = (objetivosPorEstado[estado] ?? 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        incidentes: {
          total: incidentesSnap.size,
          abiertos: incidentesAbiertos,
          cerrados: incidentesCerrados,
          por_tipo: incidentesPorTipo,
        },
        peligros: {
          total: peligrosSnap.size,
          por_nivel: peligrosPorNivel,
        },
        aspectos: {
          total: aspectosSnap.size,
          significativos: aspectosSignificativos,
        },
        requisitos: {
          total: requisitosSnap.size,
          por_estado: requisitosPorEstado,
        },
        objetivos: {
          total: objetivosSnap.size,
          por_estado: objetivosPorEstado,
        },
        epp: {
          total: eppSnap.size,
        },
      },
    });
  } catch (error) {
    console.error('[hse/dashboard][GET]', error);
    const message = error instanceof Error ? error.message : 'Error al cargar dashboard HSE';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
});
