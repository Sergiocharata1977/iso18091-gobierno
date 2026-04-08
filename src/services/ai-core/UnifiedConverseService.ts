import { ContextBuilder } from '@/ai/services/ContextBuilder';
import { LLMRouter, type LLMRouterMessage } from '@/ai/services/LLMRouter';
import type { LLMResponseMetadata } from '@/ai/types/LLMRouterTypes';
import { ContextService } from '@/features/chat/services/ContextService';
import { AIPricingService } from '@/services/ai-core/AIPricingService';
import { AIConversationStore } from '@/services/ai-core/conversationStore';
import { UsageTrackingService } from '@/services/tracking/UsageTrackingService';
import {
  detectVoiceIntent,
  type VoiceIntentResult,
} from '@/services/ai-core/voiceIntentDetector';
import type { AIChannel, AIMessage, UICommand } from '@/types/ai-core';

interface UnifiedConverseInput {
  channel: AIChannel;
  message: string;
  sessionId?: string;
  organizationId: string;
  userId: string;
  userRole: string;
  pathname?: string;
  edition?: string;
  departmentContext?: {
    departmentId?: string;
    departmentName?: string;
    jobTitle?: string;
  };
  dashboardData?: Record<string, unknown>;
  hseData?: HseContextData;
}

export interface UnifiedConverseResult {
  reply: string;
  sessionId: string;
  tokensUsed: number;
  metadata: LLMResponseMetadata;
  traceId: string;
  messages: [AIMessage, AIMessage];
  voiceIntent?: VoiceIntentResult;
  uiCommands?: UICommand[];
}

export class AIBudgetExceededError extends Error {
  code = 'AI_BUDGET_EXCEEDED';
  planId?: string;

  constructor(message: string, planId?: string) {
    super(message);
    this.name = 'AIBudgetExceededError';
    this.planId = planId;
  }
}

function estimateTokensUsed(parts: string[]): number {
  const chars = parts.join(' ').trim().length;
  if (chars === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(chars / 4));
}

function getTotalTokensFromMetadata(metadata?: LLMResponseMetadata): number {
  return metadata?.tokens?.total ?? 0;
}

function buildBudgetWarning(planId: string, remainingUsd: number): string {
  if (!Number.isFinite(remainingUsd)) {
    return `Aviso de consumo IA: el plan ${planId} esta cerca de su limite.`;
  }

  return `Aviso de consumo IA: el plan ${planId} esta cerca de su limite. Restante estimado: USD ${remainingUsd.toFixed(2)}.`;
}

function buildPromptWithDocs(basePrompt: string, docsContext: string): string {
  if (!docsContext) {
    return basePrompt;
  }

  return [
    basePrompt,
    '## Manual del sistema — contexto de la pantalla actual',
    docsContext,
    [
      'INSTRUCCIONES SOBRE EL MANUAL:',
      '- El usuario esta en la pantalla indicada arriba. Ese manual describe exactamente lo que puede hacer ahi.',
      '- Si el usuario pregunta "que hago aqui", "como funciona esto", "como creo/edito/elimino X", usa los pasos del manual para dar una guia concreta.',
      '- Si el manual tiene pasos numerados, presentalos como lista paso a paso.',
      '- Si el usuario hace una pregunta general sobre el modulo, usa el campo "Para que sirve" del manual como punto de partida.',
      '- Cita la seccion del manual si es util para orientar al usuario dentro de la pantalla.',
    ].join('\n'),
  ].join('\n\n');
}

function buildPromptWithDepartmentContext(
  basePrompt: string,
  departmentContext?: UnifiedConverseInput['departmentContext']
): string {
  if (!departmentContext?.departmentName && !departmentContext?.jobTitle) {
    return basePrompt;
  }

  const subject = departmentContext.jobTitle
    ? `El usuario es ${departmentContext.jobTitle}`
    : 'El usuario';
  const departmentSuffix = departmentContext.departmentName
    ? ` del departamento ${departmentContext.departmentName}`
    : '';

  return [
    basePrompt,
    '## Contexto departamental del usuario',
    `${subject}${departmentSuffix}.`,
    'Sus consultas probablemente se relacionan con los procesos e indicadores de ese departamento.',
  ].join('\n\n');
}

