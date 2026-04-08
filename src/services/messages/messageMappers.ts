import type { AIMessage, ConversationThread } from '../../types/ai-core';
import type {
  MessageChannel,
  UnifiedConversation,
  UnifiedConversationStatus,
  UnifiedMessage,
  UnifiedMessageDirection,
  UnifiedParticipantType,
} from '../../types/messages';
import type {
  WhatsAppConversationV2,
  WhatsAppMessageV2,
} from '../../types/whatsapp';

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const parsed = value.toDate();
    if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date(0);
}

function truncateIdentifier(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 12) {
    return trimmed || 'Sin titulo';
  }

  return `${trimmed.slice(0, 12)}...`;
}

function toUnifiedConversationStatus(status: string): UnifiedConversationStatus {
  if (status === 'open') {
    return 'pending';
  }

  if (status === 'closed') {
    return 'archived';
  }

  switch (status) {
    case 'pendiente_respuesta':
    case 'en_gestion':
      return 'pending';
    case 'archivada':
    case 'spam':
    case 'resuelta':
      return 'archived';
    case 'abierta':
    default:
      return 'read';
  }
}

function toUnifiedDirection(value: unknown): UnifiedMessageDirection {
  if (value === 'INBOUND' || value === 'inbound' || value === 'user') {
    return 'inbound';
  }

  return 'outbound';
}

function toUnifiedParticipantType(value: unknown): UnifiedParticipantType {
  switch (value) {
    case 'client':
    case 'user':
      return value === 'client' ? 'client' : 'employee';
    case 'assistant':
    case 'ai':
      return 'ai';
    default:
      return 'unknown';
  }
}

function toUnifiedMessageStatus(
  value: WhatsAppMessageV2['status']
): UnifiedMessage['status'] {
  if (
    value === 'sent' ||
    value === 'delivered' ||
    value === 'read' ||
    value === 'failed'
  ) {
    return value;
  }

  return undefined;
}

export function buildUnifiedId(
  channel: MessageChannel,
  sourceId: string
): string {
  return `${channel}:${sourceId}`;
}

export function parseUnifiedId(
  unifiedId: string
): { channel: MessageChannel; sourceId: string } | null {
  const separatorIndex = unifiedId.indexOf(':');
  if (separatorIndex <= 0) {
    return null;
  }

  const channel = unifiedId.slice(0, separatorIndex);
  const sourceId = unifiedId.slice(separatorIndex + 1);

  if (
    (channel !== 'whatsapp' && channel !== 'ai_chat') ||
    sourceId.trim().length === 0
  ) {
    return null;
  }

  return {
    channel,
    sourceId,
  };
}

export function toUnifiedWhatsAppConversation(
  doc: WhatsAppConversationV2,
  orgId: string
): UnifiedConversation {
  const sourceId = doc.id;
  const fallbackDate = toDate(doc.updated_at ?? doc.created_at);
  const lastMessageAt = toDate(
    doc.last_message_at ?? doc.updated_at ?? doc.created_at
  );

  return {
    id: buildUnifiedId('whatsapp', sourceId),
    channel: 'whatsapp',
    sourceId,
    organizationId: orgId,
    contactName: doc.contact_name?.trim() || doc.phone_e164,
    contactIdentifier: doc.phone_e164,
    participantType: 'client',
    status: toUnifiedConversationStatus(doc.status),
    unreadCount: doc.unread_count ?? 0,
    assignedUserId: doc.assigned_user_id,
    assignedUserName: doc.assigned_user_name,
    lastMessageText: doc.last_message_text ?? '',
    lastMessageAt,
    lastMessageDirection: toUnifiedDirection(doc.last_message_direction),
    clientId: doc.client_id,
    createdAt: toDate(doc.created_at ?? fallbackDate),
    updatedAt: toDate(doc.updated_at ?? lastMessageAt),
  };
}

export function toUnifiedWhatsAppMessage(
  msg: WhatsAppMessageV2,
  conversationUnifiedId: string
): UnifiedMessage {
  return {
    id: msg.id,
    conversationId: conversationUnifiedId,
    channel: 'whatsapp',
    content: msg.text,
    direction: toUnifiedDirection(msg.direction),
    senderName:
      msg.sender_name?.trim() ||
      (msg.sender_type === 'client' ? 'Cliente' : 'WhatsApp'),
    senderType: toUnifiedParticipantType(msg.sender_type),
    timestamp: toDate(msg.created_at),
    status: toUnifiedMessageStatus(msg.status),
  };
}

export function toUnifiedAIConversation(
  thread: ConversationThread,
  lastMessage?: AIMessage
): UnifiedConversation {
  const sourceId = thread.id;
  const contactName =
    thread.metadata?.title?.trim() || truncateIdentifier(thread.userId);
  const lastMessageDate = toDate(lastMessage?.timestamp ?? thread.lastMessageAt);

  return {
    id: buildUnifiedId('ai_chat', sourceId),
    channel: 'ai_chat',
    sourceId,
    organizationId: thread.organizationId,
    contactName,
    contactIdentifier: thread.userId,
    participantType: 'client',
    status: thread.status === 'archived' ? 'archived' : 'read',
    unreadCount: 0,
    lastMessageText: lastMessage?.content ?? thread.metadata?.summary ?? '',
    lastMessageAt: lastMessageDate,
    lastMessageDirection: toUnifiedDirection(lastMessage?.role),
    createdAt: toDate(thread.createdAt),
    updatedAt: toDate(thread.lastMessageAt),
  };
}

export function toUnifiedAIMessage(
  msg: AIMessage,
  conversationUnifiedId: string
): UnifiedMessage {
  return {
    id: msg.id ?? `${msg.traceId}:${msg.timestamp.getTime()}`,
    conversationId: conversationUnifiedId,
    channel: 'ai_chat',
    content: msg.content,
    direction: toUnifiedDirection(msg.role),
    senderName:
      msg.role === 'assistant'
        ? 'Asistente IA'
        : msg.role === 'user'
          ? 'Usuario'
          : 'Sistema',
    senderType: toUnifiedParticipantType(msg.role),
    timestamp: toDate(msg.timestamp),
  };
}
