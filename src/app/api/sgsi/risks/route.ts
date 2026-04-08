import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { checkSgsiCapability } from '../_lib/checkSgsiCapability';
import {
  deriveRiskLevel,
  SGSI_COLLECTIONS,
  serializeSgsiRisk,
  sgsiRiskSchema,
} from '../_lib/sgsi';

export const dynamic = 'force-dynamic';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

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

      const status = request.nextUrl.searchParams.get('status') || undefined;
      const db = getAdminFirestore();
      let query = db
        .collection('organizations')
        .doc(orgId)
        .collection(SGSI_COLLECTIONS.risks)
        .orderBy('created_at', 'desc') as FirebaseFirestore.Query;

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.get();
      const data = snapshot.docs.map(doc =>
        serializeSgsiRisk(doc.id, doc.data() as Record<string, unknown>)
      );

      return NextResponse.json({ success: true, data, total: data.length });
    } catch (error) {
      console.error('[sgsi/risks][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los riesgos SGSI' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = sgsiRiskSchema.parse(await request.json());
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

      const db = getAdminFirestore();
      const assetRef = db
        .collection('organizations')
        .doc(orgId)
        .collection(SGSI_COLLECTIONS.assets)
        .doc(body.activo_id);
      const assetSnapshot = await assetRef.get();
      if (!assetSnapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'El activo SGSI indicado no existe' },
          { status: 404 }
        );
      }

      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection(SGSI_COLLECTIONS.risks)
        .doc();

      const inherent = body.probabilidad * body.impacto;

      await ref.set({
        ...body,
        organization_id: orgId,
        nivel_riesgo_inherente: inherent,
        nivel_riesgo_residual: inherent,
        nivel: deriveRiskLevel(inherent),
        controles_aplicados: [],
        status: 'identificado',
        created_by: auth.uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, data: { id: ref.id } },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[sgsi/risks][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el riesgo SGSI' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