function buildGovContextSuffix(orgName?: string): string {
  const entidad = orgName ? ` (${orgName})` : '';
  return [
    `## Contexto de edición gubernamental${entidad}`,
    'Esta organización es un municipio o gobierno local que opera bajo ISO 18091.',
    'Los ciudadanos son los usuarios del sistema (no "clientes").',
    'Los expedientes son los trámites administrativos (no "oportunidades").',
    'Las áreas son secretarías municipales (no "departamentos de empresa").',
    'Ayuda al usuario a gestionar y mejorar los procesos municipales según ISO 18091.',
  ].join('\n');
}

function buildPromptWithGovContext(
  basePrompt: string,
  edition?: string,
  orgName?: string
): string {
  if (edition !== 'government') {
    return basePrompt;
  }

  return [basePrompt, buildGovContextSuffix(orgName)].join('\n\n');
}

function buildPromptWithVoiceIntentContext(
  basePrompt: string,
  voiceIntent?: VoiceIntentResult
): string {
  if (!voiceIntent || voiceIntent.confidence >= 0.8) {
    return basePrompt;
  }

  const details =
    voiceIntent.intent.type === 'navigate'
      ? `Intento sugerido: navegar a "${voiceIntent.intent.label}" (${voiceIntent.intent.route}).`
      : voiceIntent.intent.type === 'query'
        ? `Intento sugerido: consulta "${voiceIntent.intent.skill_id}" con parametros ${JSON.stringify(voiceIntent.intent.params)}.`
        : voiceIntent.intent.type === 'fill_form'
          ? `Intento sugerido: completar formulario "${voiceIntent.intent.form_id}".`
          : 'Intento sugerido: consulta general.';

  return [
    basePrompt,
    '## Pre-analisis del canal de voz',
    `Confianza del detector: ${voiceIntent.confidence.toFixed(2)}.`,
    details,
    `Respuesta preliminar sugerida: ${voiceIntent.response_text}`,
    'Usa esta senal como contexto, pero resuelve la intencion final segun el mensaje del usuario.',
  ].join('\n\n');
}

interface HseContextData {
  incidentes_abiertos: number;
  incidentes_en_investigacion: number;
  epp_vencidos: number;
  epp_por_vencer: number;
  aspectos_significativos: number;
  requisitos_no_conformes: number;
}

function buildPromptWithHseContext(
  basePrompt: string,
  hseData?: HseContextData
): string {
  if (!hseData) {
    return basePrompt;
  }

  const alertLines: string[] = [];

  if (hseData.incidentes_abiertos > 0) {
    alertLines.push(
      `- **${hseData.incidentes_abiertos} incidente(s) SST abierto(s)** pendientes de investigacion o cierre.`
    );
  }
  if (hseData.incidentes_en_investigacion > 0) {
    alertLines.push(
      `- **${hseData.incidentes_en_investigacion} incidente(s) en investigacion** activa de causa raiz.`
    );
  }
  if (hseData.epp_vencidos > 0) {
    alertLines.push(
      `- **${hseData.epp_vencidos} EPP vencido(s)**: requieren renovacion urgente.`
    );
  }
  if (hseData.epp_por_vencer > 0) {
    alertLines.push(
      `- **${hseData.epp_por_vencer} EPP proximo(s) a vencer** en los proximos 30 dias.`
    );
  }
  if (hseData.aspectos_significativos > 0) {
    alertLines.push(
      `- **${hseData.aspectos_significativos} aspecto(s) ambiental(es) significativo(s)** identificados con control activo.`
    );
  }
  if (hseData.requisitos_no_conformes > 0) {
    alertLines.push(
      `- **${hseData.requisitos_no_conformes} requisito(s) legal(es) no conforme(s)** en el registro ambiental/SST.`
    );
  }

  if (alertLines.length === 0) {
    return basePrompt;
  }

  return [
    basePrompt,
    '## Contexto HSE activo (Pack ISO 14001 + ISO 45001)',
    'La organizacion tiene el Pack HSE habilitado. Estado actual:',
    alertLines.join('\n'),
    'Si el usuario pregunta sobre seguridad, incidentes, EPP o medio ambiente, considera estos datos activos para dar respuestas contextualizadas y priorizadas.',
  ].join('\n\n');
}

