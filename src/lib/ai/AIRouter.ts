/**
 * Router de IA - Permite elegir entre diferentes proveedores de IA
 * segun el caso de uso (velocidad vs calidad)
 */

import {
  LLMRouter,
  type LLMResponseMetadata,
  type LLMRouterMessage,
} from '@/ai/services/LLMRouter';
import {
  IntentDetectionService,
  type DetectedIntent,
} from './IntentDetectionService';

export type AIProvider = 'groq' | 'claude';
export type AIMode = 'fast' | 'quality';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIAnalyticsEvent {
  timestamp: Date;
  provider: AIProvider;
  mode: AIMode;
  intent: string;
  responseTime: number;
  success: boolean;
  error?: string;
}

export class AIRouter {
  private static lastResponseMetadata: LLMResponseMetadata | null = null;

  /**
   * Determinar que proveedor usar segun el modo (compatibilidad legacy)
   */
  private static getProvider(mode: AIMode): AIProvider {
    if (mode === 'fast') {
      return 'groq';
    }

    if (mode === 'quality') {
      return 'claude';
    }

    return 'groq';
  }

  /**
   * Enviar mensaje con streaming
   */
  static async chatStream(
    mensaje: string,
    historial: AIMessage[] = [],
    systemPrompt?: string,
    mode: AIMode = 'fast'
  ): Promise<ReadableStream> {
    const result = await this.chatStreamWithMetadata(
      mensaje,
      historial,
      systemPrompt,
      mode
    );
    return result.stream;
  }

  /**
   * Enviar mensaje sin streaming (respuesta completa)
   */
  static async chat(
    mensaje: string,
    historial: AIMessage[] = [],
    systemPrompt?: string,
    mode: AIMode = 'fast'
  ): Promise<string> {
    const result = await this.chatWithMetadata(
      mensaje,
      historial,
      systemPrompt,
      mode
    );
    return result.content;
  }

  /**
   * Adaptador de compatibilidad con metadata de routing
   */
  static async chatWithMetadata(
    mensaje: string,
    historial: AIMessage[] = [],
    systemPrompt?: string,
    mode: AIMode = 'fast'
  ): Promise<{ content: string; metadata: LLMResponseMetadata }> {
    const result = await LLMRouter.chat({
      message: mensaje,
      history: historial as LLMRouterMessage[],
      systemPrompt,
      mode,
    });

    this.lastResponseMetadata = result.metadata;
    console.log(
      `[AIRouter] provider=${result.metadata.provider} mode=${mode} capability=${result.metadata.capability} latency=${result.metadata.latencyMs ?? 'n/a'}ms fallback=${result.metadata.fallbackUsed}`
    );

    return result;
  }

  /**
   * Adaptador de compatibilidad con metadata para streaming
   */
  static async chatStreamWithMetadata(
    mensaje: string,
    historial: AIMessage[] = [],
    systemPrompt?: string,
    mode: AIMode = 'fast'
  ): Promise<{ stream: ReadableStream; metadata: LLMResponseMetadata }> {
    const result = await LLMRouter.chatStream({
      message: mensaje,
      history: historial as LLMRouterMessage[],
      systemPrompt,
      mode,
    });

    this.lastResponseMetadata = result.metadata;
    console.log(
      `[AIRouter] provider=${result.metadata.provider} mode=${mode} capability=${result.metadata.capability} latency=${result.metadata.latencyMs ?? 'n/a'}ms fallback=${result.metadata.fallbackUsed} (stream)`
    );

    return result;
  }

  /**
   * Obtener informacion del proveedor actual
   */
  static getProviderInfo(mode: AIMode): {
    provider: AIProvider;
    latency: string;
    cost: string;
    quality: string;
  } {
    try {
      const info = LLMRouter.getProviderInfo({ mode });
      return {
        provider: info.provider,
        latency: info.latency,
        cost: info.cost,
        quality: info.quality,
      };
    } catch {
      const provider = this.getProvider(mode);
      if (provider === 'groq') {
        return {
          provider: 'groq',
          latency: '2-3 segundos',
          cost: 'Muy bajo',
          quality: 'Alta',
        };
      }

      return {
        provider: 'claude',
        latency: '20-30 segundos',
        cost: 'Alto',
        quality: 'Muy alta',
      };
    }
  }

