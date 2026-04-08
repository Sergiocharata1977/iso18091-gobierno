import { consoleAITelemetrySink } from '@/lib/logger/aiTelemetryLogger';

import { serializeAITelemetryEvent } from './serialize';
import type {
  AITelemetryEventInput,
  AITelemetryEventName,
  AITelemetrySerializedEvent,
  AITelemetrySink,
  CreateAITelemetryOptions,
} from './types';
import { AI_TELEMETRY_EVENTS } from './types';

export type {
  AITelemetryContext,
  AITelemetryEventInput,
  AITelemetryEventName,
  AITelemetrySerializedEvent,
  AITelemetrySink,
  CreateAITelemetryOptions,
} from './types';
export { AI_TELEMETRY_EVENTS } from './types';
export {
  redactString,
  sanitizeTelemetryObject,
  sanitizeTelemetryValue,
} from './sanitize';
export { serializeAITelemetryEvent } from './serialize';

export interface AITelemetryClient {
  track: (
    event: AITelemetryEventName,
    payload: AITelemetryEventInput
  ) => AITelemetrySerializedEvent;
  requestStarted: (
    payload: AITelemetryEventInput
  ) => AITelemetrySerializedEvent;
  requestSucceeded: (
    payload: AITelemetryEventInput
  ) => AITelemetrySerializedEvent;
  requestFailed: (payload: AITelemetryEventInput) => AITelemetrySerializedEvent;
  fallbackUsed: (payload: AITelemetryEventInput) => AITelemetrySerializedEvent;
  schemaValidationFailed: (
    payload: AITelemetryEventInput
  ) => AITelemetrySerializedEvent;
}

function normalizeEventPayload(
  event: AITelemetryEventName,
  payload: AITelemetryEventInput
): AITelemetryEventInput {
  if (event === 'request_started') {
    return { ...payload, success: null };
  }

  if (event === 'request_succeeded') {
    return { ...payload, success: true };
  }

  if (event === 'request_failed') {
    return { ...payload, success: false };
  }

  return payload.success === undefined
    ? { ...payload, success: null }
    : payload;
}

export function createAITelemetry(
  options: CreateAITelemetryOptions = {}
): AITelemetryClient {
  const sink: AITelemetrySink = options.sink ?? consoleAITelemetrySink;

  const track = (
    event: AITelemetryEventName,
    payload: AITelemetryEventInput
  ): AITelemetrySerializedEvent => {
    const serialized = serializeAITelemetryEvent(
      event,
      normalizeEventPayload(event, payload),
      {
        includeDebugPayloads: options.includeDebugPayloads ?? false,
      }
    );

    sink.emit(serialized);
    return serialized;
  };

  return {
    track,
    requestStarted: payload => track('request_started', payload),
    requestSucceeded: payload => track('request_succeeded', payload),
    requestFailed: payload => track('request_failed', payload),
    fallbackUsed: payload => track('fallback_used', payload),
    schemaValidationFailed: payload =>
      track('schema_validation_failed', payload),
  };
}

export const aiTelemetry = createAITelemetry();

export function isAITelemetryEvent(
  value: string
): value is AITelemetryEventName {
  return (AI_TELEMETRY_EVENTS as readonly string[]).includes(value);
}
