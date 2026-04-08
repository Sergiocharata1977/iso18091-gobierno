import {
  getLLMRouterConfig,
  mapModeToCapability,
} from '@/ai/config/llmRouting';
import type {
  LLMCapability,
  LLMExecutionAttempt,
  LLMMode,
  LLMProvider,
  LLMProviderRouteConfig,
  LLMResponseMetadata,
  LLMTokenUsage,
  LLMRouterChatResponse,
  LLMRouterMessage,
  LLMRouterRequest,
  LLMRouterStreamResponse,
} from '@/ai/types/LLMRouterTypes';
import { ClaudeService } from '@/lib/claude/client';
import type { ClaudeMessage } from '@/types/claude';
import { GroqService, type GroqMessage } from '@/lib/groq/GroqService';

interface ResolvedRouteContext {
  capability: LLMCapability;
  mode?: LLMMode;
  allowFallback: boolean;
  candidates: LLMProviderRouteConfig[];
}

interface ProviderExecutionResult {
  content: string;
  latencyMs: number;
  tokens?: LLMTokenUsage;
}

interface ProviderStreamExecutionResult {
  stream: ReadableStream;
  latencyMs: number;
}

export class LLMRouter {
  static async chat(request: LLMRouterRequest): Promise<LLMRouterChatResponse> {
    const route = this.resolveRoute(request);
    const attempts: LLMExecutionAttempt[] = [];
    let lastError: Error | null = null;

    for (const candidate of route.candidates) {
      const startTime = Date.now();

      try {
        const result = await this.executeChatWithProvider(candidate.provider, {
          message: request.message,
          history: request.history || [],
          systemPrompt: request.systemPrompt,
        });

        const latencyMs = Date.now() - startTime;
        attempts.push({
          provider: candidate.provider,
          model: candidate.model,
          capability: route.capability,
          mode: route.mode,
          success: true,
          latencyMs,
        });

        return {
          content: result.content,
          metadata: this.buildMetadata({
            provider: candidate.provider,
            model: candidate.model,
            capability: route.capability,
            mode: route.mode,
            latencyMs: result.latencyMs || latencyMs,
            tokens: result.tokens,
            attempts,
          }),
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        const normalizedError =
          error instanceof Error
            ? error
            : new Error('Unknown LLM provider error');
        lastError = normalizedError;

        attempts.push({
          provider: candidate.provider,
          model: candidate.model,
          capability: route.capability,
          mode: route.mode,
          success: false,
          latencyMs,
          error: normalizedError.message,
        });

        if (!route.allowFallback) {
          break;
        }
      }
    }

    throw this.buildRoutingError(route, attempts, lastError);
  }

  static async chatStream(
    request: LLMRouterRequest
  ): Promise<LLMRouterStreamResponse> {
    const route = this.resolveRoute(request);
    const attempts: LLMExecutionAttempt[] = [];
    let lastError: Error | null = null;

    for (const candidate of route.candidates) {
      const startTime = Date.now();

      try {
        const result = await this.executeChatStreamWithProvider(
          candidate.provider,
          {
            message: request.message,
            history: request.history || [],
            systemPrompt: request.systemPrompt,
          }
        );

        const latencyMs = Date.now() - startTime;
        attempts.push({
          provider: candidate.provider,
          model: candidate.model,
          capability: route.capability,
          mode: route.mode,
          success: true,
          latencyMs,
        });

        return {
          stream: result.stream,
          metadata: this.buildMetadata({
            provider: candidate.provider,
            model: candidate.model,
            capability: route.capability,
            mode: route.mode,
            latencyMs: result.latencyMs || latencyMs,
            attempts,
          }),
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        const normalizedError =
          error instanceof Error
            ? error
            : new Error('Unknown LLM provider error');
        lastError = normalizedError;

        attempts.push({
          provider: candidate.provider,
          model: candidate.model,
          capability: route.capability,
          mode: route.mode,
          success: false,
          latencyMs,
          error: normalizedError.message,
        });

        if (!route.allowFallback) {
          break;
        }
      }
    }

    throw this.buildRoutingError(route, attempts, lastError);
  }

  static resolveRoute(
    request: Pick<
      LLMRouterRequest,
      'capability' | 'mode' | 'allowFallback' | 'allowedProviderKeys'
    >
  ): ResolvedRouteContext {
    const config = getLLMRouterConfig();
    const mode = request.mode;
    const capability =
      request.capability || (mode ? mapModeToCapability(mode) : 'chat_general');
    const capabilityRoute = config.capabilities[capability];

    const orderedCandidates = this.prioritizeCandidatesByMode(
      [capabilityRoute.primary, ...capabilityRoute.fallbacks],
      mode
    );

    const candidates = orderedCandidates.filter(candidate => {
      if (!candidate.enabled) {
        return false;
      }
      if (!this.isProviderAvailable(candidate.provider)) {
        return false;
      }

      if (
        request.allowedProviderKeys &&
        request.allowedProviderKeys.length > 0
      ) {
        const providerKey = this.resolveProviderKey(
          candidate.provider,
          candidate.model
        );
        return Boolean(
          providerKey && request.allowedProviderKeys.includes(providerKey)
        );
      }

      return true;
    });

    if (candidates.length === 0) {
      throw new Error(
        request.allowedProviderKeys?.length
          ? `[LLMRouter] No hay proveedores permitidos para capability "${capability}" con allowedProviderKeys=[${request.allowedProviderKeys.join(', ')}]`
          : `[LLMRouter] No hay proveedores disponibles para capability "${capability}"`
      );
    }

    const allowFallback =
      request.allowFallback ?? config.defaults.fallbackEnabled;

    return {
      capability,
      mode,
      allowFallback,
      candidates: allowFallback ? candidates : [candidates[0]],
    };
  }

  static resolveProviderForMode(mode: LLMMode): {
    provider: LLMProvider;
    model: string;
    capability: LLMCapability;
  } {
    const route = this.resolveRoute({ mode, allowFallback: false });
    const primary = route.candidates[0];
    return {
      provider: primary.provider,
      model: primary.model,
      capability: route.capability,
    };
  }

  static getProviderInfo(input: {
    mode?: LLMMode;
    capability?: LLMCapability;
  }): {
    provider: LLMProvider;
    latency: string;
    cost: string;
    quality: string;
    model: string;
    capability: LLMCapability;
  } {
    const config = getLLMRouterConfig();
    const capability =
      input.capability ||
      (input.mode ? mapModeToCapability(input.mode) : 'chat_general');
    const capabilityRoute = config.capabilities[capability];
    const preferredCandidates = this.prioritizeCandidatesByMode(
      [capabilityRoute.primary, ...capabilityRoute.fallbacks],
      input.mode
    );
    const selected = preferredCandidates[0];
    const presentation = config.providers[selected.provider];

    return {
      provider: selected.provider,
      latency: presentation.latency,
      cost: presentation.cost,
      quality: presentation.quality,
      model: selected.model,
      capability,
    };
  }

  static isProviderAvailable(provider: LLMProvider): boolean {
    const config = getLLMRouterConfig();
    const providerConfig = config.providers[provider];
    const featureFlagValue = providerConfig.featureFlagEnv
      ? process.env[providerConfig.featureFlagEnv]
      : undefined;
    const featureEnabled = featureFlagValue
      ? !['0', 'false', 'off', 'no'].includes(featureFlagValue.toLowerCase())
      : true;

    if (!featureEnabled) {
      return false;
    }

    return Boolean(process.env[providerConfig.envKey]);
  }

  static getAvailableProviders(): LLMProvider[] {
    return (['groq', 'claude'] as const).filter(provider =>
      this.isProviderAvailable(provider)
    );
  }

  private static async executeChatWithProvider(
    provider: LLMProvider,
    payload: {
      message: string;
      history: LLMRouterMessage[];
      systemPrompt?: string;
    }
  ): Promise<ProviderExecutionResult> {
    const startTime = Date.now();

    if (provider === 'groq') {
      const groqHistory: GroqMessage[] = payload.history.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await GroqService.enviarMensaje(
        payload.message,
        groqHistory,
        payload.systemPrompt
      );

      return {
        content: response.content || '',
        latencyMs: Date.now() - startTime,
        tokens: response.usage,
      };
    }

    const claudeHistory = this.toClaudeHistory(
      payload.message,
      payload.history
    );
    const response = await ClaudeService.enviarMensaje(
      payload.systemPrompt || '',
      claudeHistory,
      2000
    );

    return {
      content: response.content,
      latencyMs: response.tiempo_respuesta_ms || Date.now() - startTime,
      tokens: {
        input: response.usage.input,
        output: response.usage.output,
        total: response.usage.input + response.usage.output,
      },
    };
  }

  private static async executeChatStreamWithProvider(
    provider: LLMProvider,
    payload: {
      message: string;
      history: LLMRouterMessage[];
      systemPrompt?: string;
    }
  ): Promise<ProviderStreamExecutionResult> {
    const startTime = Date.now();

    if (provider === 'groq') {
      const groqHistory: GroqMessage[] = payload.history.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const stream = await GroqService.enviarMensajeStream(
        payload.message,
        groqHistory,
        payload.systemPrompt
      );

      return {
        stream,
        latencyMs: Date.now() - startTime,
      };
    }

    const claudeHistory = this.toClaudeHistory(
      payload.message,
      payload.history
    );
    const response = await ClaudeService.enviarMensaje(
      payload.systemPrompt || '',
      claudeHistory,
      2000
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(response.content));
        controller.close();
      },
    });

