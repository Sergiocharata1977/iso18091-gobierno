import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { checkSgsiCapability } from '../_lib/checkSgsiCapability';
import {
  SGSI_COLLECTIONS,
  serializeSgsiAsset,
  sgsiAssetSchema,
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

      const clasificacion =
        request.nextUrl.searchParams.get('clasificacion') || undefined;
      const db = getAdminFirestore();
      let query = db
        .collection('organizations')
        .doc(orgId)
        .collection(SGSI_COLLECTIONS.assets)
        .orderBy('created_at', 'desc') as FirebaseFirestore.Query;

      if (clasificacion) {
        query = query.where('clasificacion', '==', clasificacion);
      }

      const snapshot = await query.get();
      const data = snapshot.docs.map(doc =>
        serializeSgsiAsset(doc.id, doc.data() as Record<string, unknown>)
      );

      return NextResponse.json({ success: true, data, total: data.length });
    } catch (error) {
      console.error('[sgsi/assets][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los activos SGSI' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = sgsiAssetSchema.parse(await request.json());
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
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection(SGSI_COLLECTIONS.assets)
        .doc();

      const valorActivo =
        body.confidencialidad + body.integridad + body.disponibilidad;

      await ref.set({
        ...body,
        organization_id: orgId,
        valor_activo: valorActivo,
        activo: true,
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
      console.error('[sgsi/assets][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el activo SGSI' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
