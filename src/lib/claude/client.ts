// Claude API Client

import { ClaudeConfig, ClaudeMessage, ClaudeResponse } from '@/types/claude';
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeService {
  private static client: Anthropic | null = null;
  private static config: ClaudeConfig | null = null;

  /**
   * Initialize Claude client with API key
   */
  private static initialize(): void {
    if (this.client) {
      return; // Already initialized
    }

    this.validateConfig();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });

    this.config = {
      apiKey: apiKey,
      model: this.getModel(),
      maxTokens: 2000,
    };

    console.log('[ClaudeService] Initialized with model:', this.config.model);
  }

  /**
   * Validate that required environment variables are set
   */
  static validateConfig(): void {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    if (!process.env.NEXT_PUBLIC_CLAUDE_MODEL) {
      throw new Error(
        'NEXT_PUBLIC_CLAUDE_MODEL environment variable is required'
      );
    }
  }

  /**
   * Get Claude model from environment
   */
  static getModel(): string {
    // Default to latest stable model if not set
    return process.env.NEXT_PUBLIC_CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
  }

  /**
   * Send message to Claude API
   * @param systemPrompt System prompt with context
   * @param messages Array of messages (conversation history)
   * @param maxTokens Maximum tokens for response
   * @returns Claude response with content and token usage
   */
  static async enviarMensaje(
    systemPrompt: string,
    messages: ClaudeMessage[],
    maxTokens: number = 2000
  ): Promise<ClaudeResponse> {
    this.initialize();

    if (!this.client) {
      throw new Error('Claude client not initialized');
    }

    const startTime = Date.now();

    try {
      console.log('[ClaudeService] Sending message to Claude...');
      console.log('[ClaudeService] System prompt length:', systemPrompt.length);
      console.log('[ClaudeService] Messages count:', messages.length);

      const response = await this.client.messages.create({
        model: this.getModel(),
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const tiempo_respuesta_ms = Date.now() - startTime;

      console.log(
        '[ClaudeService] Response received in',
        tiempo_respuesta_ms,
        'ms'
      );
      console.log('[ClaudeService] Tokens used:', response.usage);

      // Extract text content from response
      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => ('text' in block ? block.text : ''))
        .join('');

      return {
        content,
        usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
        tiempo_respuesta_ms,
      };
    } catch (error) {
      const tiempo_respuesta_ms = Date.now() - startTime;
      console.error('[ClaudeService] Error calling Claude API:', error);

      if (error instanceof Anthropic.APIError) {
        throw new Error(`Claude API Error: ${error.message}`);
      }

      throw new Error('Failed to get response from Claude');
    }
  }

  /**
   * Send message with retry logic
   * @param systemPrompt System prompt
   * @param messages Messages array
   * @param maxTokens Max tokens
   * @param retryCount Current retry attempt
   * @returns Claude response
   */
  static async enviarMensajeWithRetry(
    systemPrompt: string,
    messages: ClaudeMessage[],
    maxTokens: number = 2000,
    retryCount: number = 0
  ): Promise<ClaudeResponse> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    try {
      return await this.enviarMensaje(systemPrompt, messages, maxTokens);
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        console.log(
          `[ClaudeService] Retry attempt ${retryCount + 1}/${MAX_RETRIES}`
        );
        await this.delay(RETRY_DELAY_MS * (retryCount + 1));
        return this.enviarMensajeWithRetry(
          systemPrompt,
          messages,
          maxTokens,
          retryCount + 1
        );
      }
      throw error;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
