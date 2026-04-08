import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import type { SGSIDashboardData } from '@/types/sgsi';
import { NextRequest, NextResponse } from 'next/server';
import { checkSgsiCapability } from '../_lib/checkSgsiCapability';
import {
  SGSI_COLLECTIONS,
  serializeSgsiAsset,
  serializeSgsiControl,
  serializeSgsiIncident,
  serializeSgsiRisk,
} from '../_lib/sgsi';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const organizationIdParam =
        request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(
        auth,
        organizationIdParam
      );
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const orgId = scope.organizationId;
      const capCheck = await checkSgsiCapability(orgId);
      if (capCheck) return capCheck;

      const orgRef = getAdminFirestore().collection('organizations').doc(orgId);
      const [assetsSnap, risksSnap, controlsSnap, incidentsSnap] =
        await Promise.all([
          orgRef
            .collection(SGSI_COLLECTIONS.assets)
            .orderBy('created_at', 'desc')
            .limit(8)
            .get(),
          orgRef
            .collection(SGSI_COLLECTIONS.risks)
            .orderBy('created_at', 'desc')
            .limit(8)
            .get(),
          orgRef
            .collection(SGSI_COLLECTIONS.controls)
            .orderBy('created_at', 'desc')
            .limit(12)
            .get(),
          orgRef
            .collection(SGSI_COLLECTIONS.incidents)
            .orderBy('created_at', 'desc')
            .limit(8)
            .get(),
        ]);

      const activos = assetsSnap.docs.map(doc =>
        serializeSgsiAsset(doc.id, doc.data() as Record<string, unknown>)
      );
      const riesgos = risksSnap.docs.map(doc =>
        serializeSgsiRisk(doc.id, doc.data() as Record<string, unknown>)
      );
      const controles = controlsSnap.docs.map(doc =>
        serializeSgsiControl(doc.id, doc.data() as Record<string, unknown>)
      );
      const incidentes = incidentsSnap.docs.map(doc =>
        serializeSgsiIncident(doc.id, doc.data() as Record<string, unknown>)
      );

      const incidentesAbiertos = incidentes.filter(
        incidente =>
          incidente.status === 'abierto' ||
          incidente.status === 'en_investigacion'
      ).length;
      const riesgosActivos = riesgos.filter(
        riesgo => riesgo.status !== 'mitigado'
      ).length;
      const controlesAplicados = controles.filter(
        control =>
          control.status === 'aplicable' &&
          control.implementacion === 'implementado'
      ).length;
      const aplicables = controles.filter(
        control => control.status === 'aplicable'
      ).length;
      const noAplicables = controles.filter(
        control => control.status === 'no_aplicable'
      ).length;
      const implementados = controles.filter(
        control =>
          control.implementacion === 'implementado' ||
          control.implementacion === 'parcial'
      ).length;
      const pendientes = Math.max(0, controles.length - implementados);

      const nivelMadurez: SGSIDashboardData['contexto']['nivel_madurez'] =
        controlesAplicados >= 5 && riesgosActivos <= 3
          ? 'controlado'
          : controles.length >= 3 || activos.length >= 3
            ? 'gestionado'
            : 'inicial';

      const data: SGSIDashboardData = {
        contexto: {
          organization_id: orgId,
          generated_at: new Date().toISOString(),
          nivel_madurez: nivelMadurez,
          alcance_resumen:
            activos.length > 0
              ? `Inventario activo sobre ${activos.length} activos de informacion registrados.`
              : 'Alcance SGSI pendiente de formalizacion operativa en el inventario.',
        },
        resumen: {
          activos_registrados: activos.length,
          riesgos_activos: riesgosActivos,
          controles_aplicados: controlesAplicados,
          incidentes_abiertos: incidentesAbiertos,
        },
        activos,
        riesgos,
        controles,
        soa: {
          total_controles: controles.length,
          aplicables,
          no_aplicables: noAplicables,
          implementados,
          pendientes,
          registros: controles.map(control => ({
            id: control.id,
            codigo_anexo_a: control.codigo_anexo_a,
            nombre: control.nombre,
            status: control.status,
            implementacion: control.implementacion,
            justificacion_exclusion: control.justificacion_exclusion,
          })),
        },
        incidentes: {
          total: incidentes.length,
          abiertos: incidentesAbiertos,
          recientes: incidentes,
        },
      };

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[sgsi/dashboard][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo cargar el dashboard SGSI' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);
