import { AIIdempotencyGuard } from '@/services/ai-core/idempotencyGuard';
import { UnifiedConverseService } from '@/services/ai-core/UnifiedConverseService';
import { AIPolicyEngine } from '@/services/ai-core/policyEngine';
import type { ConverseResponse } from '@/types/ai-core';

export class ChatAdapter {
  static async process(params: {
    userId: string;
    organizationId: string;
    role: string;
    content: string;
    sessionId?: string;
    clientMessageId?: string;
    screen?: string;
    email?: string;
  }): Promise<ConverseResponse> {
    const policy = AIPolicyEngine.checkPermission({
      userId: params.userId,
      organizationId: params.organizationId,
      role: params.role,
      channel: 'chat',
      action: 'converse',
      inputText: params.content,
    });
    if (!policy.allowed) {
      throw new Error(policy.reason || 'Accion bloqueada por permisos');
    }

    const key = AIIdempotencyGuard.buildKey({
      channel: 'chat',
      userId: params.userId,
      organizationId: params.organizationId,
      clientMessageId: params.clientMessageId,
      contentPreview: params.content,
    });
    if (key) {
      const cached = await AIIdempotencyGuard.get(key);
      if (cached) return cached;
    }

    const response = await UnifiedConverseService.converse({
      channel: 'chat',
      message: params.content,
      sessionId: params.sessionId,
      organizationId: params.organizationId,
      userId: params.userId,
      userRole: params.role,
      pathname: params.screen || '/chat',
    });

    const mappedResponse: ConverseResponse = {
      traceId: response.traceId,
      conversationId: response.sessionId,
      messages: response.messages,
      actions: [],
      uiCommands: [],
    };

    if (key) {
      await AIIdempotencyGuard.set({
        key,
        conversationId: mappedResponse.conversationId,
        response: mappedResponse,
      });
    }
    return mappedResponse;
  }
}
