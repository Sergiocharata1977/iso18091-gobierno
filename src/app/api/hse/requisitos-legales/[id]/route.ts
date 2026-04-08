import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkHseCapability } from '../../_lib/checkHseCapability';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const patchRequisitoBody = z.object({
  tipo: z.enum(['ley', 'decreto', 'resolucion', 'norma', 'permiso', 'otro']).optional(),
  numero: z.string().min(1).optional(),
  descripcion: z.string().min(5).optional(),
  fecha_vigencia: z.string().optional(),
  aplica_a: z.array(z.string()).optional(),
  estado_cumplimiento: z
    .enum(['cumple', 'parcial', 'no_cumple', 'no_aplica'])
    .optional(),
  responsable_uid: z.string().optional(),
  observaciones: z.string().optional(),
});

export const GET = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const params = await context.params;
      const id = params.id;

      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;
      const capCheck = await checkHseCapability(orgId);
      if (capCheck) return capCheck;

      const db = getAdminFirestore();
      const doc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_requisitos_legales')
        .doc(id)
        .get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Requisito legal no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
      console.error('[hse/requisitos-legales/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el requisito legal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const params = await context.params;
      const id = params.id;

      const body = patchRequisitoBody.parse(await request.json());
      const organizationIdParam =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;
      const capCheck = await checkHseCapability(orgId);
      if (capCheck) return capCheck;

      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_requisitos_legales')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Requisito legal no encontrado' },
          { status: 404 }
        );
      }

      await ref.update({
        ...body,
        updated_at: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[hse/requisitos-legales/[id]][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el requisito legal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const params = await context.params;
      const id = params.id;

      const organizationIdParam =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;
      const capCheck = await checkHseCapability(orgId);
      if (capCheck) return capCheck;

      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_requisitos_legales')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Requisito legal no encontrado' },
          { status: 404 }
        );
      }

      await ref.delete();
      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      console.error('[hse/requisitos-legales/[id]][DELETE]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo eliminar el requisito legal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
