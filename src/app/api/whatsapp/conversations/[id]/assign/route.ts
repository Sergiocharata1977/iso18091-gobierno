import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const assignSchema = z.object({
  assigned_user_id: z.string().min(1),
  assigned_user_name: z.string().optional(),
});

export const PATCH = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id } = await context.params;
      const body = assignSchema.parse(await request.json());
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

      const db = getAdminFirestore();
      const docRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsapp_conversations')
        .doc(id);

      const snap = await docRef.get();
      if (!snap.exists) {
        return NextResponse.json(
          { success: false, error: 'Conversación no encontrada' },
          { status: 404 }
        );
      }

      const data = snap.data()!;
      if (data.organization_id && data.organization_id !== orgId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const updatePayload: Record<string, unknown> = {
        assigned_user_id: body.assigned_user_id,
        updated_at: FieldValue.serverTimestamp(),
      };
      if (body.assigned_user_name !== undefined) {
        updatePayload.assigned_user_name = body.assigned_user_name;
      }

      await docRef.update(updatePayload);

      return NextResponse.json({
        success: true,
        data: { id, assigned_user_id: body.assigned_user_id },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[whatsapp/conversations/[id]/assign][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo asignar la conversación' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin', 'gerente', 'jefe'] }
);
