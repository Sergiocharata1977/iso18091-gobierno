import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AIChannel, AIMessage, ConversationThread } from '@/types/ai-core';
import { Timestamp } from 'firebase-admin/firestore';

const CONVERSATIONS_COLLECTION = 'ai_conversations';
const MESSAGES_COLLECTION = 'messages';

function timestampToDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in (value as object)) {
    try {
      return (value as Timestamp).toDate();
    } catch {
      return new Date();
    }
  }
  return new Date();
}

function sanitizeChannels(value: unknown): AIChannel[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is AIChannel => v === 'voice' || v === 'chat' || v === 'whatsapp'
  );
}

export class AIConversationStore {
  static async getOrCreateConversation(params: {
    userId: string;
    organizationId: string;
    channel: AIChannel;
    sessionId?: string;
  }): Promise<ConversationThread> {
    const db = getAdminFirestore();
    const conversationId =
      params.sessionId?.trim() ||
      db.collection(CONVERSATIONS_COLLECTION).doc().id;
    const conversationRef = db
      .collection(CONVERSATIONS_COLLECTION)
      .doc(conversationId);
    const existing = await conversationRef.get();
    const now = Timestamp.now();

    if (existing.exists) {
      const data = existing.data() || {};

      if (
        data.userId !== params.userId ||
        data.organizationId !== params.organizationId
      ) {
        throw new Error(
          'Conversation does not belong to the authenticated scope'
        );
      }

      const channels = Array.from(
        new Set([...sanitizeChannels(data.channels), params.channel])
      ) as AIChannel[];

      await conversationRef.set(
        {
          channels,
          lastMessageAt: now,
          updatedAt: now,
          metadata: {
            ...(typeof data.metadata === 'object' && data.metadata
              ? data.metadata
              : {}),
            sessionId: conversationId,
          },
        },
        { merge: true }
      );

      return {
        id: conversationId,
        userId: data.userId,
        organizationId: data.organizationId,
        channels,
        status: data.status || 'active',
        lastMessageAt: new Date(),
        createdAt: timestampToDate(data.createdAt),
        metadata:
          typeof data.metadata === 'object' && data.metadata
            ? { ...data.metadata, sessionId: conversationId }
            : { sessionId: conversationId },
      };
    }

    await conversationRef.set({
      userId: params.userId,
      organizationId: params.organizationId,
      channels: [params.channel],
      status: 'active',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
      metadata: {
        sessionId: conversationId,
      },
    });

    return {
      id: conversationId,
      userId: params.userId,
      organizationId: params.organizationId,
      channels: [params.channel],
      status: 'active',
      lastMessageAt: new Date(),
      createdAt: new Date(),
      metadata: { sessionId: conversationId },
    };
  }

  static async appendMessage(
    message: AIMessage & {
      conversationId: string;
      userId?: string;
      organizationId?: string;
    }
  ) {
    const db = getAdminFirestore();
    const now = Timestamp.now();
    const conversationRef = db
      .collection(CONVERSATIONS_COLLECTION)
      .doc(message.conversationId);
    const conversationDoc = await conversationRef.get();
    const conversationData = conversationDoc.data() || {};
    const userId =
      message.userId || (conversationData.userId as string | undefined) || '';
    const organizationId =
      message.organizationId ||
      (conversationData.organizationId as string | undefined) ||
      '';

    const docRef = await conversationRef.collection(MESSAGES_COLLECTION).add({
      role: message.role,
      channel: message.channel,
      content: message.content,
      userId,
      organizationId,
      toolCalls: message.toolCalls || [],
      traceId: message.traceId,
      timestamp: now,
    });

    await conversationRef.set(
      {
        userId,
        organizationId,
        channels: Array.from(
          new Set([
            ...sanitizeChannels(conversationData.channels),
            message.channel,
          ])
        ),
        lastMessageAt: now,
        updatedAt: now,
        metadata: {
          ...(typeof conversationData.metadata === 'object' &&
          conversationData.metadata
            ? conversationData.metadata
            : {}),
          sessionId: message.conversationId,
        },
      },
      { merge: true }
    );

    return {
      ...message,
      id: docRef.id,
      timestamp: message.timestamp || new Date(),
    };
  }

  static async getHistory(
    conversationId: string,
    limit = 20
  ): Promise<AIMessage[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(CONVERSATIONS_COLLECTION)
      .doc(conversationId)
      .collection(MESSAGES_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs
      .map(doc => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          conversationId,
          role: data.role,
          channel: data.channel,
          content: data.content || '',
          toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
          traceId: data.traceId || '',
          timestamp: timestampToDate(data.timestamp),
        } as AIMessage;
      })
      .reverse();
  }
}