function buildRuleBasedMetadata(): LLMResponseMetadata {
  return {
    provider: 'claude',
    model: 'rule-based-voice-intent',
    capability: 'chat_general',
    mode: 'fast',
    fallbackUsed: false,
    attempts: [
      {
        provider: 'claude',
        model: 'rule-based-voice-intent',
        capability: 'chat_general',
        mode: 'fast',
        success: true,
        latencyMs: 0,
      },
    ],
    latencyMs: 0,
  };
}

function buildVoiceUiCommands(voiceIntent?: VoiceIntentResult): UICommand[] {
  if (voiceIntent?.intent.type !== 'navigate') {
    return [];
  }

  return [
    {
      type: 'NAVIGATE',
      payload: {
        path: voiceIntent.intent.route,
        label: voiceIntent.intent.label,
      },
    },
  ];
}

export class UnifiedConverseService {
  static async converse(
    input: UnifiedConverseInput
  ): Promise<UnifiedConverseResult> {
    const conversation = await AIConversationStore.getOrCreateConversation({
      userId: input.userId,
      organizationId: input.organizationId,
      channel: input.channel,
      sessionId: input.sessionId,
    });

    const history = await AIConversationStore.getHistory(conversation.id, 20);
    const voiceIntent =
      input.channel === 'voice'
        ? await detectVoiceIntent(input.message, {
            orgId: input.organizationId,
            userId: input.userId,
            currentRoute: input.pathname || '/',
            dashboardData: input.dashboardData,
          })
        : undefined;
    const systemPrompt = await this.buildSystemPrompt({
      organizationId: input.organizationId,
      userId: input.userId,
      pathname: input.pathname,
      userRole: input.userRole,
      edition: input.edition,
      departmentContext: input.departmentContext,
      voiceIntent,
      hseData: input.hseData,
    });
    const effectivePlan = await AIPricingService.getOrgPlan(input.organizationId);
    const budgetStatus = await AIPricingService.checkBudget(input.organizationId);

    if (!budgetStatus.allowed) {
      throw new AIBudgetExceededError(
        `Limite mensual de IA alcanzado para el plan ${budgetStatus.plan_id}`,
        budgetStatus.plan_id
      );
    }

    const traceId = crypto.randomUUID();
    const createdAt = new Date();

    const userMessage = await AIConversationStore.appendMessage({
      conversationId: conversation.id,
      role: 'user',
      channel: input.channel,
      content: input.message,
      traceId,
      timestamp: createdAt,
      userId: input.userId,
      organizationId: input.organizationId,
    });

    if (voiceIntent && voiceIntent.confidence > 0.8) {
      const metadata = buildRuleBasedMetadata();
      const assistantMessage = await AIConversationStore.appendMessage({
        conversationId: conversation.id,
        role: 'assistant',
        channel: input.channel,
        content: voiceIntent.response_text,
        traceId,
        timestamp: new Date(),
        userId: input.userId,
        organizationId: input.organizationId,
      });

      return {
        reply: voiceIntent.response_text,
        sessionId: conversation.id,
        tokensUsed: estimateTokensUsed([
          systemPrompt,
          ...history.map(message => message.content),
          input.message,
          voiceIntent.response_text,
        ]),
        metadata,
        traceId,
        messages: [userMessage, assistantMessage],
        voiceIntent,
        uiCommands: buildVoiceUiCommands(voiceIntent),
      };
    }

    const llmResponse = await LLMRouter.chat({
      message: input.message,
      history: history.map(message => ({
        role: message.role,
        content: message.content,
      })) as LLMRouterMessage[],
      systemPrompt,
      capability: 'chat_general',
      mode: 'fast',
      allowedProviderKeys: effectivePlan.allowed_provider_keys,
    });

    const warningSuffix = budgetStatus.warning
      ? `\n\n${buildBudgetWarning(
          budgetStatus.plan_id,
          budgetStatus.remaining_usd
        )}`
      : '';
    const replyContent = llmResponse.content + warningSuffix;

    const assistantMessage = await AIConversationStore.appendMessage({
      conversationId: conversation.id,
      role: 'assistant',
      channel: input.channel,
      content: replyContent,
      traceId,
      timestamp: new Date(),
      userId: input.userId,
      organizationId: input.organizationId,
    });

    await this.trackUsage({
      input,
      conversationId: conversation.id,
      metadata: llmResponse.metadata,
    });

    return {
      reply: replyContent,
      sessionId: conversation.id,
      tokensUsed:
        getTotalTokensFromMetadata(llmResponse.metadata) ||
        estimateTokensUsed([
          systemPrompt,
          ...history.map(message => message.content),
          input.message,
          replyContent,
        ]),
      metadata: llmResponse.metadata,
      traceId,
      messages: [userMessage, assistantMessage],
      voiceIntent,
      uiCommands: buildVoiceUiCommands(voiceIntent),
    };
  }

