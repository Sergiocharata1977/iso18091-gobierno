import type { VoiceIntentResult } from '@/services/ai-core/voiceIntentDetector';
import type { AIChannel, AIMessage, ConverseResponse } from '@/types/ai-core';

const ACTIVE_SESSION_PREFIX = 'ai-active-session';
const CONVERSATION_PREFIX = 'ai-conversation';

export type ConverseClientResponse = ConverseResponse & {
  reply: string;
  sessionId: string | null;
  deduplicated?: boolean;
  voiceIntent?: VoiceIntentResult;
};

type SendConverseParams = {
  channel: AIChannel;
  message: string;
  organizationId: string;
  sessionId?: string | null;
  pathname?: string;
  dashboardData?: Record<string, unknown>;
  signal?: AbortSignal;
};

function canUseStorage(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  );
}

function buildActiveSessionKey(userId: string): string {
  return `${ACTIVE_SESSION_PREFIX}:${userId}`;
}

function buildConversationKey(sessionId: string): string {
  return `${CONVERSATION_PREFIX}:${sessionId}`;
}

export function getStoredActiveAISessionId(userId: string): string | null {
  if (!userId || !canUseStorage()) return null;
  return window.localStorage.getItem(buildActiveSessionKey(userId));
}

export function setStoredActiveAISessionId(
  userId: string,
  sessionId: string | null
): void {
  if (!userId || !canUseStorage()) return;
  const key = buildActiveSessionKey(userId);
  if (!sessionId) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, sessionId);
}

export function getStoredAIConversationId(sessionId: string): string | null {
  if (!sessionId || !canUseStorage()) return null;
  return window.localStorage.getItem(buildConversationKey(sessionId));
}

export function setStoredAIConversationId(
  sessionId: string,
  conversationId: string | null
): void {
  if (!sessionId || !canUseStorage()) return;
  const key = buildConversationKey(sessionId);
  if (!conversationId) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, conversationId);
}

export function extractAssistantReply(
  response: Partial<ConverseClientResponse>
): string {
  if (typeof response.reply === 'string' && response.reply.trim()) {
    return response.reply.trim();
  }

  const assistantMessage = Array.isArray(response.messages)
    ? response.messages.find(message => message.role === 'assistant')
    : null;

  return assistantMessage?.content?.trim() || '';
}

export function resolveAISessionId(params: {
  userId?: string | null;
  preferredSessionId?: string | null;
  fallbackPrefix: string;
}): string {
  const normalizedUserId = params.userId?.trim() || 'anonymous';
  const preferred = params.preferredSessionId?.trim();
  if (preferred) {
    if (params.userId) {
      setStoredActiveAISessionId(params.userId, preferred);
    }
    return preferred;
  }

  const stored = params.userId
    ? getStoredActiveAISessionId(params.userId)
    : null;
  if (stored?.trim()) {
    return stored;
  }

  const fallback = `${params.fallbackPrefix}:${normalizedUserId}`;
  if (params.userId) {
    setStoredActiveAISessionId(params.userId, fallback);
  }
  return fallback;
}

export function normalizeConverseMessages(
  response: Partial<ConverseClientResponse>
): AIMessage[] {
  return Array.isArray(response.messages) ? response.messages : [];
}

export async function sendConverseRequest(
  params: SendConverseParams
): Promise<ConverseClientResponse> {
  const response = await fetch('/api/ai/converse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: params.channel,
      message: params.message,
      organizationId: params.organizationId,
      sessionId: params.sessionId || undefined,
      pathname:
        params.pathname ||
        (typeof window !== 'undefined' ? window.location.pathname : undefined),
      dashboardData: params.dashboardData,
    }),
    signal: params.signal,
  });

  const data = (await response.json()) as Partial<ConverseClientResponse> & {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Error conversando con IA');
  }

  return {
    ...(data as ConverseResponse),
    reply: extractAssistantReply(data),
    sessionId:
      typeof data.sessionId === 'string' && data.sessionId.trim()
        ? data.sessionId
        : params.sessionId || null,
    deduplicated: Boolean(data.deduplicated),
    voiceIntent: data.voiceIntent,
  };
}
