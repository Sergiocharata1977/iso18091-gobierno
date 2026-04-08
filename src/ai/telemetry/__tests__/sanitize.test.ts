import {
  redactString,
  sanitizeTelemetryObject,
  sanitizeTelemetryValue,
} from '@/ai/telemetry';

describe('AI telemetry sanitization', () => {
  it('redacts secret and sensitive text fields recursively', () => {
    const sanitized = sanitizeTelemetryObject({
      apiKey: 'secret-123',
      prompt: 'Contenido largo del prompt que no debe quedar logueado completo',
      nested: {
        authorization: 'Bearer abc',
        response: 'Respuesta completa con informacion interna',
        safe: 'ok',
      },
    });

    expect(sanitized).toEqual({
      apiKey: '[redacted-secret]',
      prompt: expect.stringMatching(/^\[redacted-text:\d+\]$/),
      nested: {
        authorization: '[redacted-secret]',
        response: expect.stringMatching(/^\[redacted-text:\d+\]$/),
        safe: 'ok',
      },
    });
  });

  it('truncates long strings and limits arrays', () => {
    const longText = 'a'.repeat(220);
    const sanitized = sanitizeTelemetryValue({
      note: longText,
      items: Array.from({ length: 12 }, (_, i) => i),
    });

    expect(sanitized).toEqual({
      note: `${'a'.repeat(160)}...[truncated:220]`,
      items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '[+2 items]'],
    });
  });

  it('applies direct string redaction helper', () => {
    expect(redactString('short')).toBe('short');
    expect(redactString('b'.repeat(170))).toMatch(/\.\.\.\[truncated:170\]$/);
  });
});
