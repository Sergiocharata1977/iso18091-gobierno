import type { AIChannel, ConverseResponse } from '@/types/ai-core';

export interface ChannelIdentityLink {
  id?: string;
  channel: 'whatsapp' | 'telegram' | 'sms' | 'web' | 'voice';
  externalId: string;
  userId: string;
  organizationId: string;
  status: 'active' | 'inactive' | 'pending_verification';
  linkedAt?: Date;
  linkedBy?: string;
}

export interface ResolvedIdentity {
  channel: AIChannel;
  userId: string;
  organizationId: string;
  source: 'auth' | 'channel_link';
  externalId?: string;
}

export interface IdempotencyRecord {
  key: string;
  conversationId?: string;
  response: ConverseResponse;
  createdAt: Date;
  expiresAt: Date;
}

export interface PolicyCheckRequest {
  userId: string;
  organizationId: string;
  role: string;
  channel: AIChannel;
  action: string;
  inputText?: string;
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}
