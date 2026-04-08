import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const linkClientSchema = z.object({
  client_id: z.string().nullable(),
  client_name: z.string().optional(),
});

type RouteContext = { params: Promise<Record<string, string>> };

export const PATCH = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id: convId } = await context.params;

      if (!convId) {
        return NextResponse.json(
          { success: false, error: 'conversation id es requerido' },
          { status: 400 }
        );
      }

      let body: z.infer<typeof linkClientSchema>;
      try {
        body = linkClientSchema.parse(await request.json());
      } catch (err) {
        if (err instanceof z.ZodError) {
          return NextResponse.json(
            { success: false, error: 'Payload inválido', details: err.issues },
            { status: 400 }
          );
        }
        throw err;
      }

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

      const convRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsapp_conversations')
        .doc(convId);

      const convSnap = await convRef.get();
      if (!convSnap.exists) {
        return NextResponse.json(
          { success: false, error: 'Conversación no encontrada' },
          { status: 404 }
        );
      }

      const conversation = convSnap.data() as Record<string, unknown>;

      // Verificación multi-tenant
      if (conversation['organization_id'] !== orgId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await convRef.update({
        client_id: body.client_id ?? null,
        client_name: body.client_name ?? null,
        updated_at: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        data: {
          conversation_id: convId,
          client_id: body.client_id,
          client_name: body.client_name ?? null,
        },
      });
    } catch (error) {
      console.error('[whatsapp/conversations/[id]/link-client][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'super_admin', 'gerente', 'jefe'],
  }
);
