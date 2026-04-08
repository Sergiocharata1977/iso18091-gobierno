import { createAITelemetry, serializeAITelemetryEvent } from '@/ai/telemetry';

describe('AI telemetry serialization', () => {
  it('builds a standard payload with required fields and sanitized metadata', () => {
    const event = serializeAITelemetryEvent('request_succeeded', {
      timestamp: '2026-02-23T12:00:00.000Z',
      route: '/api/ai/suggest',
      org_id: 'org_1',
      user_id: 'user_9',
      provider: 'groq',
      model: 'llama-3.3',
      capability: 'suggestion_generation',
      latency: 143.6,
      success: true,
      metadata: {
        prompt: 'No debe salir',
        tokenCount: 123,
      },
      debug: {
        response: 'No debe salir por defecto',
      },
    });

    expect(event).toEqual({
      event: 'request_succeeded',
      timestamp: '2026-02-23T12:00:00.000Z',
      route: '/api/ai/suggest',
      org_id: 'org_1',
      user_id: 'user_9',
      provider: 'groq',
      model: 'llama-3.3',
      capability: 'suggestion_generation',
      latency: 144,
      success: true,
      metadata: {
        prompt: expect.stringMatching(/^\[redacted-text:\d+\]$/),
        tokenCount: 123,
      },
    });
  });

  it('omits debug payload unless enabled and normalizes success by event method', () => {
    const captured: unknown[] = [];
    const telemetry = createAITelemetry({
      includeDebugPayloads: false,
      sink: {
        emit(event) {
          captured.push(event);
        },
      },
    });

    const started = telemetry.requestStarted({
      route: '/api/ai/chat',
      debug: { prompt: 'secret prompt' },
    });
    const failed = telemetry.requestFailed({
      route: '/api/ai/chat',
      error_message: 'Provider timeout',
      debug: { response: 'partial raw output' },
    });

    expect(started.success).toBeNull();
    expect(started.debug).toBeUndefined();
    expect(failed.success).toBe(false);
    expect(failed.debug).toBeUndefined();
    expect(captured).toHaveLength(2);
  });

  it('includes sanitized debug payload when explicitly enabled', () => {
    const captured: unknown[] = [];
    const telemetry = createAITelemetry({
      includeDebugPayloads: true,
      sink: {
        emit(event) {
          captured.push(event);
        },
      },
    });

    const result = telemetry.schemaValidationFailed({
      route: '/worker/ai/reconcile',
      schema_name: 'OrderSchema',
      schema_version: '1.0.0',
      debug: {
        prompt: 'raw prompt',
        validationErrors: ['missing field'],
      },
    });

    expect(result.debug).toEqual({
      prompt: expect.stringMatching(/^\[redacted-text:\d+\]$/),
      validationErrors: ['missing field'],
    });
    expect(captured).toHaveLength(1);
  });
});