    return {
      stream,
      latencyMs: response.tiempo_respuesta_ms || Date.now() - startTime,
    };
  }

  private static toClaudeHistory(
    currentMessage: string,
    history: LLMRouterMessage[]
  ): ClaudeMessage[] {
    let claudeHistory = history
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    if (claudeHistory.length === 0) {
      claudeHistory = [
        {
          role: 'user',
          content: currentMessage,
        },
      ];
    }

    return claudeHistory;
  }

  private static prioritizeCandidatesByMode(
    candidates: LLMProviderRouteConfig[],
    mode?: LLMMode
  ): LLMProviderRouteConfig[] {
    if (!mode) {
      return [...candidates];
    }

    const preferredProvider: LLMProvider =
      mode === 'quality' ? 'claude' : 'groq';
    const preferred = candidates.filter(c => c.provider === preferredProvider);
    const others = candidates.filter(c => c.provider !== preferredProvider);

    return [...preferred, ...others];
  }

  private static buildMetadata(input: {
    provider: LLMProvider;
    model: string;
    capability: LLMCapability;
    mode?: LLMMode;
    tokens?: LLMTokenUsage;
    latencyMs?: number;
    attempts: LLMExecutionAttempt[];
  }): LLMResponseMetadata {
    return {
      provider: input.provider,
      model: input.model,
      provider_key: this.resolveProviderKey(input.provider, input.model),
      capability: input.capability,
      mode: input.mode,
      tokens: input.tokens,
      latencyMs: input.latencyMs,
      fallbackUsed: input.attempts.filter(a => !a.success).length > 0,
      attempts: input.attempts,
    };
  }

  private static resolveProviderKey(
    provider: LLMProvider,
    model: string
  ): string | undefined {
    const normalizedModel = model.trim().toLowerCase();

    if (provider === 'groq') {
      if (normalizedModel.includes('70b')) {
        return 'groq_llama_70b';
      }

      if (normalizedModel.includes('8b')) {
        return 'groq_llama_8b';
      }
    }

    if (provider === 'claude') {
      if (normalizedModel.includes('haiku')) {
        return 'claude_haiku_4_5';
      }

      if (normalizedModel.includes('sonnet')) {
        return 'claude_sonnet_4_6';
      }
    }

    return undefined;
  }

  private static buildRoutingError(
    route: ResolvedRouteContext,
    attempts: LLMExecutionAttempt[],
    lastError: Error | null
  ): Error {
    const attemptsSummary = attempts
      .map(
        attempt =>
          `${attempt.provider}/${attempt.model}: ${attempt.success ? 'ok' : attempt.error || 'error'}`
      )
      .join(' | ');

    return new Error(
      `[LLMRouter] Falló routing capability=${route.capability}` +
        (route.mode ? ` mode=${route.mode}` : '') +
        (attemptsSummary ? ` attempts=[${attemptsSummary}]` : '') +
        (lastError ? ` last="${lastError.message}"` : '')
    );
  }
}

export type {
  LLMCapability,
  LLMMode,
  LLMProvider,
  LLMResponseMetadata,
  LLMRouterMessage,
  LLMRouterRequest,
  LLMRouterChatResponse,
  LLMRouterStreamResponse,
} from '@/ai/types/LLMRouterTypes';
