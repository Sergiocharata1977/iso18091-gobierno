import { ChannelIdentityResolver } from '@/services/ai-core/channelIdentityResolver';
import { AIIdempotencyGuard } from '@/services/ai-core/idempotencyGuard';
import { AIPolicyEngine } from '@/services/ai-core/policyEngine';
import { UnifiedConverseService } from '@/services/ai-core/UnifiedConverseService';
import { UserRoleResolver } from '@/services/ai-core/userRoleResolver';
import type { ConverseResponse } from '@/types/ai-core';

export class WhatsAppAdapter {
  static async processIncoming(params: {
    from: string;
    body?: string;
    mediaUrl?: string;
    messageSid?: string;
    fallbackOrganizationId?: string | null;
  }): Promise<
    | {
        ok: true;
        response: ConverseResponse;
        userId: string;
        organizationId: string;
      }
    | { ok: false; reason: string; code: string }
  > {
    const content = (params.body || '').trim();
    const normalizedFrom = params.from.replace(/^whatsapp:/i, '').trim();
    const identity = await ChannelIdentityResolver.resolveByExternalId({
      channel: 'whatsapp',
      externalId: params.from,
    });
    const organizationId =
      identity?.organizationId || params.fallbackOrganizationId || '';
    const userId = identity?.userId || `wa:${normalizedFrom}`;
    const resolvedRole = identity
      ? await UserRoleResolver.resolve(identity.userId)
      : 'operario';

    const policy = AIPolicyEngine.checkPermission({
      userId,
      organizationId,
      role: resolvedRole,
      channel: 'whatsapp',
      action: 'converse',
      inputText: content,
    });
    if (!policy.allowed) {
      return {
        ok: false,
        code: policy.code || 'FORBIDDEN',
        reason: policy.reason || 'Accion bloqueada por permisos',
      };
    }

    const key = AIIdempotencyGuard.buildKey({
      channel: 'whatsapp',
      userId,
      organizationId,
      externalMessageId: params.messageSid,
      contentPreview: content || params.mediaUrl || '',
    });
    if (key) {
      const cached = await AIIdempotencyGuard.get(key);
      if (cached) {
        return {
          ok: true,
          response: cached,
          userId,
          organizationId,
        };
      }
    }

    const response = await UnifiedConverseService.converse({
      channel: 'whatsapp',
      message: content || params.mediaUrl || '[audio sin transcripcion]',
      sessionId: `wa:${normalizedFrom}`,
      organizationId,
      userId,
      userRole: resolvedRole,
      pathname: '/whatsapp',
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

    return {
      ok: true,
      response: mappedResponse,
      userId,
      organizationId,
    };
  }

  static async handleIncoming(params: {
    from: string;
    message: string;
    organizationId: string;
    messageSid?: string;
  }): Promise<string | null> {
    try {
      const result = await WhatsAppAdapter.processIncoming({
        from: params.from,
        body: params.message,
        messageSid: params.messageSid,
        fallbackOrganizationId: params.organizationId,
      });

      if (!result.ok) {
        console.warn(
          '[WhatsAppAdapter] processIncoming rejected:',
          result.code,
          result.reason
        );
        return null;
      }

      const assistantMessage = [...result.response.messages]
        .reverse()
        .find(message => message.role === 'assistant');

      return assistantMessage?.content || null;
    } catch (error: unknown) {
      console.error(
        '[WhatsAppAdapter] handleIncoming threw unexpectedly:',
        error
      );
      return null;
    }
  }
}
