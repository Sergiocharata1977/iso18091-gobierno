import { AIActionLogService } from '@/services/ai-core/actionLog';
import { AIConversationStore } from '@/services/ai-core/conversationStore';
import { AIToolRegistry } from '@/services/ai-core/toolRegistry';
import { AIUserProfileService } from '@/services/ai-core/userAIProfile';
import type {
  AIMessage,
  ConverseRequest,
  ConverseResponse,
  OrchestratorContext,
} from '@/types/ai-core';

function buildUserText(input: ConverseRequest['input']): string {
  if (input.type === 'text') return input.text.trim();
  if (input.transcript?.trim()) return input.transcript.trim();
  if (input.audioUrl?.trim()) return `[audio] ${input.audioUrl.trim()}`;
  return '[audio sin transcripcion]';
}

function buildAssistantEcho(userText: string): string {
  if (!userText) {
    return 'Recibi tu mensaje, pero no pude interpretar contenido util. Intenta de nuevo.';
  }
  return `Recibido por IA Core (MVP OLA 1): ${userText}`;
}

export class UnifiedAIOperator {
  static async converse(
    request: ConverseRequest,
    ctx: OrchestratorContext
  ): Promise<ConverseResponse> {
    const traceId = crypto.randomUUID();
    const now = new Date();
    const userText = buildUserText(request.input);

    const conversation = await AIConversationStore.getOrCreateConversation({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      channel: request.channel,
      sessionId: request.metadata?.sessionId,
    });

    await AIUserProfileService.touch({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      channel: request.channel,
    });

    const userMessage: AIMessage = {
      conversationId: conversation.id,
      role: 'user',
      channel: request.channel,
      content: userText,
      traceId,
      timestamp: now,
    };
    await AIConversationStore.appendMessage(
      userMessage as AIMessage & { conversationId: string }
    );

    const toolExecution = await AIToolRegistry.executeFirstMatch(userText, {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      channel: request.channel,
      inputText: userText,
    });

    const assistantText = toolExecution.matched
      ? toolExecution.result.text
      : buildAssistantEcho(userText);

    const assistantMessage: AIMessage = {
      conversationId: conversation.id,
      role: 'assistant',
      channel: request.channel,
      content: assistantText,
      traceId,
      timestamp: new Date(),
    };
    await AIConversationStore.appendMessage(
      assistantMessage as AIMessage & { conversationId: string }
    );

    await AIActionLogService.write({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      conversationId: conversation.id,
      channel: request.channel,
      tool: 'orchestrator',
      action: 'converse_echo',
      input: {
        inputType: request.input.type,
        contentPreview: userText.slice(0, 200),
        screen:
          typeof request.context?.screen === 'string'
            ? request.context.screen
            : null,
      },
      result: {
        success: true,
        data: {
          assistantMessagePreview: assistantMessage.content.slice(0, 200),
          toolMatched: toolExecution.matched,
          toolName: toolExecution.matched ? toolExecution.tool.name : null,
        },
      },
      traceId,
      requestedBy: 'user',
      timestamp: new Date(),
    });

    if (toolExecution.matched) {
      await AIActionLogService.write({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        conversationId: conversation.id,
        channel: request.channel,
        tool: toolExecution.tool.name,
        action: toolExecution.result.actionLogAction || 'execute',
        input: {
          inputText: userText.slice(0, 500),
        },
        result: {
          success: toolExecution.result.success,
          data: toolExecution.result.data,
        },
        traceId,
        requestedBy: 'user',
        timestamp: new Date(),
      });
    }

    return {
      traceId,
      conversationId: conversation.id,
      messages: [userMessage, assistantMessage],
      actions: toolExecution.matched
        ? [
            {
              type: 'TOOL_EXECUTED',
              tool: toolExecution.tool.name,
              success: toolExecution.result.success,
              data: toolExecution.result.data || null,
            },
          ]
        : [],
      uiCommands: toolExecution.matched
        ? toolExecution.result.uiCommands || []
        : [],
    };
  }
}
