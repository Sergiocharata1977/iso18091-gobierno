// API: /api/chat/messages
// Envio y recepcion de mensajes con IA

import { LLMRouter, type LLMRouterMessage } from '@/ai/services/LLMRouter';
import type { LLMResponseMetadata } from '@/ai/types/LLMRouterTypes';
import { aiTelemetry } from '@/ai/telemetry';
import { ContextBuilder } from '@/ai/services/ContextBuilder';
import { ChatService } from '@/features/chat/services/ChatService';
import { ContextService } from '@/features/chat/services/ContextService';
import { AIMode } from '@/features/chat/types';
import { withAuth } from '@/lib/api/withAuth';
import {
  getContextDocsForScreen,
  getDocSummariesForModule,
} from '@/lib/docs/ai-context';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { ChatAdapter } from '@/services/ai-core/adapters/chatAdapter';
import { IAOutputValidator } from '@/services/ia/IAOutputValidator';
import type { DocModule } from '@/types/docs';
import { NextResponse } from 'next/server';

const CHAT_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const ELEVATED_ROLES = new Set(['admin', 'gerente', 'jefe', 'super_admin']);
const CHAT_ROUTE_PATH = '/api/chat/messages';
const AI_GENERIC_FALLBACK_MESSAGE =
  'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.';
const AI_VALIDATION_FALLBACK_MESSAGE =
  'Puedo ayudarte con ISO 9001 y el uso del sistema, pero no pude validar una respuesta segura en este momento. Intenta reformular tu consulta.';
const ENABLE_UNIFIED_AI_CHAT_CORE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const SUPPORTED_DOC_MODULES = new Set<DocModule>([
  'mi-panel',
  'rrhh',
  'procesos',
  'documentos',
  'crm',
  'auditorias',
  'hallazgos',
  'acciones',
  'don-candido',
]);

type ChatAICapability = 'chat_general' | 'chat_tools' | 'chat_quality';

interface ChatAIExecutionResult {
  response: string;
  provider: string;
  model: string;
  capability: ChatAICapability;
  routerCapability?: string;
  mode?: AIMode;
  latencyMs?: number;
  fallbackUsed?: boolean;
  attempts?: LLMResponseMetadata['attempts'];
}

function trackAITelemetrySafe(
  event:
    | 'request_started'
    | 'request_succeeded'
    | 'request_failed'
    | 'fallback_used'
    | 'schema_validation_failed',
  payload: Parameters<typeof aiTelemetry.track>[1]
) {
  try {
    aiTelemetry.track(event, payload);
  } catch (telemetryError) {
    console.warn('[API /chat/messages] AI telemetry failed:', telemetryError);
  }
}

function mapChatCapabilityToLLMRouter(capability: ChatAICapability): {
  routerCapability: 'chat_general' | 'agent_ops';
  routerMode?: AIMode;
} {
  if (capability === 'chat_tools') {
    return { routerCapability: 'agent_ops', routerMode: 'fast' };
  }

  if (capability === 'chat_quality') {
    return { routerCapability: 'chat_general', routerMode: 'quality' };
  }

  return { routerCapability: 'chat_general', routerMode: 'fast' };
}

function sanitizeAndValidateAIOutput(
  content: string,
  capability: ChatAICapability
): {
  response: string;
  warnings: string[];
  validationFallbackUsed: boolean;
} {
  const validation = IAOutputValidator.validateOutput(content);
  const sanitized = validation.sanitizedContent?.trim() || '';
  const wordCount = sanitized
    ? sanitized.split(/\s+/).filter(Boolean).length
    : 0;
  const isShortConversationalReply =
    wordCount >= 2 &&
    wordCount < 5 &&
    sanitized.length >= 8 &&
    !validation.hallucinationDetected;

  const shouldEnforceFormat =
    capability === 'chat_general' || capability === 'chat_quality';
  const invalidFormat =
    shouldEnforceFormat &&
    !isShortConversationalReply &&
    !IAOutputValidator.validateResponseFormat(sanitized);

  if (validation.hallucinationDetected || invalidFormat) {
    return {
      response: AI_VALIDATION_FALLBACK_MESSAGE,
      warnings: [
        ...validation.warnings,
        ...(invalidFormat ? ['Formato de respuesta de IA invalido'] : []),
      ],
      validationFallbackUsed: true,
    };
  }

  return {
    response: sanitized,
    warnings: validation.warnings,
    validationFallbackUsed: false,
  };
}