  /**
   * Verificar si un proveedor esta disponible
   */
  static isProviderAvailable(provider: AIProvider): boolean {
    return LLMRouter.isProviderAvailable(provider);
  }

  /**
   * Obtener lista de proveedores disponibles
   */
  static getAvailableProviders(): AIProvider[] {
    return LLMRouter.getAvailableProviders();
  }

  /**
   * Chat inteligente con deteccion de intencion
   */
  static async smartChat(
    mensaje: string,
    historial: AIMessage[] = [],
    userContext?: any,
    mode: AIMode = 'fast'
  ): Promise<{ response: string; intent: DetectedIntent }> {
    const startTime = Date.now();

    try {
      const intent = IntentDetectionService.detectIntent(mensaje, userContext);
      const systemPrompt = IntentDetectionService.getSystemPromptForIntent(
        intent.type
      );
      const result = await this.chatWithMetadata(
        mensaje,
        historial,
        systemPrompt,
        mode
      );

      this.logAnalyticsEvent({
        timestamp: new Date(),
        provider: result.metadata.provider,
        mode,
        intent: intent.type,
        responseTime: Date.now() - startTime,
        success: true,
      });

      return { response: result.content, intent };
    } catch (error) {
      this.logAnalyticsEvent({
        timestamp: new Date(),
        provider: this.lastResponseMetadata?.provider || this.getProvider(mode),
        mode,
        intent: 'error',
        responseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Chat inteligente con streaming
   */
  static async smartChatStream(
    mensaje: string,
    historial: AIMessage[] = [],
    userContext?: any,
    mode: AIMode = 'fast'
  ): Promise<{ stream: ReadableStream; intent: DetectedIntent }> {
    const intent = IntentDetectionService.detectIntent(mensaje, userContext);
    const systemPrompt = IntentDetectionService.getSystemPromptForIntent(
      intent.type
    );
    const stream = await this.chatStream(
      mensaje,
      historial,
      systemPrompt,
      mode
    );

    return { stream, intent };
  }

  /**
   * Analizar contexto del usuario
   */
  static analyzeUserContext(userContext: any): {
    department?: string;
    role?: string;
    recentModules: string[];
    preferences: Record<string, any>;
  } {
    return {
      department: userContext?.department,
      role: userContext?.role,
      recentModules: userContext?.recentModules || [],
      preferences: userContext?.preferences || {},
    };
  }

  /**
   * Obtener recomendacion de proveedor basada en contexto
   */
  static recommendProvider(
    messageLength: number,
    complexity: 'simple' | 'medium' | 'complex'
  ): AIProvider {
    if (messageLength < 100 && complexity === 'simple') {
      return 'groq';
    }

    if (complexity === 'complex') {
      return 'claude';
    }

    return 'groq';
  }

  /**
   * Registrar evento de analytics
   */
  private static logAnalyticsEvent(event: AIAnalyticsEvent): void {
    console.log('[AIRouter Analytics]', {
      timestamp: event.timestamp.toISOString(),
      provider: event.provider,
      mode: event.mode,
      intent: event.intent,
      responseTime: `${event.responseTime}ms`,
      success: event.success,
      error: event.error,
    });
  }

  /**
   * Obtener estadisticas de uso
   */
  static getUsageStats(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    providerDistribution: Record<AIProvider, number>;
  } {
    return {
      totalRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      providerDistribution: { groq: 0, claude: 0 },
    };
  }

  static getLastResponseMetadata(): LLMResponseMetadata | null {
    return this.lastResponseMetadata;
  }
}

export type { AIAnalyticsEvent, AIMessage };
