import { AIIdempotencyGuard } from '@/services/ai-core/idempotencyGuard';
import { UnifiedConverseService } from '@/services/ai-core/UnifiedConverseService';
import { AIPolicyEngine } from '@/services/ai-core/policyEngine';
import type { ConverseResponse } from '@/types/ai-core';

export class VoiceAdapter {
  static async process(params: {
    userId: string;
    organizationId: string;
    role: string;
    transcript?: string;
    audioUrl?: string;
    sessionId?: string;
    clientMessageId?: string;
    screen?: string;
    email?: string;
  }): Promise<ConverseResponse> {
    const inputText = params.transcript || params.audioUrl || '';
    const policy = AIPolicyEngine.checkPermission({
      userId: params.userId,
      organizationId: params.organizationId,
      role: params.role,
      channel: 'voice',
      action: 'converse',
      inputText,
    });
    if (!policy.allowed) {
      throw new Error(policy.reason || 'Accion bloqueada por permisos');
    }

    const key = AIIdempotencyGuard.buildKey({
      channel: 'voice',
      userId: params.userId,
      organizationId: params.organizationId,
      clientMessageId: params.clientMessageId,
      contentPreview: inputText,
    });
    if (key) {
      const cached = await AIIdempotencyGuard.get(key);
      if (cached) return cached;
    }

    const response = await UnifiedConverseService.converse({
      channel: 'voice',
      message: inputText,
      sessionId: params.sessionId,
      organizationId: params.organizationId,
      userId: params.userId,
      userRole: params.role,
      pathname: params.screen || '/mi-panel',
    });

    const mappedResponse: ConverseResponse = {
      traceId: response.traceId,
      conversationId: response.sessionId,
      messages: response.messages,
      actions: [],
      uiCommands: response.uiCommands || [],
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
