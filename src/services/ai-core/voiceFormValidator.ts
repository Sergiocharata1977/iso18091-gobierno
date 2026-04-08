import {
  FieldValidationResult,
  FieldValidationRule,
} from '@/types/voice-form';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolveDateBound(bound: string | undefined): Date | null {
  if (!bound) {
    return null;
  }

  const date = new Date();
  date.setHours(0, 0, 0, 0);

  if (bound === 'today') {
    return date;
  }

  if (bound === 'yesterday') {
    date.setDate(date.getDate() - 1);
    return date;
  }

  if (bound === 'tomorrow') {
    date.setDate(date.getDate() + 1);
    return date;
  }

  const explicitDate = new Date(bound);
  if (Number.isNaN(explicitDate.getTime())) {
    return null;
  }

  explicitDate.setHours(0, 0, 0, 0);
  return explicitDate;
}

function toDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export class VoiceFormValidator {
  validateField(
    field_id: string,
    value: unknown,
    rule: FieldValidationRule
  ): FieldValidationResult {
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        const corrected = this.autoCorrect(value, rule);
        return {
          field_id,
          is_valid: false,
          original_value: value,
          corrected_value: corrected ?? undefined,
          error:
            rule.error_message ??
            `El valor ${value} es menor al minimo permitido (${rule.min} ${rule.unit ?? ''})`.trim(),
        };
      }

      if (rule.max !== undefined && value > rule.max) {
        const corrected = this.autoCorrect(value, rule);
        return {
          field_id,
          is_valid: false,
          original_value: value,
          corrected_value: corrected ?? undefined,
          error:
            rule.error_message ??
            `El valor ${value} supera el maximo permitido (${rule.max} ${rule.unit ?? ''})`.trim(),
        };
      }

      if (rule.unit === 'años' && value > 100) {
        return {
          field_id,
          is_valid: true,
          original_value: value,
          warning: `Edad inusualmente alta: ${value} años`,
        };
      }
    }

    if (typeof value === 'string') {
      if (rule.min_length !== undefined && value.length < rule.min_length) {
        return {
          field_id,
          is_valid: false,
          original_value: value,
          error:
            rule.error_message ??
            `El texto es mas corto que el minimo permitido (${rule.min_length})`,
        };
      }

      if (rule.max_length !== undefined && value.length > rule.max_length) {
        return {
          field_id,
          is_valid: false,
          original_value: value,
          error:
            rule.error_message ??
            `El texto supera el maximo permitido (${rule.max_length})`,
        };
      }

      if (rule.pattern) {
        const regex = new RegExp(rule.pattern);
        if (!regex.test(value)) {
          return {
            field_id,
            is_valid: false,
            original_value: value,
            error: rule.error_message ?? 'Formato invalido',
          };
        }
      }

      if (rule.allowed_values?.length) {
        const normalizedValue = normalizeText(value);
        const normalizedAllowed = rule.allowed_values.map(item => normalizeText(item));

        if (!normalizedAllowed.includes(normalizedValue)) {
          return {
            field_id,
            is_valid: false,
            original_value: value,
            error:
              rule.error_message ??
              `Valor fuera de lista permitida (${rule.allowed_values.join(', ')})`,
          };
        }
      }
    }

    if (Array.isArray(rule.allowed_values) && typeof value !== 'string' && value !== null && value !== undefined) {
      const normalizedValue = normalizeText(String(value));
      const normalizedAllowed = rule.allowed_values.map(item => normalizeText(item));
      if (!normalizedAllowed.includes(normalizedValue)) {
        return {
          field_id,
          is_valid: false,
          original_value: value,
          error:
            rule.error_message ??
            `Valor fuera de lista permitida (${rule.allowed_values.join(', ')})`,
        };
      }
    }

    if (rule.min_date || rule.max_date) {
      const date = toDateValue(value);

      if (!date) {
        return {
          field_id,
          is_valid: false,
          original_value: value,
          error: rule.error_message ?? 'Fecha invalida',
        };
      }

      const minDate = resolveDateBound(rule.min_date);
      if (minDate && date < minDate) {
        return {
          field_id,
          is_valid: false,
          original_value: value,
          error:
            rule.error_message ??
            (rule.min_date === 'today'
              ? 'La fecha no puede ser en el pasado'
              : `La fecha no puede ser anterior a ${minDate.toISOString().split('T')[0]}`),
        };
      }

      const maxDate = resolveDateBound(rule.max_date);
      if (maxDate && date > maxDate) {
        return {
          field_id,
          is_valid: false,
          original_value: value,
          error:
            rule.error_message ??
            (rule.max_date === 'today'
              ? 'La fecha no puede ser futura'
              : `La fecha no puede ser posterior a ${maxDate.toISOString().split('T')[0]}`),
        };
      }
    }

    return {
      field_id,
      is_valid: true,
      original_value: value,
    };
  }

  validateAll(
    extracted: Array<{ campo_id: string; valor_extraido: unknown }>,
    rules: FieldValidationRule[]
  ): FieldValidationResult[] {
    const rulesByField = new Map(rules.map(rule => [rule.field_id, rule]));

    return extracted.flatMap(item => {
      const rule = rulesByField.get(item.campo_id);
      if (!rule) {
        return [];
      }

      return [this.validateField(item.campo_id, item.valor_extraido, rule)];
    });
  }

  autoCorrect(value: number, rule: FieldValidationRule): number | null {
    if (rule.min !== undefined && value < rule.min) {
      return rule.min;
    }

    if (rule.max !== undefined && value > rule.max) {
      return rule.max;
    }

    return null;
  }
}

