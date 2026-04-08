import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  GOV_MATURITY_COLLECTION_NAME,
  buildGovMaturitySnapshot,
  calculateNivelGlobal,
  serializeAssessment,
} from '@/lib/gov/madurez';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import {
  GovMaturityCreateSchema,
  type GovMaturitySnapshot,
} from '@/types/gov-madurez';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = GOV_MATURITY_COLLECTION_NAME;
const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
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
        .orderBy('created_at', 'desc')
        .get();

      const data = snapshot.docs.map(doc =>
        serializeAssessment(doc.id, doc.data() as Record<string, unknown>)
      );
      const monitor_snapshot: GovMaturitySnapshot = await buildGovMaturitySnapshot({
        organizationId: orgScope.organizationId,
        assessments: data,
      });

      return NextResponse.json({
        success: true,
        data,
        strategic_summary: monitor_snapshot.strategic_summary,
        monitor_snapshot,
      });
    } catch (error) {
      console.error('[gobierno/madurez][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el historial de madurez' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
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

      const body = GovMaturityCreateSchema.parse(await request.json());
      const nivelGlobal = calculateNivelGlobal(body.dimensiones);
      const now = Timestamp.now();
      const payload = {
        organization_id: orgScope.organizationId,
        fecha: body.fecha,
        evaluador: body.evaluador,
        dimensiones: body.dimensiones,
        nivel_global: nivelGlobal,
        plan_accion: body.plan_accion,
        estado: body.estado,
        created_at: now,
      };

      const db = getAdminFirestore();
      const ref = await db
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .add(payload);

      return NextResponse.json(
        { success: true, data: serializeAssessment(ref.id, payload) },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[gobierno/madurez][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el diagnostico de madurez' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
