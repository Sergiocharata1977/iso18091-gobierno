import type {
  AITelemetrySerializedEvent,
  AITelemetrySink,
} from '@/ai/telemetry/types';

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export function isAITelemetryEnabled(): boolean {
  return envFlag('AI_TELEMETRY_ENABLED', true);
}

export function isAITelemetryDebugEnabled(): boolean {
  return envFlag('AI_TELEMETRY_DEBUG', false);
}

function getConsoleMethod(eventName: string): 'info' | 'warn' | 'error' {
  if (
    eventName === 'request_failed' ||
    eventName === 'schema_validation_failed'
  ) {
    return 'error';
  }

  if (eventName === 'fallback_used') {
    return 'warn';
  }

  return 'info';
}

export class ConsoleAITelemetrySink implements AITelemetrySink {
  emit(event: AITelemetrySerializedEvent): void {
    if (!isAITelemetryEnabled()) {
      return;
    }

    const method = getConsoleMethod(event.event);
    const payload = isAITelemetryDebugEnabled()
      ? event
      : { ...event, debug: undefined };

    console[method]('[AI Telemetry]', payload);
  }
}

export const consoleAITelemetrySink = new ConsoleAITelemetrySink();
