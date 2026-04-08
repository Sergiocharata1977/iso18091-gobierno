import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { UnifiedMessagesService } from '@/services/messages/UnifiedMessagesService';
import { parseUnifiedId } from '@/services/messages/messageMappers';
import { ThreadMetadataService } from '@/services/messages/threadMetadataService';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ALL_ROLES = [
  'admin',
  'super_admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
] as const;

type RouteContext = { params: Promise<Record<string, string>> };

const updateThreadSchema = z.object({
  status: z.enum(['unread', 'read', 'pending', 'archived']).optional(),
  assigned_user_id: z.string().optional(),
  assigned_user_name: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

function toWhatsAppCompatibilityStatus(
  status: z.infer<typeof updateThreadSchema>['status']
) {
  switch (status) {
    case 'pending':
      return 'pendiente_respuesta';
    case 'archived':
      return 'archivada';
    case 'unread':
    case 'read':
      return 'abierta';
    default:
      return undefined;
  }
}

export const GET = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const organizationIdParam = searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);

      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const { id: encodedId } = await context.params;
      if (!encodedId) {
        return NextResponse.json(
          { success: false, error: 'Conversacion no encontrada' },
          { status: 404 }
        );
      }

      let unifiedId = encodedId;
      try {
        unifiedId = decodeURIComponent(encodedId);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Conversacion no encontrada' },
          { status: 404 }
        );
      }

      const detail = await UnifiedMessagesService.getConversationDetail(
        scope.organizationId,
        unifiedId
      );

      if (!detail) {
        return NextResponse.json(
          { success: false, error: 'Conversacion no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: detail });
    } catch (error) {
      console.error('[messages/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la conversacion' },
        { status: 500 }
      );
    }
  },
  { roles: [...ALL_ROLES] }
);

export const PATCH = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const organizationIdParam =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);

      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = updateThreadSchema.parse(await request.json());

      const { id: encodedId } = await context.params;
      if (!encodedId) {
        return NextResponse.json(
          { success: false, error: 'Conversacion no encontrada' },
          { status: 404 }
        );
      }

      let unifiedId = encodedId;
      try {
        unifiedId = decodeURIComponent(encodedId);
      } catch {
        return NextResponse.json(
          { success: false, error: 'ID invalido' },
          { status: 400 }
        );
      }

      const parsed = parseUnifiedId(unifiedId);
      if (!parsed) {
        return NextResponse.json(
          { success: false, error: 'ID invalido' },
          { status: 400 }
        );
      }

      const detail = await UnifiedMessagesService.getConversationDetail(
        scope.organizationId,
        unifiedId
      );
      if (!detail) {
        return NextResponse.json(
          { success: false, error: 'Conversacion no encontrada' },
          { status: 404 }
        );
      }

      const metadata = await ThreadMetadataService.upsertThreadMetadata(
        scope.organizationId,
        unifiedId,
        {
          status: body.status,
          assignedUserId: body.assigned_user_id,
          assignedUserName: body.assigned_user_name,
          tags: body.tags,
        },
        auth.uid
      );

      if (
        parsed.channel === 'whatsapp' &&
        (body.status !== undefined || body.assigned_user_id !== undefined)
      ) {
        const updatePayload: Record<string, unknown> = {
          updated_at: FieldValue.serverTimestamp(),
        };

        const nativeStatus = toWhatsAppCompatibilityStatus(body.status);
        if (nativeStatus) {
          updatePayload.status = nativeStatus;
          if (nativeStatus === 'archivada') {
            updatePayload.resolved_at = FieldValue.serverTimestamp();
          }
        }

        if (body.assigned_user_id !== undefined) {
          updatePayload.assigned_user_id = body.assigned_user_id;
        }

        if (body.assigned_user_name !== undefined) {
          updatePayload.assigned_user_name = body.assigned_user_name;
        }

        const docRef = getAdminFirestore()
          .collection('organizations')
          .doc(scope.organizationId)
          .collection('whatsapp_conversations')
          .doc(parsed.sourceId);

        const snap = await docRef.get();
        if (!snap.exists) {
          return NextResponse.json(
            { success: false, error: 'Conversacion no encontrada' },
            { status: 404 }
          );
        }

        const data = snap.data();
        if (
          data?.organization_id &&
          data.organization_id !== scope.organizationId
        ) {
          return NextResponse.json(
            { success: false, error: 'Acceso denegado' },
            { status: 403 }
          );
        }

        await docRef.update(updatePayload);
      }

      return NextResponse.json({
        success: true,
        data: metadata,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[messages/[id]][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar la conversacion' },
        { status: 500 }
      );
    }
  },
  { roles: [...ALL_ROLES] }
);
