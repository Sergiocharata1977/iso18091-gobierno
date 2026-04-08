import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { AIConversationStore } from '@/services/ai-core/conversationStore';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

function canReadConversation(
  auth: { uid: string; role: string },
  ownerUserId: string
) {
  if (auth.role === 'super_admin') return true;
  if (auth.uid === ownerUserId) return true;
  return ['admin', 'gerente', 'jefe', 'auditor'].includes(auth.role);
}

export const GET = withAuth(async (request, context, auth) => {
  try {
    const params = await context.params;
    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId requerido' },
        { status: 400 }
      );
    }

    const query = QuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    );
    const limit = query.limit ?? 50;

    const db = getAdminFirestore();
    const conversationDoc = await db
      .collection('ai_conversations')
      .doc(conversationId)
      .get();
    if (!conversationDoc.exists) {
      return NextResponse.json(
        { error: 'Conversacion no encontrada' },
        { status: 404 }
      );
    }

    const conversation = (conversationDoc.data() || {}) as Record<
      string,
      unknown
    >;
    const ownerUserId =
      typeof conversation.userId === 'string' ? conversation.userId : '';
    const organizationId =
      typeof conversation.organizationId === 'string'
        ? conversation.organizationId
        : null;

    if (!ownerUserId) {
      return NextResponse.json(
        { error: 'Conversacion invalida (sin owner)' },
        { status: 500 }
      );
    }

    if (!canReadConversation(auth, ownerUserId)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    if (
      auth.role !== 'super_admin' &&
      organizationId &&
      auth.organizationId &&
      organizationId !== auth.organizationId
    ) {
      return NextResponse.json(
        { error: 'Conversacion fuera del alcance de la organizacion' },
        { status: 403 }
      );
    }

    const messages = await AIConversationStore.getHistory(
      conversationId,
      limit
    );

    return NextResponse.json({
      conversation: {
        id: conversationDoc.id,
        userId: ownerUserId,
        organizationId,
        channels: Array.isArray(conversation.channels)
          ? conversation.channels
          : [],
        status: conversation.status || 'active',
        metadata:
          typeof conversation.metadata === 'object' &&
          conversation.metadata !== null
            ? conversation.metadata
            : {},
      },
      messages,
      total: messages.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Query invalida', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[API /api/ai/conversations/[id]/history] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener historial de conversacion',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