async function getUserData(userId: string) {
  const db = getAdminFirestore();
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return null;
  }

  const data = userDoc.data();
  return {
    id: userDoc.id,
    organizationId: data?.organization_id,
    personnelId: data?.personnel_id,
  };
}

function canManageOtherUsers(role: string): boolean {
  return ELEVATED_ROLES.has(role);
}

function isUnifiedAIChatCoreEnabled(): boolean {
  return ENABLE_UNIFIED_AI_CHAT_CORE_VALUES.has(
    String(process.env.ENABLE_UNIFIED_AI_CHAT_CORE || '')
      .trim()
      .toLowerCase()
  );
}

function resolveDocModule(module?: string): DocModule | null {
  const normalizedModule = String(module || '')
    .trim()
    .toLocaleLowerCase('es') as DocModule;

  return SUPPORTED_DOC_MODULES.has(normalizedModule) ? normalizedModule : null;
}

async function resolveUserContext(
  auth: {
    uid: string;
    role: string;
    organizationId: string;
    user: { personnel_id: string | null };
  },
  requestedUserId?: string | null
) {
  const targetUserId = requestedUserId || auth.uid;

  if (targetUserId === auth.uid) {
    return {
      userId: auth.uid,
      organizationId: auth.organizationId,
      personnelId: auth.user.personnel_id,
    };
  }

  if (!canManageOtherUsers(auth.role)) {
    return null;
  }

  const targetUser = await getUserData(targetUserId);
  if (!targetUser || !targetUser.organizationId) {
    return null;
  }

  if (
    auth.role !== 'super_admin' &&
    targetUser.organizationId !== auth.organizationId
  ) {
    return null;
  }

  return {
    userId: targetUser.id,
    organizationId: targetUser.organizationId,
    personnelId: targetUser.personnelId,
  };
}

async function callLLMRouterChat(
  message: string,
  history: LLMRouterMessage[],
  systemPrompt: string,
  capability: ChatAICapability
): Promise<ChatAIExecutionResult> {
  const { routerCapability, routerMode } =
    mapChatCapabilityToLLMRouter(capability);

  try {
    const result = await LLMRouter.chat({
      message,
      history,
      systemPrompt,
      capability: routerCapability,
      mode: routerMode,
    });

    return {
      response: result.content,
      provider: result.metadata.provider,
      model: result.metadata.model,
      capability,
      routerCapability: result.metadata.capability,
      mode: (result.metadata.mode as AIMode | undefined) ?? routerMode,
      latencyMs: result.metadata.latencyMs,
      fallbackUsed: result.metadata.fallbackUsed,
      attempts: result.metadata.attempts,
    };
  } catch (error) {
    console.error('[API /chat/messages] Error calling LLMRouter:', error);

    return {
      response: AI_GENERIC_FALLBACK_MESSAGE,
      provider: 'fallback',
      model: 'fallback',
      capability,
      routerCapability,
      mode: routerMode,
      fallbackUsed: true,
    };
  }
}

async function executeGroqToolsChat(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  userCtx: { organizationId: string; userId: string }
): Promise<ChatAIExecutionResult> {
  const groqStart = Date.now();
  const { GroqService } = await import('@/lib/groq/GroqService');
  const { TOOLS: REGISTRY_TOOLS, GROQ_TOOLS } = await import(
    '@/features/chat/tools/registry'
  );

  const groqHistory: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    name?: string;
    tool_call_id?: string;
  }> = history.map(h => ({
    role: h.role as 'user' | 'assistant' | 'system',
    content: h.content,
  }));

  const toolContext = {
    organizationId: userCtx.organizationId,
    userId: userCtx.userId,
    userName: userCtx.userId,
  };

  let toolCallsExecuted = false;
  let currentResponse = await GroqService.enviarMensaje(
    message,
    groqHistory,
    systemPrompt,
    GROQ_TOOLS
  );

  let iterations = 0;
  while (
    currentResponse.tool_calls &&
    currentResponse.tool_calls.length > 0 &&
    iterations < 3
  ) {
    toolCallsExecuted = true;
    iterations++;
    groqHistory.push(currentResponse);

    for (const toolCall of currentResponse.tool_calls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);
      const toolDef = REGISTRY_TOOLS.find(t => t.name === toolName);

      let toolResult;
      if (toolDef) {
        try {
          toolResult = await toolDef.execute(toolArgs, toolContext);
        } catch (err: any) {
          toolResult = { error: err.message };
        }
      } else {
        toolResult = { error: `Tool ${toolName} not found` };
      }

      groqHistory.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: toolName,
        content: JSON.stringify(toolResult),
      });
    }

    currentResponse = await GroqService.enviarMensaje(
      '',
      groqHistory,
      systemPrompt,
      GROQ_TOOLS
    );
  }

  return {
    response: currentResponse.content || 'Accion completada.',
    provider: 'groq',
    model: 'groq-llama3',
    capability: toolCallsExecuted ? 'chat_tools' : 'chat_general',
    mode: 'fast',
    latencyMs: Date.now() - groqStart,
    fallbackUsed: false,
  };
}

