// Types for Claude API integration

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage: {
    input: number;
    output: number;
  };
  tiempo_respuesta_ms: number;
}

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

// Pricing constants (per million tokens)
export const CLAUDE_PRICING = {
  INPUT_PER_MILLION: 3, // $3 per 1M tokens
  OUTPUT_PER_MILLION: 15, // $15 per 1M tokens
};

// Usage limits
export const CLAUDE_LIMITS = {
  CONSULTAS_POR_DIA: 50,
  TOKENS_POR_MES: 100000,
  COSTO_MAXIMO_MENSUAL: 10, // USD
  MAX_INPUT_LENGTH: 2000, // characters
};