  private static async buildSystemPrompt(input: {
    organizationId: string;
    userId: string;
    pathname?: string;
    userRole: string;
    edition?: string;
    departmentContext?: UnifiedConverseInput['departmentContext'];
    voiceIntent?: VoiceIntentResult;
    hseData?: HseContextData;
  }): Promise<string> {
    let unifiedContext;

    try {
      unifiedContext = await ContextService.getUnifiedContext(
        input.organizationId,
        input.userId
      );
    } catch (error) {
      console.warn(
        '[UnifiedConverseService] Falling back to organization-scoped context:',
        error
      );
      unifiedContext = await ContextService.getExternalChannelContext({
        organizationId: input.organizationId,
        externalUserId: input.userId,
        displayName: 'Cliente de WhatsApp',
        role: input.userRole,
      });
    }

    const legacyContext = ContextBuilder.toLegacyChatContext(unifiedContext);
    const basePrompt = ContextService.generateSystemPrompt(legacyContext);
    const promptWithDepartmentContext = buildPromptWithDepartmentContext(
      basePrompt,
      input.departmentContext
    );
    const docsContext = ContextBuilder.buildDocumentationContext(
      input.pathname,
      input.userRole
    );
    const promptWithDocs = buildPromptWithDocs(
      promptWithDepartmentContext,
      docsContext
    );

    const promptWithGovContext = buildPromptWithGovContext(
      promptWithDocs,
      input.edition,
      unifiedContext.org?.name
    );

    const promptWithHseContext = buildPromptWithHseContext(
      promptWithGovContext,
      input.hseData
    );

    return buildPromptWithVoiceIntentContext(
      promptWithHseContext,
      input.voiceIntent
    );
  }

  private static async trackUsage(input: {
    input: UnifiedConverseInput;
    conversationId: string;
    metadata: LLMResponseMetadata;
  }): Promise<void> {
    const tokensInput = input.metadata.tokens?.input ?? 0;
    const tokensOutput = input.metadata.tokens?.output ?? 0;
    const providerKey = input.metadata.provider_key;

    if (!providerKey || (tokensInput === 0 && tokensOutput === 0)) {
      return;
    }

    await UsageTrackingService.registrar({
      userId: input.input.userId,
      organizationId: input.input.organizationId,
      sessionId: input.conversationId,
      tipoOperacion: 'chat',
      provider: input.metadata.provider,
      model: input.metadata.model,
      providerKey,
      tokens: {
        input: tokensInput,
        output: tokensOutput,
      },
      metadata: {
        channel: input.input.channel,
        pathname: input.input.pathname,
        capability: input.metadata.capability,
        mode: input.metadata.mode,
        fallbackUsed: input.metadata.fallbackUsed,
        attempts: input.metadata.attempts.length,
        tiempo_respuesta_ms: input.metadata.latencyMs,
      },
    });
  }
}
