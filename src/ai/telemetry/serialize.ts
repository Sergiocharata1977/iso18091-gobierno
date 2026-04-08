import {
  type AITelemetryEventInput,
  type AITelemetryEventName,
  type AITelemetrySerializedEvent,
} from './types';
import { redactString, sanitizeTelemetryObject } from './sanitize';

function toIsoTimestamp(value?: string | number | Date): string {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function sanitizeLatency(latency?: number | null): number | null {
  if (typeof latency !== 'number' || !Number.isFinite(latency) || latency < 0) {
    return null;
  }

  return Math.round(latency);
}

export function serializeAITelemetryEvent(
  event: AITelemetryEventName,
  payload: AITelemetryEventInput,
  options?: { includeDebugPayloads?: boolean }
): AITelemetrySerializedEvent {
  const serialized: AITelemetrySerializedEvent = {
    event,
    timestamp: toIsoTimestamp(payload.timestamp),
    route: payload.route,
    org_id: payload.org_id ?? null,
    user_id: payload.user_id ?? null,
    provider: payload.provider ?? null,
    model: payload.model ?? null,
    capability: payload.capability ?? null,
    latency: sanitizeLatency(payload.latency),
    success: payload.success ?? null,
  };

  if (payload.request_id) {
    serialized.request_id = redactString(payload.request_id, {
      maxStringLength: 100,
    });
  }

  if (payload.error_code) {
    serialized.error_code = redactString(payload.error_code, {
      maxStringLength: 80,
    });
  }

  if (payload.error_message) {
    serialized.error_message = redactString(payload.error_message, {
      maxStringLength: 200,
    });
  }

  if (payload.schema_name) {
    serialized.schema_name = redactString(payload.schema_name, {
      maxStringLength: 100,
    });
  }

  if (payload.schema_version) {
    serialized.schema_version = redactString(payload.schema_version, {
      maxStringLength: 50,
    });
  }

  if (payload.fallback_from) {
    serialized.fallback_from = redactString(payload.fallback_from, {
      maxStringLength: 80,
    });
  }

  if (payload.fallback_to) {
    serialized.fallback_to = redactString(payload.fallback_to, {
      maxStringLength: 80,
    });
  }

  if (payload.fallback_reason) {
    serialized.fallback_reason = redactString(payload.fallback_reason, {
      maxStringLength: 200,
    });
  }

  const sanitizedMetadata = sanitizeTelemetryObject(payload.metadata);
  if (sanitizedMetadata) {
    serialized.metadata = sanitizedMetadata;
  }

  if (options?.includeDebugPayloads) {
    const sanitizedDebug = sanitizeTelemetryObject(payload.debug);
    if (sanitizedDebug) {
      serialized.debug = sanitizedDebug;
    }
  }

  return serialized;
}
