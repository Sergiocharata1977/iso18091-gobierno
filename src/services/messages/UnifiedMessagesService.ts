import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  AIChannel,
  AIMessage,
  ConversationThread,
} from '@/types/ai-core';
import type {
  MessageChannel,
  UnifiedConversation,
  UnifiedThreadMetadata,
  UnifiedConversationDetail,
} from '@/types/messages';
import type {
  WhatsAppConversationV2,
  WhatsAppMessageV2,
} from '@/types/whatsapp';
import { ThreadMetadataService } from './threadMetadataService';
import {
  parseUnifiedId,
  toUnifiedAIConversation,
  toUnifiedAIMessage,
  toUnifiedWhatsAppConversation,
  toUnifiedWhatsAppMessage,
} from './messageMappers';

export interface ListConversationsParams {
  orgId: string;
  channel?: MessageChannel;
  status?: string;
  limit?: number;
  search?: string;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const maybeDate = value.toDate();
    if (maybeDate instanceof Date && !Number.isNaN(maybeDate.getTime())) {
      return maybeDate;
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date(0);
}

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(limit ?? 50), 1), 100);
}

function normalizeAIChannel(value: unknown): AIChannel {
  if (value === 'voice' || value === 'chat' || value === 'whatsapp') {
    return value;
  }

  return 'chat';
}

function mapAIConversationDoc(
  id: string,
  data: Record<string, unknown>
): ConversationThread {
  const metadata =
    data.metadata && typeof data.metadata === 'object'
      ? (data.metadata as Record<string, unknown>)
      : null;

  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    organizationId:
      typeof data.organizationId === 'string' ? data.organizationId : '',
    channels: Array.isArray(data.channels)
      ? data.channels.filter(
          (value): value is AIChannel =>
            value === 'voice' || value === 'chat' || value === 'whatsapp'
        )
      : [],
    status: data.status === 'archived' ? 'archived' : 'active',
    lastMessageAt: toDate(data.lastMessageAt),
    createdAt: toDate(data.createdAt),
    metadata: metadata
      ? {
          title: typeof metadata.title === 'string' ? metadata.title : undefined,
          summary:
            typeof metadata.summary === 'string' ? metadata.summary : undefined,
          sessionId:
            typeof metadata.sessionId === 'string'
              ? metadata.sessionId
              : undefined,
        }
      : undefined,
  };
}

function mapAIMessageDoc(
  id: string,
  conversationId: string,
  data: Record<string, unknown>
): AIMessage {
  return {
    id,
    conversationId,
    role:
      data.role === 'assistant' || data.role === 'system' ? data.role : 'user',
    channel: normalizeAIChannel(data.channel),
    content: typeof data.content === 'string' ? data.content : '',
    toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
    traceId: typeof data.traceId === 'string' ? data.traceId : id,
    timestamp: toDate(data.timestamp),
  };
}

