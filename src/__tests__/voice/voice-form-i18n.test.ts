/**
 * Tests de integración — voiceFormI18n
 * Ola 4 — Plan 107
 *
 * Cubre: detectLanguage() y normalizeWithLanguage().
 * No necesita mocks — son funciones puras.
 */

import { detectLanguage, normalizeWithLanguage } from '@/services/ai-core/voiceFormI18n';

// ---------------------------------------------------------------------------
// Helper: reproducir la lógica de isoDateFromOffset del módulo bajo prueba
// ---------------------------------------------------------------------------
function expectedIsoDate(offsetDays: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// detectLanguage
// ---------------------------------------------------------------------------
describe('detectLanguage()', () => {
  it('detecta español para texto con marcadores ES claramente dominantes', () => {
    expect(detectLanguage('el equipo de la empresa está en el taller')).toBe('es');
  });

  it('detecta inglés para texto con marcadores EN claramente dominantes', () => {
    expect(detectLanguage('the equipment is broken and the team needs help')).toBe('en');
  });

  it('detecta español para texto técnico ISO en español', () => {
    expect(detectLanguage('el proceso de auditoría de la organización')).toBe('es');
  });

  it('detecta inglés para texto técnico en inglés', () => {
    expect(detectLanguage('the audit process for the organization')).toBe('en');
  });

  it('retorna "es" por defecto cuando el texto es ambiguo o vacío', () => {
    // Sin marcadores claros de ningún idioma → retorna 'es' (enScore <= esScore)
    expect(detectLanguage('')).toBe('es');
    expect(detectLanguage('1234 XYZ ABC')).toBe('es');
  });

  it('retorna "es" cuando los scores son iguales', () => {
    // 'in' es marker de EN, 'en' es marker de ES — ambos aparecen
    // Si esScore === enScore → retorna 'es' (condición: enScore > esScore)
    expect(detectLanguage('in en')).toBe('es');
  });
});

// ---------------------------------------------------------------------------
// normalizeWithLanguage — unidades
// ---------------------------------------------------------------------------
describe('normalizeWithLanguage() — reemplazo de unidades', () => {
  it('reemplaza "kilos" por "kg" en español', () => {
    const result = normalizeWithLanguage('peso 50 kilos', 'es');
    expect(result).toContain('kg');
    expect(result).not.toContain('kilos');
  });

  it('reemplaza "kilogramos" por "kg" en español', () => {
    const result = normalizeWithLanguage('masa de 30 kilogramos', 'es');
    expect(result).toContain('kg');
  });

  it('reemplaza "litros" por "l" en español', () => {
    const result = normalizeWithLanguage('capacidad 200 litros', 'es');
    expect(result).toContain(' l');
  });

  it('reemplaza "horas" por "h" en español', () => {
    const result = normalizeWithLanguage('duración de 8 horas', 'es');
    expect(result).toContain(' h');
  });

  it('reemplaza "pounds" por "lb" en inglés', () => {
    const result = normalizeWithLanguage('weight 150 pounds', 'en');
    expect(result).toContain('lb');
    expect(result).not.toContain('pounds');
  });

  it('reemplaza "kilograms" por "kg" en inglés', () => {
    const result = normalizeWithLanguage('weight 70 kilograms', 'en');
    expect(result).toContain('kg');
  });

  it('reemplaza "hours" por "h" en inglés', () => {
    const result = normalizeWithLanguage('duration 4 hours', 'en');
    expect(result).toContain(' h');
  });

  it('no reemplaza palabras que no son unidades', () => {
    const result = normalizeWithLanguage('el cliente quiere más información', 'es');
    expect(result).toBe('el cliente quiere más información');
  });
});

// ---------------------------------------------------------------------------
// normalizeWithLanguage — fechas relativas
// ---------------------------------------------------------------------------
describe('normalizeWithLanguage() — fechas relativas', () => {
  it('reemplaza "hoy" por la fecha ISO de hoy en español', () => {
    const todayIso = expectedIsoDate(0);
    const result = normalizeWithLanguage('la inspección es hoy', 'es');
    expect(result).toContain(todayIso);
    expect(result).not.toMatch(/\bhoy\b/);
  });

  it('reemplaza "ayer" por la fecha ISO de ayer en español', () => {
    const yesterdayIso = expectedIsoDate(-1);
    const result = normalizeWithLanguage('ocurrió ayer por la mañana', 'es');
    expect(result).toContain(yesterdayIso);
  });

  it('reemplaza "mañana" por la fecha ISO de mañana en español', () => {
    const tomorrowIso = expectedIsoDate(1);
    const result = normalizeWithLanguage('la reunión es mañana', 'es');
    expect(result).toContain(tomorrowIso);
  });

  it('reemplaza "today" por la fecha ISO de hoy en inglés', () => {
    const todayIso = expectedIsoDate(0);
    const result = normalizeWithLanguage('the inspection is today', 'en');
    expect(result).toContain(todayIso);
    expect(result).not.toMatch(/\btoday\b/);
  });

  it('reemplaza "yesterday" por la fecha ISO de ayer en inglés', () => {
    const yesterdayIso = expectedIsoDate(-1);
    const result = normalizeWithLanguage('it happened yesterday', 'en');
    expect(result).toContain(yesterdayIso);
  });

  it('reemplaza "tomorrow" por la fecha ISO de mañana en inglés', () => {
    const tomorrowIso = expectedIsoDate(1);
    const result = normalizeWithLanguage('meeting is tomorrow morning', 'en');
    expect(result).toContain(tomorrowIso);
  });

  it('reemplaza "el día de hoy" como frase completa', () => {
    const todayIso = expectedIsoDate(0);
    const result = normalizeWithLanguage('la tarea vence el día de hoy', 'es');
    expect(result).toContain(todayIso);
  });
});

// ---------------------------------------------------------------------------
// normalizeWithLanguage — combinado
// ---------------------------------------------------------------------------
describe('normalizeWithLanguage() — texto combinado', () => {
  it('normaliza unidades y fechas en un solo texto en español', () => {
    const todayIso = expectedIsoDate(0);
    const result = normalizeWithLanguage('pesaje de 120 kilos realizado hoy', 'es');
    expect(result).toContain('kg');
    expect(result).toContain(todayIso);
  });

  it('normaliza unidades y fechas en un solo texto en inglés', () => {
    const tomorrowIso = expectedIsoDate(1);
    const result = normalizeWithLanguage('delivery of 50 kilograms expected tomorrow', 'en');
    expect(result).toContain('kg');
    expect(result).toContain(tomorrowIso);
  });

  it('no altera texto que no tiene términos reconocibles', () => {
    const text = 'código de referencia AB-1234 pendiente';
    const result = normalizeWithLanguage(text, 'es');
    expect(result).toBe(text);
  });
});
