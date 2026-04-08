import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { type GovMaturityAssessment } from '@/types/gov-madurez';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = 'maturity_assessments';
const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

function serializeTimestamp(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return new Date(0).toISOString();
}

function serializeAssessment(
  id: string,
  data: Record<string, unknown>
): GovMaturityAssessment {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    fecha: String(data.fecha || ''),
    evaluador: String(data.evaluador || ''),
    dimensiones: Array.isArray(data.dimensiones)
      ? data.dimensiones.map(item => ({
          dimension: String(
            (item as Record<string, unknown>).dimension || ''
          ) as GovMaturityAssessment['dimensiones'][number]['dimension'],
          nivel: Number(
            (item as Record<string, unknown>).nivel || 1
          ) as GovMaturityAssessment['dimensiones'][number]['nivel'],
          evidencias: String(
            (item as Record<string, unknown>).evidencias || ''
          ),
          oportunidades_mejora: String(
            (item as Record<string, unknown>).oportunidades_mejora || ''
          ),
        }))
      : [],
    nivel_global: Number(data.nivel_global || 0),
    plan_accion: String(data.plan_accion || ''),
    estado: (data.estado || 'borrador') as GovMaturityAssessment['estado'],
    created_at: serializeTimestamp(data.created_at),
  };
}

export const GET = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const db = getAdminFirestore();
      const snapshot = await db
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .doc(id)
        .get();

      if (!snapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'Diagnostico no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: serializeAssessment(snapshot.id, snapshot.data() as Record<string, unknown>),
      });
    } catch (error) {
      console.error('[gobierno/madurez/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el diagnostico de madurez' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