export const POST = withAuth(
  async (request, _context, auth) => {
    const startTime = Date.now();

    try {
      const body = await request.json();
      const {
        userId: requestedUserId,
        sessionId,
        content,
        inputType = 'text',
        mode = 'fast' as AIMode,
        module,
        screen,
        organizationId: requestedOrganizationId,
      } = body;

      if (!sessionId || !content) {
        return NextResponse.json(
          {
            error: 'Missing required parameters',
            details: {
              sessionId: !sessionId ? 'required' : 'ok',
              content: !content ? 'required' : 'ok',
            },
          },
          { status: 400 }
        );
      }

      const userCtx = await resolveUserContext(auth, requestedUserId);
      if (!userCtx) {
        return NextResponse.json(
          { error: 'Sin permisos o usuario invalido' },
          { status: 403 }
        );
      }

      if (
        requestedOrganizationId &&
        requestedOrganizationId !== userCtx.organizationId
      ) {
        return NextResponse.json(
          { error: 'organizationId no coincide con el contexto autorizado' },
          { status: 403 }
        );
      }

      // OLA 2 compatibility mode: mirror to unified core only when core-first is disabled.
      if (!isUnifiedAIChatCoreEnabled()) {
        try {
          await ChatAdapter.process({
            userId: userCtx.userId,
            organizationId: userCtx.organizationId,
            role: auth.role,
            content: String(content),
            sessionId: String(sessionId),
            clientMessageId:
              typeof body.clientMessageId === 'string'
                ? body.clientMessageId
                : undefined,
            screen:
              typeof screen === 'string' && screen.trim() ? screen : '/chat',
            email: auth.email,
          });
        } catch (unifiedCoreError) {
          console.warn(
            '[API /chat/messages] Unified AI Core mirror failed (non-blocking):',
            unifiedCoreError
          );
        }
      }

      const session = await ChatService.getSession(
        sessionId,
        userCtx.organizationId
      );
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      const isOwner = session.userId === userCtx.userId;
      if (!isOwner && !canManageOtherUsers(auth.role)) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }

      const userMessage = await ChatService.addMessage(
        sessionId,
        userCtx.organizationId,
        'user',
        content,
        inputType
      );

      if (isUnifiedAIChatCoreEnabled()) {
        try {
          const coreResult = await ChatAdapter.process({
            userId: userCtx.userId,
            organizationId: userCtx.organizationId,
            role: auth.role,
            content: String(content),
            sessionId: String(sessionId),
            clientMessageId:
              typeof body.clientMessageId === 'string'
                ? body.clientMessageId
                : undefined,
            screen:
              typeof screen === 'string' && screen.trim() ? screen : '/chat',
            email: auth.email,
          });

          const assistantCore = coreResult.messages.find(
            m => m.role === 'assistant'
          );
          const assistantMessage = await ChatService.addMessage(
            sessionId,
            userCtx.organizationId,
            'assistant',
            assistantCore?.content || AI_GENERIC_FALLBACK_MESSAGE,
            'text',
            {
              provider: 'unified-ai-core',
              model: 'mvp-echo',
              capability: 'chat_tools',
              routerCapability: 'unified_ai_core',
              mode,
              latencyMs: Date.now() - startTime,
              fallbackUsed: false,
              traceId: coreResult.traceId,
              conversationId: coreResult.conversationId,
            }
          );

          if (
            session.messageCount === 0 ||
            session.title === 'Nueva conversacion'
          ) {
            await ChatService.generateTitle(
              sessionId,
              userCtx.organizationId,
              content
            );
          }

          return NextResponse.json({
            success: true,
            userMessage,
            assistantMessage,
            provider: 'unified-ai-core',
            capability: 'chat_tools',
            mode,
            latencyMs: Date.now() - startTime,
            unifiedCore: true,
            traceId: coreResult.traceId,
            conversationId: coreResult.conversationId,
          });
        } catch (coreError) {
          console.warn(
            '[API /chat/messages] Unified AI Core primary mode failed, fallback to legacy pipeline:',
            coreError
          );
        }
      }

      const recentMessages = await ChatService.getRecentMessages(
        sessionId,
        userCtx.organizationId,
        10
      );

      const history = recentMessages
        .filter(m => m.id !== userMessage.id)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const unifiedContext = await ContextService.getUnifiedContext(
        userCtx.organizationId,
        userCtx.userId
      );
      const legacyContext = ContextBuilder.toLegacyChatContext(unifiedContext);
      const docModule = resolveDocModule(module);
      const baseSystemPrompt = ContextService.generateSystemPrompt(
        legacyContext,
        module
      );
      const docsContext =
        (typeof screen === 'string' && screen.trim()
          ? getContextDocsForScreen(screen, auth.role)
          : '') || (docModule ? getDocSummariesForModule(docModule) : '');
      const systemPrompt = docsContext
        ? [
            baseSystemPrompt,
            '## Documentacion funcional relevante',
            docsContext,
            'Usa esta documentacion como referencia prioritaria para explicar pantallas, pasos y restricciones del sistema.',
          ].join('\n\n')
        : baseSystemPrompt;

      const requestId = `${sessionId}:${startTime}`;
      const requestedCapability: ChatAICapability =
        mode === 'fast' ? 'chat_tools' : 'chat_quality';

      trackAITelemetrySafe('request_started', {
        route: CHAT_ROUTE_PATH,
        org_id: userCtx.organizationId,
        user_id: userCtx.userId,
        capability: requestedCapability,
        request_id: requestId,
        metadata: {
          sessionId,
          module: module || null,
          mode,
        },
      });

      let aiResponse: ChatAIExecutionResult;
      if (mode === 'fast') {
        try {
          aiResponse = await executeGroqToolsChat(
            content,
            history,
            systemPrompt,
            {
              organizationId: userCtx.organizationId,
              userId: userCtx.userId,
            }
          );
        } catch (groqError) {
          console.error(
            '[API /chat/messages] Groq fast mode failed, fallback to quality:',
            groqError
          );
          trackAITelemetrySafe('fallback_used', {
            route: CHAT_ROUTE_PATH,
            org_id: userCtx.organizationId,
            user_id: userCtx.userId,
            capability: 'chat_tools',
            request_id: requestId,
            fallback_from: 'groq',
            fallback_to: 'llmrouter',
            fallback_reason:
              groqError instanceof Error
                ? groqError.message
                : 'groq_tools_error',
          });
          aiResponse = await callLLMRouterChat(
            content,
            history as LLMRouterMessage[],
            systemPrompt,
            'chat_quality'
          );
        }
      } else {
        aiResponse = await callLLMRouterChat(
          content,
          history as LLMRouterMessage[],
          systemPrompt,
          'chat_quality'
        );
      }

      const outputGuard = sanitizeAndValidateAIOutput(
        aiResponse.response,
        aiResponse.capability
      );

      if (outputGuard.warnings.length > 0) {
        trackAITelemetrySafe('schema_validation_failed', {
          route: CHAT_ROUTE_PATH,
          org_id: userCtx.organizationId,
          user_id: userCtx.userId,
          provider: aiResponse.provider,
          model: aiResponse.model,
          capability: aiResponse.capability,
          latency: aiResponse.latencyMs ?? Date.now() - startTime,
          request_id: requestId,
          schema_name: 'IAOutputValidator',
          schema_version: 'legacy-v1',
          metadata: {
            warnings: outputGuard.warnings,
            validationFallbackUsed: outputGuard.validationFallbackUsed,
          },
        });
      }

      aiResponse = {
        ...aiResponse,
        response: outputGuard.response,
        fallbackUsed: Boolean(
          aiResponse.fallbackUsed || outputGuard.validationFallbackUsed
        ),
      };

      if (aiResponse.fallbackUsed) {
        const firstFailedAttempt = aiResponse.attempts?.find(a => !a.success);
        trackAITelemetrySafe('fallback_used', {
          route: CHAT_ROUTE_PATH,
          org_id: userCtx.organizationId,
          user_id: userCtx.userId,
          provider: aiResponse.provider,
          model: aiResponse.model,
          capability: aiResponse.capability,
          latency: aiResponse.latencyMs ?? Date.now() - startTime,
          request_id: requestId,
          fallback_from: firstFailedAttempt?.provider || undefined,
          fallback_to: aiResponse.provider,
          fallback_reason: outputGuard.validationFallbackUsed
            ? 'response_validation_fallback'
            : 'router_or_provider_fallback',
        });
      }

      const assistantMessage = await ChatService.addMessage(
        sessionId,
        userCtx.organizationId,
        'assistant',
        aiResponse.response,
        'text',
        {
          provider: aiResponse.provider,
          model: aiResponse.model,
          capability: aiResponse.capability,
          routerCapability: aiResponse.routerCapability,
          mode: aiResponse.mode ?? mode,
          latencyMs: aiResponse.latencyMs ?? Date.now() - startTime,
          fallbackUsed: aiResponse.fallbackUsed,
        }
      );

      trackAITelemetrySafe('request_succeeded', {
        route: CHAT_ROUTE_PATH,
        org_id: userCtx.organizationId,
        user_id: userCtx.userId,
        provider: aiResponse.provider,
        model: aiResponse.model,
        capability: aiResponse.capability,
        latency: aiResponse.latencyMs ?? Date.now() - startTime,
        request_id: requestId,
        metadata: {
          mode,
          sessionId,
          routerCapability: aiResponse.routerCapability || null,
          warnings: outputGuard.warnings.length,
        },
      });

      if (
        session.messageCount === 0 ||
        session.title === 'Nueva conversacion'
      ) {
        await ChatService.generateTitle(
          sessionId,
          userCtx.organizationId,
          content
        );
      }

      return NextResponse.json({
        success: true,
        userMessage,
        assistantMessage,
        provider: aiResponse.provider,
        capability: aiResponse.capability,
        mode: aiResponse.mode ?? mode,
        latencyMs: aiResponse.latencyMs ?? Date.now() - startTime,
      });
    } catch (error) {
      console.error('[API /chat/messages] Error:', error);

      trackAITelemetrySafe('request_failed', {
        route: CHAT_ROUTE_PATH,
        org_id: auth.organizationId || null,
        user_id: auth.uid || null,
        capability: 'chat_general',
        latency: Date.now() - startTime,
        error_code: 'CHAT_MESSAGES_POST_ERROR',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error && error.message.includes('Access denied')) {
        return NextResponse.json(
          { error: 'Access denied to this session' },
          { status: 403 }
        );
      }

      if (
        error instanceof Error &&
        error.message.includes('FAILED_PRECONDITION')
      ) {
        return NextResponse.json(
          {
            error: 'La base de datos requiere un indice.',
            indexUrl:
              error.message.match(/https:\/\/[^\s]+/)?.[0] ||
              'Check logs for URL',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: 'Error processing message',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...CHAT_ROLES] }
);

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedUserId = searchParams.get('userId');
      const sessionId = searchParams.get('sessionId');
      const limit = parseInt(searchParams.get('limit') || '50');

      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required' },
          { status: 400 }
        );
      }

      const userCtx = await resolveUserContext(auth, requestedUserId);
      if (!userCtx) {
        return NextResponse.json(
          { error: 'Sin permisos o usuario invalido' },
          { status: 403 }
        );
      }

      const session = await ChatService.getSession(
        sessionId,
        userCtx.organizationId
      );
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      const isOwner = session.userId === userCtx.userId;
      if (!isOwner && !canManageOtherUsers(auth.role)) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }

      const messages = await ChatService.getMessages(
        sessionId,
        userCtx.organizationId,
        limit
      );

      return NextResponse.json({
        success: true,
        messages,
        total: messages.length,
      });
    } catch (error) {
      console.error('[API /chat/messages] Error:', error);
      return NextResponse.json(
        {
          error: 'Error fetching messages',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...CHAT_ROLES] }
);
