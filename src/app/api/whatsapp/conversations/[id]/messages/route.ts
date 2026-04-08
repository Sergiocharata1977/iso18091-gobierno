import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { MessageSearchService } from '@/services/whatsapp/MessageSearchService';
import type { WhatsAppMessageV2 } from '@/types/whatsapp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const UNREAD_RESET_ROLES = ['admin', 'super_admin', 'gerente', 'jefe', 'operario', 'auditor'] as const;

export const GET = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id: convId } = await context.params;

      if (!convId) {
        return NextResponse.json(
          { success: false, error: 'conversation id es requerido' },
          { status: 400 }
        );
      }

      const { searchParams } = request.nextUrl;
      const organizationIdParam = searchParams.get('organization_id') || undefined;

      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;

      // Parámetros de paginación
      const limitParam = searchParams.get('limit');
      const beforeParam = searchParams.get('before');
      const searchQuery = searchParams.get('search')?.trim() || '';

      const limitRaw = limitParam ? parseInt(limitParam, 10) : 50;
      const limit = isNaN(limitRaw) ? 50 : Math.min(Math.max(limitRaw, 1), 200);

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

      let messages: WhatsAppMessageV2[] = [];

      if (searchQuery) {
        const searchService = new MessageSearchService(db);
        const messageIds = await searchService.searchInConversation(
          orgId,
          convId,
          searchQuery,
          limit
        );

        if (messageIds.length > 0) {
          const docs = await Promise.all(
            messageIds.map(messageId => convRef.collection('messages').doc(messageId).get())
          );
          messages = docs
            .filter(doc => doc.exists)
            .map(doc => ({
              id: doc.id,
              ...(doc.data() as Omit<WhatsAppMessageV2, 'id'>),
            }));
        }
      } else {
        // Construir query de mensajes
        let query = convRef
          .collection('messages')
          .orderBy('created_at', 'desc')
          .limit(limit);

        if (beforeParam) {
          try {
            const beforeDate = new Date(beforeParam);
            if (!isNaN(beforeDate.getTime())) {
              const beforeTimestamp = Timestamp.fromDate(beforeDate);
              query = query.where('created_at', '<', beforeTimestamp);
            }
          } catch {
            // Si el before no es parseable, ignorarlo
          }
        }

        const messagesSnap = await query.get();
        messages = messagesSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<WhatsAppMessageV2, 'id'>),
        }));
      }

      // Invertir para mostrar de más antiguo a más nuevo
      messages.reverse();

      // Actualizar unread_count a 0 si el usuario tiene rol suficiente
      const shouldResetUnread = (
        UNREAD_RESET_ROLES as readonly string[]
      ).includes(auth.role);

      if (shouldResetUnread) {
        try {
          await convRef.update({
            unread_count: 0,
            updated_at: FieldValue.serverTimestamp(),
          });
        } catch (updateErr) {
          // No fallamos la lectura si falla el update de unread
          console.warn(
            '[whatsapp/conversations/[id]/messages][GET] Error resetting unread_count:',
            updateErr
          );
        }
      }

      return NextResponse.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      console.error('[whatsapp/conversations/[id]/messages][GET]', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'],
  }
);
