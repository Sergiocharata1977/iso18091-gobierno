import { z } from 'zod';

export type MessageChannel = 'whatsapp' | 'ai_chat';

export type UnifiedConversationStatus =
  | 'unread'
  | 'read'
  | 'pending'
  | 'archived';

export type UnifiedParticipantType = 'client' | 'employee' | 'ai' | 'unknown';

export type UnifiedMessageDirection = 'inbound' | 'outbound';

export interface UnifiedConversation {
  id: string;
  channel: MessageChannel;
  sourceId: string;
  organizationId: string;
  contactName: string;
  contactIdentifier: string;
  participantType: UnifiedParticipantType;
  status: UnifiedConversationStatus;
  unreadCount: number;
  assignedUserId?: string;
  assignedUserName?: string;
  lastMessageText: string;
  lastMessageAt: Date;
  lastMessageDirection: UnifiedMessageDirection;
  tags?: string[];
  clientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnifiedMessage {
  id: string;
  conversationId: string;
  channel: MessageChannel;
  content: string;
  direction: UnifiedMessageDirection;
  senderName: string;
  senderType: UnifiedParticipantType;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface UnifiedConversationDetail {
  conversation: UnifiedConversation;
  messages: UnifiedMessage[];
  threadMetadata?: UnifiedThreadMetadata;
}

export interface UnifiedThreadMetadata {
  unifiedId: string;
  organizationId: string;
  status?: UnifiedConversationStatus;
  assignedUserId?: string;
  assignedUserName?: string;
  tags?: string[];
  updatedAt: Date;
  updatedBy?: string;
}

export interface InternalNote {
  id: string;
  unifiedId: string;
  organizationId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export const internalNoteSchema = z.object({
  content: z.string().min(1).max(2000),
});