function mapWhatsAppConversationDoc(
  id: string,
  data: Record<string, unknown>
): WhatsAppConversationV2 {
  return {
    id,
    organization_id:
      typeof data.organization_id === 'string' ? data.organization_id : '',
    phone_e164: typeof data.phone_e164 === 'string' ? data.phone_e164 : '',
    contact_name:
      typeof data.contact_name === 'string' ? data.contact_name : undefined,
    client_id: typeof data.client_id === 'string' ? data.client_id : undefined,
    client_name:
      typeof data.client_name === 'string' ? data.client_name : undefined,
    contact_id:
      typeof data.contact_id === 'string' ? data.contact_id : undefined,
    assigned_user_id:
      typeof data.assigned_user_id === 'string'
        ? data.assigned_user_id
        : undefined,
    assigned_user_name:
      typeof data.assigned_user_name === 'string'
        ? data.assigned_user_name
        : undefined,
    channel:
      data.channel === 'meta' ||
      data.channel === 'twilio' ||
      data.channel === 'simulator'
        ? data.channel
        : 'meta',
    source:
      data.source === 'webhook' ||
      data.source === 'manual' ||
      data.source === 'simulation' ||
      data.source === 'public_form'
        ? data.source
        : 'manual',
    type:
      data.type === 'crm' ||
      data.type === 'iso' ||
      data.type === 'support' ||
      data.type === 'dealer'
        ? data.type
        : 'crm',
    status:
      data.status === 'pendiente_respuesta' ||
      data.status === 'en_gestion' ||
      data.status === 'resuelta' ||
      data.status === 'archivada' ||
      data.status === 'spam'
        ? data.status
        : 'abierta',
    unread_count:
      typeof data.unread_count === 'number' ? data.unread_count : 0,
    last_message_text:
      typeof data.last_message_text === 'string'
        ? data.last_message_text
        : undefined,
    last_message_at: data.last_message_at,
    last_message_direction:
      data.last_message_direction === 'outbound' ? 'outbound' : 'inbound',
    is_simulation:
      typeof data.is_simulation === 'boolean' ? data.is_simulation : undefined,
    ai_enabled:
      typeof data.ai_enabled === 'boolean' ? data.ai_enabled : undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function mapWhatsAppMessageDoc(
  id: string,
  conversationId: string,
  orgId: string,
  data: Record<string, unknown>
): WhatsAppMessageV2 {
  return {
    id,
    conversation_id: conversationId,
    organization_id: orgId,
    direction: data.direction === 'outbound' ? 'outbound' : 'inbound',
    text: typeof data.text === 'string' ? data.text : '',
    provider:
      data.provider === 'twilio' || data.provider === 'simulator'
        ? data.provider
        : 'meta',
    provider_message_id:
      typeof data.provider_message_id === 'string'
        ? data.provider_message_id
        : undefined,
    sender_type:
      data.sender_type === 'client' ||
      data.sender_type === 'user' ||
      data.sender_type === 'ai' ||
      data.sender_type === 'system'
        ? data.sender_type
        : 'system',
    sender_user_id:
      typeof data.sender_user_id === 'string'
        ? data.sender_user_id
        : undefined,
    sender_name:
      typeof data.sender_name === 'string' ? data.sender_name : undefined,
    status:
      data.status === 'queued' ||
      data.status === 'sent' ||
      data.status === 'delivered' ||
      data.status === 'read' ||
      data.status === 'failed'
        ? data.status
        : undefined,
    error_message:
      typeof data.error_message === 'string' ? data.error_message : undefined,
    is_simulation:
      typeof data.is_simulation === 'boolean' ? data.is_simulation : undefined,
    created_at: data.created_at,
  };
}

function matchesSearch(
  conversation: UnifiedConversation,
  normalizedSearch: string
): boolean {
  return (
    conversation.contactName.toLowerCase().includes(normalizedSearch) ||
    conversation.lastMessageText.toLowerCase().includes(normalizedSearch)
  );
}

function applyThreadMetadata(
  conversation: UnifiedConversation,
  metadata: UnifiedThreadMetadata | null
): UnifiedConversation {
  if (!metadata) {
    return conversation;
  }

  return {
    ...conversation,
    status: metadata.status ?? conversation.status,
    assignedUserId: metadata.assignedUserId ?? conversation.assignedUserId,
    assignedUserName: metadata.assignedUserName ?? conversation.assignedUserName,
    tags: metadata.tags ?? conversation.tags,
    updatedAt: metadata.updatedAt ?? conversation.updatedAt,
  };
}

async function getThreadMetadataMap(
  orgId: string,
  unifiedIds: string[]
): Promise<Map<string, UnifiedThreadMetadata>> {
  const uniqueIds = [...new Set(unifiedIds.filter(Boolean))];
  const entries = await Promise.all(
    uniqueIds.map(async unifiedId => {
      const metadata = await ThreadMetadataService.getThreadMetadata(orgId, unifiedId);
      return metadata ? ([unifiedId, metadata] as const) : null;
    })
  );

  return new Map(
    entries.filter(
      (entry): entry is readonly [string, UnifiedThreadMetadata] => entry !== null
    )
  );
}

export class UnifiedMessagesService {
  static async listConversations(
    params: ListConversationsParams
  ): Promise<UnifiedConversation[]> {
    const db = getAdminFirestore();
    const limit = normalizeLimit(params.limit);
    const normalizedSearch = params.search?.trim().toLowerCase() || '';
    const shouldFetchWhatsApp =
      params.channel === undefined || params.channel === 'whatsapp';
    const shouldFetchAI =
      params.channel === undefined || params.channel === 'ai_chat';

    const tasks: Array<Promise<UnifiedConversation[]>> = [];

    if (shouldFetchWhatsApp) {
      tasks.push(
        db
          .collection('organizations')
          .doc(params.orgId)
          .collection('whatsapp_conversations')
          .orderBy('updated_at', 'desc')
          .limit(limit)
          .get()
          .then(snapshot =>
            snapshot.docs.map(doc =>
              toUnifiedWhatsAppConversation(
                mapWhatsAppConversationDoc(
                  doc.id,
                  doc.data() as Record<string, unknown>
                ),
                params.orgId
              )
            )
          )
      );
    }

    if (shouldFetchAI) {
      tasks.push(
        db
          .collection('ai_conversations')
          .where('organizationId', '==', params.orgId)
          .orderBy('lastMessageAt', 'desc')
          .limit(limit)
          .get()
          .then(async snapshot => {
            const rows = await Promise.all(
              snapshot.docs.map(async doc => {
                const thread = mapAIConversationDoc(
                  doc.id,
                  doc.data() as Record<string, unknown>
                );
                const lastMessageSnap = await doc.ref
                  .collection('messages')
                  .orderBy('timestamp', 'desc')
                  .limit(1)
                  .get();
                const lastMessageDoc = lastMessageSnap.docs[0];
                const lastMessage = lastMessageDoc
                  ? mapAIMessageDoc(
                      lastMessageDoc.id,
                      doc.id,
                      lastMessageDoc.data() as Record<string, unknown>
                    )
                  : undefined;

                return toUnifiedAIConversation(thread, lastMessage);
              })
            );

            return rows;
          })
      );
    }

    let conversations = (await Promise.all(tasks))
      .flat()
      .sort(
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
      );

    const metadataMap = await getThreadMetadataMap(
      params.orgId,
      conversations.map(conversation => conversation.id)
    );
    conversations = conversations.map(conversation =>
      applyThreadMetadata(conversation, metadataMap.get(conversation.id) ?? null)
    );

    if (params.status) {
      conversations = conversations.filter(
        conversation => conversation.status === params.status
      );
    }

    if (normalizedSearch) {
      conversations = conversations.filter(conversation =>
        matchesSearch(conversation, normalizedSearch)
      );
    }

    return conversations.slice(0, limit);
  }

  static async getConversationDetail(
    orgId: string,
    unifiedId: string
  ): Promise<UnifiedConversationDetail | null> {
    const parsed = parseUnifiedId(unifiedId);
    if (!parsed) {
      return null;
    }

    const db = getAdminFirestore();

    if (parsed.channel === 'whatsapp') {
      const conversationRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsapp_conversations')
        .doc(parsed.sourceId);
      const conversationSnap = await conversationRef.get();

      if (!conversationSnap.exists) {
        return null;
      }

      const rawConversation = mapWhatsAppConversationDoc(
        conversationSnap.id,
        conversationSnap.data() as Record<string, unknown>
      );

      if (
        rawConversation.organization_id &&
        rawConversation.organization_id !== orgId
      ) {
        return null;
      }

      const messagesSnap = await conversationRef
        .collection('messages')
        .orderBy('created_at', 'asc')
        .get();

      const conversation = toUnifiedWhatsAppConversation(rawConversation, orgId);
      const messages = messagesSnap.docs.map(doc =>
        toUnifiedWhatsAppMessage(
          mapWhatsAppMessageDoc(
            doc.id,
            parsed.sourceId,
            orgId,
            doc.data() as Record<string, unknown>
          ),
          conversation.id
        )
      );

      const persistedMetadata = await ThreadMetadataService.getThreadMetadata(
        orgId,
        conversation.id
      );
      const mergedConversation = applyThreadMetadata(conversation, persistedMetadata);

      return {
        conversation: mergedConversation,
        messages,
        threadMetadata:
          persistedMetadata ??
          {
            unifiedId: mergedConversation.id,
            organizationId: orgId,
            status: mergedConversation.status,
            assignedUserId: mergedConversation.assignedUserId,
            assignedUserName: mergedConversation.assignedUserName,
            tags: mergedConversation.tags,
            updatedAt: mergedConversation.updatedAt,
          },
      };
    }

    const conversationRef = db.collection('ai_conversations').doc(parsed.sourceId);
    const conversationSnap = await conversationRef.get();

    if (!conversationSnap.exists) {
      return null;
    }

    const rawThread = mapAIConversationDoc(
      conversationSnap.id,
      conversationSnap.data() as Record<string, unknown>
    );

    if (rawThread.organizationId !== orgId) {
      return null;
    }

    const messagesSnap = await conversationRef
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnap.docs.map(doc =>
      mapAIMessageDoc(
        doc.id,
        parsed.sourceId,
        doc.data() as Record<string, unknown>
      )
    );
    const conversation = toUnifiedAIConversation(
      rawThread,
      messages[messages.length - 1]
    );

    const persistedMetadata = await ThreadMetadataService.getThreadMetadata(
      orgId,
      conversation.id
    );
    const mergedConversation = applyThreadMetadata(conversation, persistedMetadata);

    return {
      conversation: mergedConversation,
      messages: messages.map(message =>
        toUnifiedAIMessage(message, mergedConversation.id)
      ),
      threadMetadata:
        persistedMetadata ??
        {
          unifiedId: mergedConversation.id,
          organizationId: orgId,
          status: mergedConversation.status,
          assignedUserId: mergedConversation.assignedUserId,
          assignedUserName: mergedConversation.assignedUserName,
          tags: mergedConversation.tags,
          updatedAt: toDate(
            conversationSnap.data()?.updatedAt ?? rawThread.lastMessageAt
          ),
        },
    };
  }
}
