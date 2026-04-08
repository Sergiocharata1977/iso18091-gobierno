import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const patchSchemaBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  fields: z.array(z.unknown()).optional(),
  stages: z.array(z.unknown()).optional(),
  has_kanban: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const GET = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id } = await context.params;
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
      }

      const db = getAdminFirestore();
      const snap = await db
        .collection('organizations')
        .doc(scope.organizationId)
        .collection('custom_register_schemas')
        .doc(id)
        .get();

      if (!snap.exists) {
        return NextResponse.json({ success: false, error: 'Schema no encontrado' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: { id: snap.id, ...snap.data() },
      });
    } catch (error) {
      console.error('[registers/schemas/[id]][GET]', error);
      return NextResponse.json({ success: false, error: 'Error al obtener schema' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'operario', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id } = await context.params;
      const body = patchSchemaBody.parse(await request.json());
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
      }

      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(scope.organizationId)
        .collection('custom_register_schemas')
        .doc(id);

      const snap = await ref.get();
      if (!snap.exists) {
        return NextResponse.json({ success: false, error: 'Schema no encontrado' }, { status: 404 });
      }

      await ref.update({ ...body, updated_at: Timestamp.now() });
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[registers/schemas/[id]][PATCH]', error);
      return NextResponse.json({ success: false, error: 'Error al actualizar schema' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const DELETE = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id } = await context.params;
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
      }

      const db = getAdminFirestore();
      const orgId = scope.organizationId;

      // compliance: no eliminar si tiene entradas activas
      const entriesSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('custom_register_entries')
        .where('schema_id', '==', id)
        .limit(1)
        .get();

      if (!entriesSnap.empty) {
        return NextResponse.json(
          { success: false, error: 'No se puede eliminar: el schema tiene entradas registradas' },
          { status: 409 }
        );
      }

      await db
        .collection('organizations')
        .doc(orgId)
        .collection('custom_register_schemas')
        .doc(id)
        .delete();

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[registers/schemas/[id]][DELETE]', error);
      return NextResponse.json({ success: false, error: 'Error al eliminar schema' }, { status: 500 });
    }
  },
  { roles: ['admin', 'super_admin'] }
);
