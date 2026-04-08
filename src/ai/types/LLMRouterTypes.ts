export type LLMProvider = 'groq' | 'claude';

export type LLMCapability =
  | 'chat_general'
  | 'audit_eval'
  | 'doc_gen'
  | 'agent_ops';

export type LLMMode = 'fast' | 'quality';

export interface LLMRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProviderRouteConfig {
  provider: LLMProvider;
  model: string;
  enabled: boolean;
}

export interface LLMCapabilityRouteConfig {
  capability: LLMCapability;
  primary: LLMProviderRouteConfig;
  fallbacks: LLMProviderRouteConfig[];
}

export interface LLMProviderPresentationInfo {
  latency: string;
  cost: string;
  quality: string;
}

export interface LLMProviderRuntimeInfo extends LLMProviderPresentationInfo {
  provider: LLMProvider;
  envKey: string;
  featureFlagEnv?: string;
}

export interface LLMRouterConfig {
  capabilities: Record<LLMCapability, LLMCapabilityRouteConfig>;
  providers: Record<LLMProvider, LLMProviderRuntimeInfo>;
  defaults: {
    modeToCapability: Record<LLMMode, LLMCapability>;
    fallbackEnabled: boolean;
  };
}

export interface LLMRouterRequest {
  message: string;
  history?: LLMRouterMessage[];
  systemPrompt?: string;
  capability?: LLMCapability;
  mode?: LLMMode;
  allowFallback?: boolean;
  allowedProviderKeys?: string[];
}

export interface LLMExecutionAttempt {
  provider: LLMProvider;
  model: string;
  capability: LLMCapability;
  mode?: LLMMode;
  success: boolean;
  latencyMs: number;
  error?: string;
}

export interface LLMTokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface LLMResponseMetadata {
  provider: LLMProvider;
  model: string;
  provider_key?: string;
  capability: LLMCapability;
  mode?: LLMMode;
  tokens?: LLMTokenUsage;
  latencyMs?: number;
  fallbackUsed: boolean;
  attempts: LLMExecutionAttempt[];
}

export interface LLMRouterChatResponse {
  content: string;
  metadata: LLMResponseMetadata;
}

export interface LLMRouterStreamResponse {
  stream: ReadableStream;
  metadata: LLMResponseMetadata;
}
