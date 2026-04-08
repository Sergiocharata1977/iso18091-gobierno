/**
 * API Simulador WhatsApp — Ola 2C
 * Solo accesible para super_admin. Reutiliza el mismo pipeline que el webhook real.
 *
 * POST /api/dev/whatsapp/simulate
 *   Simula un mensaje entrante de un "cliente", procesa con el adapter de IA,
 *   guarda inbound + outbound en whatsapp_conversations/{convId}/messages,
 *   y devuelve la respuesta completa.
 *
 * GET /api/dev/whatsapp/simulate?organization_id=xxx
 *   Retorna la última conversación de simulación y sus mensajes.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { WhatsAppAdapter } from '@/services/ai-core/adapters/whatsappAdapter';
import { MessageSearchService } from '@/services/whatsapp/MessageSearchService';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── Schema de validación ────────────────────────────────────────────────────

const simulateSchema = z.object({
  org_id: z.string().min(1),
  from_phone: z.string().min(10).max(15),  // E.164 del "cliente simulado"
  from_name: z.string().optional(),
  message: z.string().min(1).max(4096),
  simulate_ai_reply: z.boolean().default(true),
  link_client_by_phone: z.boolean().default(true),
});

// ─── POST — Simular mensaje entrante ────────────────────────────────────────

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = simulateSchema.parse(await request.json());

      // 1. Resolver organizationId (super_admin puede apuntar a cualquier org)
      const scope = await resolveAuthorizedOrganizationId(auth, body.org_id);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: scope.error ?? 'Acceso denegado' },
          { status: scope.status ?? 403 }
        );
      }
      const orgId = scope.organizationId;
      const db = getAdminFirestore();
      const searchService = new MessageSearchService(db);

      // 2. Buscar conversación de simulación existente para ese teléfono
      const convsRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsapp_conversations');

      const existingSnap = await convsRef
        .where('phone_e164', '==', body.from_phone)
        .where('is_simulation', '==', true)
        .where('status', '!=', 'archivada')
        .limit(1)
        .get();

      let convId: string;

      if (!existingSnap.empty) {
        convId = existingSnap.docs[0].id;
      } else {
        // 3. Crear nueva conversación de simulación
        const newConvRef = convsRef.doc();
        await newConvRef.set({
          phone_e164: body.from_phone,
          contact_name: body.from_name ?? `Simulado: ${body.from_phone}`,
          organization_id: orgId,
          channel: 'simulator',
          source: 'simulation',
          type: 'crm',
          status: 'abierta',
          unread_count: 0,
          is_simulation: true,
          ai_enabled: body.simulate_ai_reply,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });
        convId = newConvRef.id;
      }

      // 4. Vincular cliente por teléfono si se solicita
      let clientDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

      if (body.link_client_by_phone) {
        const crmRef = db
          .collection('organizations')
          .doc(orgId)
          .collection('crm_clientes');

        // Busca por campo "telefono" o "whatsapp_phone"
        const [byTelefono, byWhatsapp] = await Promise.all([
          crmRef.where('telefono', '==', body.from_phone).limit(1).get(),
          crmRef.where('whatsapp_phone', '==', body.from_phone).limit(1).get(),
        ]);

        const clientSnap = !byTelefono.empty ? byTelefono : !byWhatsapp.empty ? byWhatsapp : null;

        if (clientSnap && !clientSnap.empty) {
          clientDoc = clientSnap.docs[0];
          const clientData = clientDoc.data() as Record<string, unknown>;
          await convsRef.doc(convId).update({
            client_id: clientDoc.id,
            client_name: (clientData.nombre ?? clientData.razon_social ?? body.from_phone) as string,
            updated_at: FieldValue.serverTimestamp(),
          });
        }
      }

      // 5. Guardar mensaje inbound
      const messagesRef = convsRef.doc(convId).collection('messages');
      const inboundRef = messagesRef.doc();

      await inboundRef.set({
        conversation_id: convId,
        organization_id: orgId,
        direction: 'inbound',
        text: body.message,
        provider: 'simulator',
        sender_type: 'client',
        status: 'delivered',
        is_simulation: true,
        created_at: FieldValue.serverTimestamp(),
      });

      await searchService.indexMessage(orgId, convId, inboundRef.id, body.message);

      // Actualizar last_message en la conversación (inbound)
      await convsRef.doc(convId).update({
        last_message_text: body.message.substring(0, 200),
        last_message_at: FieldValue.serverTimestamp(),
        last_message_direction: 'inbound',
        unread_count: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
      });

      // 6. Respuesta IA si se solicita
      let aiReply: string | null = null;
      let outboundRef: FirebaseFirestore.DocumentReference | null = null;

      if (body.simulate_ai_reply) {
        try {
          aiReply = await WhatsAppAdapter.handleIncoming({
            from: body.from_phone,
            message: body.message,
            organizationId: orgId,
            messageSid: `sim_${convId}`,
          });

          if (aiReply) {
            outboundRef = messagesRef.doc();
            await outboundRef.set({
              conversation_id: convId,
              organization_id: orgId,
              direction: 'outbound',
              text: aiReply,
              provider: 'simulator',
              sender_type: 'ai',
              sender_name: 'Don Cándido (Simulado)',
              status: 'sent',
              is_simulation: true,
              created_at: FieldValue.serverTimestamp(),
            });

            await searchService.indexMessage(orgId, convId, outboundRef.id, aiReply);

            // Actualizar last_message con respuesta outbound de la IA
            await convsRef.doc(convId).update({
              last_message_text: aiReply.substring(0, 200),
              last_message_at: FieldValue.serverTimestamp(),
              last_message_direction: 'outbound',
              unread_count: 1,
              updated_at: FieldValue.serverTimestamp(),
            });
          }
        } catch (aiError: unknown) {
          console.error('[dev/whatsapp/simulate][POST] AI processing error:', aiError);
          // No falla el endpoint si la IA falla — retorna aiReply: null
        }
      }

      // 7. Respuesta final
      return NextResponse.json(
        {
          success: true,
          data: {
            conversation_id: convId,
            inbound_message_id: inboundRef.id,
            ai_reply: aiReply ?? null,
            outbound_message_id: outboundRef?.id ?? null,
            client_linked: !!clientDoc,
            client_id: clientDoc?.id ?? null,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[dev/whatsapp/simulate][POST]', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del simulador' },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);

// ─── GET — Última conversación de simulación ─────────────────────────────────

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: scope.error ?? 'Acceso denegado' },
          { status: scope.status ?? 403 }
        );
      }
      const orgId = scope.organizationId;
      const db = getAdminFirestore();

      // Buscar la última conversación de simulación para esta org
      const convsSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsapp_conversations')
        .where('is_simulation', '==', true)
        .orderBy('updated_at', 'desc')
        .limit(1)
        .get();

      if (convsSnap.empty) {
        return NextResponse.json({
          success: true,
          data: { conversation: null, messages: [] },
        });
      }

      const convDoc = convsSnap.docs[0];
      const conversation = { id: convDoc.id, ...convDoc.data() };

      // Obtener mensajes de esa conversación ordenados cronológicamente
      const messagesSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsapp_conversations')
        .doc(convDoc.id)
        .collection('messages')
        .orderBy('created_at', 'asc')
        .get();

      const messages = messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return NextResponse.json({
        success: true,
        data: { conversation, messages },
      });
    } catch (error) {
      console.error('[dev/whatsapp/simulate][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la conversación de simulación' },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);
