import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import type { RegisterAuditEvent } from '@/types/registers';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const patchEntryBody = z.object({
  title: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  note: z.string().optional(),
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
        .collection('custom_register_entries')
        .doc(id)
        .get();

      if (!snap.exists) {
        return NextResponse.json({ success: false, error: 'Entrada no encontrada' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: { id: snap.id, ...snap.data() } });
    } catch (error) {
      console.error('[registers/entries/[id]][GET]', error);
      return NextResponse.json({ success: false, error: 'Error al obtener entrada' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'operario', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id } = await context.params;
      const body = patchEntryBody.parse(await request.json());
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
      }

      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(scope.organizationId)
        .collection('custom_register_entries')
        .doc(id);

      const snap = await ref.get();
      if (!snap.exists) {
        return NextResponse.json({ success: false, error: 'Entrada no encontrada' }, { status: 404 });
      }

      // compliance: audit trail append-only
      const auditEvent: RegisterAuditEvent = {
        id: `evt_${Date.now()}`,
        changed_by: auth.uid,
        changed_at: new Date(),
        action: 'updated',
        note: body.note,
      };

      await ref.update({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.data !== undefined && { data: body.data }),
        audit_trail: [...((snap.data()?.audit_trail as RegisterAuditEvent[]) || []), auditEvent],
        updated_at: Timestamp.now(),
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[registers/entries/[id]][PATCH]', error);
      return NextResponse.json({ success: false, error: 'Error al actualizar entrada' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'operario', 'super_admin'] }
);
