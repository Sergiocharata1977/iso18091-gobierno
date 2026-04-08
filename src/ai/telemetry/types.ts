export const AI_TELEMETRY_EVENTS = [
  'request_started',
  'request_succeeded',
  'request_failed',
  'fallback_used',
  'schema_validation_failed',
] as const;

export type AITelemetryEventName = (typeof AI_TELEMETRY_EVENTS)[number];

export interface AITelemetryContext {
  route: string;
  org_id?: string | null;
  user_id?: string | null;
  provider?: string | null;
  model?: string | null;
  capability?: string | null;
  latency?: number | null;
  success?: boolean | null;
}

export interface AITelemetryEventInput extends AITelemetryContext {
  timestamp?: string | number | Date;
  request_id?: string;
  error_code?: string;
  error_message?: string;
  schema_name?: string;
  schema_version?: string;
  fallback_from?: string;
  fallback_to?: string;
  fallback_reason?: string;
  debug?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AITelemetrySerializedEvent extends AITelemetryContext {
  event: AITelemetryEventName;
  timestamp: string;
  route: string;
  org_id: string | null;
  user_id: string | null;
  provider: string | null;
  model: string | null;
  capability: string | null;
  latency: number | null;
  success: boolean | null;
  request_id?: string;
  error_code?: string;
  error_message?: string;
  schema_name?: string;
  schema_version?: string;
  fallback_from?: string;
  fallback_to?: string;
  fallback_reason?: string;
  metadata?: Record<string, unknown>;
  debug?: Record<string, unknown>;
}

export interface AITelemetrySink {
  emit(event: AITelemetrySerializedEvent): void;
}

export interface CreateAITelemetryOptions {
  sink?: AITelemetrySink;
  includeDebugPayloads?: boolean;
}
