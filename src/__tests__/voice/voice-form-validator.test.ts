/**
 * Tests de integración — VoiceFormValidator
 * Ola 4 — Plan 107
 *
 * Cubre: validateField() (número, texto, fecha, pattern, allowed_values)
 * y validateAll().
 * No necesita mocks — es una clase pura sin dependencias externas.
 */

import { VoiceFormValidator } from '@/services/ai-core/voiceFormValidator';
import type { FieldValidationRule } from '@/types/voice-form';

describe('VoiceFormValidator', () => {
  let validator: VoiceFormValidator;

  beforeEach(() => {
    validator = new VoiceFormValidator();
  });

  // -------------------------------------------------------------------------
  // validateField — campo numérico
  // -------------------------------------------------------------------------
  describe('validateField() — tipo numérico', () => {
    const numRule: FieldValidationRule = { field_id: 'edad', min: 0, max: 120, unit: 'años' };

    it('retorna is_valid: true para valor dentro de rango', () => {
      const result = validator.validateField('edad', 45, numRule);
      expect(result.is_valid).toBe(true);
      expect(result.original_value).toBe(45);
      expect(result.error).toBeUndefined();
    });

    it('retorna is_valid: false para valor menor al mínimo', () => {
      const result = validator.validateField('edad', -5, numRule);
      expect(result.is_valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/-5/);
    });

    it('incluye corrected_value al clampear al mínimo', () => {
      const result = validator.validateField('edad', -5, numRule);
      expect(result.corrected_value).toBe(0);
    });

    it('retorna is_valid: false para valor mayor al máximo', () => {
      const result = validator.validateField('edad', 250, numRule);
      expect(result.is_valid).toBe(false);
      expect(result.error).toContain('250');
    });

    it('incluye corrected_value al clampear al máximo', () => {
      const result = validator.validateField('edad', 250, numRule);
      expect(result.corrected_value).toBe(120);
    });

    it('usa error_message personalizado cuando se provee', () => {
      const rule: FieldValidationRule = { field_id: 'peso', max: 500, error_message: 'Peso inválido' };
      const result = validator.validateField('peso', 1000, rule);
      expect(result.error).toBe('Peso inválido');
    });

    it('retorna warning para edad inusualmente alta (> 100)', () => {
      const result = validator.validateField('edad', 105, numRule);
      expect(result.is_valid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('105');
    });

    it('retorna is_valid: true y sin warning para valor normal', () => {
      const result = validator.validateField('edad', 30, numRule);
      expect(result.is_valid).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // validateField — campo de texto (longitud y pattern)
  // -------------------------------------------------------------------------
  describe('validateField() — tipo texto', () => {
    it('retorna is_valid: false si el texto es más corto que min_length', () => {
      const rule: FieldValidationRule = { field_id: 'nombre', min_length: 3 };
      const result = validator.validateField('nombre', 'ab', rule);
      expect(result.is_valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('retorna is_valid: false si el texto supera max_length', () => {
      const rule: FieldValidationRule = { field_id: 'codigo', max_length: 5 };
      const result = validator.validateField('codigo', 'ABCDEF', rule);
      expect(result.is_valid).toBe(false);
    });

    it('retorna is_valid: true para texto dentro de longitud permitida', () => {
      const rule: FieldValidationRule = { field_id: 'nombre', min_length: 2, max_length: 50 };
      const result = validator.validateField('nombre', 'Juan García', rule);
      expect(result.is_valid).toBe(true);
    });

    it('valida email básico con pattern', () => {
      const rule: FieldValidationRule = {
        field_id: 'email',
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      };
      const result = validator.validateField('email', 'test@example.com', rule);
      expect(result.is_valid).toBe(true);
    });

    it('rechaza email inválido con pattern', () => {
      const rule: FieldValidationRule = {
        field_id: 'email',
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      };
      const result = validator.validateField('email', 'no-es-un-email', rule);
      expect(result.is_valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('valida allowed_values sin distinguir mayúsculas ni acentos', () => {
      const rule: FieldValidationRule = {
        field_id: 'tipo',
        allowed_values: ['Mantenimiento', 'Reparación', 'Inspección'],
      };
      const result = validator.validateField('tipo', 'reparacion', rule); // sin acento
      expect(result.is_valid).toBe(true);
    });

    it('rechaza valor fuera de allowed_values', () => {
      const rule: FieldValidationRule = {
        field_id: 'tipo',
        allowed_values: ['mantenimiento', 'reparacion'],
      };
      const result = validator.validateField('tipo', 'demolicion', rule);
      expect(result.is_valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // validateField — campo de fecha
  // -------------------------------------------------------------------------
  describe('validateField() — tipo fecha', () => {
    it('retorna is_valid: false para fecha en el pasado con min_date: today', () => {
      const rule: FieldValidationRule = { field_id: 'fecha', min_date: 'today' };
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = validator.validateField('fecha', yesterday.toISOString().split('T')[0], rule);
      expect(result.is_valid).toBe(false);
      expect(result.error).toMatch(/pasado/i);
    });

    it('acepta fecha de hoy con min_date: today', () => {
      const rule: FieldValidationRule = { field_id: 'fecha', min_date: 'today' };
      const today = new Date();
      const result = validator.validateField('fecha', today, rule);
      expect(result.is_valid).toBe(true);
    });

    it('retorna is_valid: false para fecha futura con max_date: today', () => {
      const rule: FieldValidationRule = { field_id: 'fecha', max_date: 'today' };
      // Construir mañana como Date (medianoche local) para evitar problemas
      // de timezone cuando se pasa ISO string (UTC midnight ≠ local midnight)
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = validator.validateField('fecha', tomorrow, rule);
      expect(result.is_valid).toBe(false);
      expect(result.error).toMatch(/futura/i);
    });

    it('acepta fecha pasada con max_date: today', () => {
      const rule: FieldValidationRule = { field_id: 'fecha', max_date: 'today' };
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = validator.validateField('fecha', yesterday.toISOString().split('T')[0], rule);
      expect(result.is_valid).toBe(true);
    });

    it('retorna is_valid: false para string no parseable como fecha', () => {
      const rule: FieldValidationRule = { field_id: 'fecha', min_date: 'today' };
      const result = validator.validateField('fecha', 'no-es-fecha', rule);
      expect(result.is_valid).toBe(false);
    });

    it('acepta Date object directamente', () => {
      const rule: FieldValidationRule = { field_id: 'fecha', min_date: 'today' };
      const today = new Date();
      const result = validator.validateField('fecha', today, rule);
      expect(result.is_valid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // autoCorrect
  // -------------------------------------------------------------------------
  describe('autoCorrect()', () => {
    it('corrige al mínimo cuando el valor está por debajo', () => {
      const rule: FieldValidationRule = { field_id: 'x', min: 10, max: 100 };
      expect(validator.autoCorrect(3, rule)).toBe(10);
    });

    it('corrige al máximo cuando el valor está por encima', () => {
      const rule: FieldValidationRule = { field_id: 'x', min: 10, max: 100 };
      expect(validator.autoCorrect(200, rule)).toBe(100);
    });

    it('retorna null cuando el valor está dentro del rango', () => {
      const rule: FieldValidationRule = { field_id: 'x', min: 10, max: 100 };
      expect(validator.autoCorrect(50, rule)).toBeNull();
    });

    it('retorna null cuando no hay restricciones', () => {
      const rule: FieldValidationRule = { field_id: 'x' };
      expect(validator.autoCorrect(9999, rule)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // validateAll
  // -------------------------------------------------------------------------
  describe('validateAll()', () => {
    it('valida múltiples campos de una vez', () => {
      const extracted = [
        { campo_id: 'edad', valor_extraido: 25 },
        { campo_id: 'nombre', valor_extraido: 'María' },
      ];
      const rules: FieldValidationRule[] = [
        { field_id: 'edad', min: 0, max: 120 },
        { field_id: 'nombre', min_length: 2 },
      ];
      const results = validator.validateAll(extracted, rules);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.is_valid)).toBe(true);
    });

    it('retorna solo los campos que tienen regla definida', () => {
      const extracted = [
        { campo_id: 'edad', valor_extraido: 25 },
        { campo_id: 'sin_regla', valor_extraido: 'algo' }, // sin regla
      ];
      const rules: FieldValidationRule[] = [
        { field_id: 'edad', max: 120 },
      ];
      const results = validator.validateAll(extracted, rules);
      expect(results).toHaveLength(1);
      expect(results[0].field_id).toBe('edad');
    });

    it('incluye errores para campos inválidos', () => {
      const extracted = [
        { campo_id: 'temperatura', valor_extraido: 9999 },
      ];
      const rules: FieldValidationRule[] = [
        { field_id: 'temperatura', max: 100, unit: '°C' },
      ];
      const results = validator.validateAll(extracted, rules);
      expect(results[0].is_valid).toBe(false);
      expect(results[0].corrected_value).toBe(100);
    });

    it('retorna array vacío cuando no hay extracted que coincidan con reglas', () => {
      const results = validator.validateAll([], [{ field_id: 'x', max: 10 }]);
      expect(results).toHaveLength(0);
    });
  });
});
