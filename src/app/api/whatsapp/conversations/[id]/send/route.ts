import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { MessageSearchService } from '@/services/whatsapp/MessageSearchService';
import { WhatsAppClient } from '@/lib/whatsapp/WhatsAppClient';
import type { OrganizationWhatsAppConfig } from '@/types/whatsapp';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const sendSchema = z.object({
  text: z.string().min(1).max(4096),
  sender_user_id: z.string().min(1),
  sender_name: z.string().optional(),
});

type RouteContext = { params: Promise<Record<string, string>> };

export const POST = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id: convId } = await context.params;

      if (!convId) {
        return NextResponse.json(
          { success: false, error: 'conversation id es requerido' },
          { status: 400 }
        );
      }

      let body: z.infer<typeof sendSchema>;
      try {
        body = sendSchema.parse(await request.json());
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

      // 1. Leer la conversación
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

      // 2. Verificación multi-tenant
      if (conversation['organization_id'] !== orgId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const isSimulation = Boolean(conversation['is_simulation']);
      const { text } = body;
      let provider: 'meta' | 'simulator' = 'meta';

      // 3. Enviar por Meta si no es simulación
      if (!isSimulation) {
        // Leer config de WhatsApp
        const configSnap = await db
          .collection('organizations')
          .doc(orgId)
          .collection('settings')
          .doc('channels_whatsapp')
          .get();

        const config = configSnap.exists
          ? (configSnap.data() as OrganizationWhatsAppConfig)
          : null;

        const phoneNumberId = config?.whatsapp_phone_number_id;

        if (!phoneNumberId) {
          return NextResponse.json(
            {
              success: false,
              error: 'WhatsApp no configurado para esta organización',
            },
            { status: 422 }
          );
        }

        const phoneE164 = conversation['phone_e164'] as string | undefined;
        if (!phoneE164) {
          return NextResponse.json(
            { success: false, error: 'La conversación no tiene número de teléfono' },
            { status: 422 }
          );
        }

        try {
          await WhatsAppClient.sendTextMessage(phoneE164, text, phoneNumberId);
        } catch (sendErr) {
          console.error('[whatsapp/conversations/[id]/send][POST] Meta error:', sendErr);
          return NextResponse.json(
            {
              success: false,
              error: `Error al enviar mensaje por WhatsApp: ${sendErr instanceof Error ? sendErr.message : 'desconocido'}`,
            },
            { status: 502 }
          );
        }

        provider = 'meta';
      } else {
        provider = 'simulator';
      }

      // 4. Guardar mensaje en subcollección
      const messagesRef = convRef.collection('messages');
      const msgRef = messagesRef.doc();

      await msgRef.set({
        conversation_id: convId,
        organization_id: orgId,
        direction: 'outbound',
        text,
        provider,
        sender_type: 'user',
        sender_user_id: body.sender_user_id,
        sender_name: body.sender_name ?? '',
        status: 'sent',
        is_simulation: isSimulation,
        created_at: FieldValue.serverTimestamp(),
      });

      try {
        const searchService = new MessageSearchService(db);
        await searchService.indexMessage(orgId, convId, msgRef.id, text);
      } catch (indexError) {
        console.warn(
          '[whatsapp/conversations/[id]/send][POST] No se pudo indexar mensaje:',
          indexError
        );
      }

      // 5. Actualizar la conversación
      const currentStatus = conversation['status'] as string | undefined;
      const newStatus =
        currentStatus === 'abierta' || currentStatus === 'pendiente_respuesta'
          ? 'en_gestion'
          : currentStatus;

      await convRef.update({
        last_message_text: text.substring(0, 100),
        last_message_at: FieldValue.serverTimestamp(),
        last_message_direction: 'outbound',
        status: newStatus,
        updated_at: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, data: { message_id: msgRef.id } },
        { status: 201 }
      );
    } catch (error) {
      console.error('[whatsapp/conversations/[id]/send][POST]', error);
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
