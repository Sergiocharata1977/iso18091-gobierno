/**
 * IAOutputValidator - Validador de salidas de IA para evitar alucinaciones
 *
 * Este servicio valida las respuestas de la IA antes de mostrarlas al usuario,
 * verificando que no contengan cláusulas ISO inventadas u otra información falsa.
 *
 * Diseñado para NO impactar significativamente la velocidad del sistema.
 */

// Cláusulas válidas de ISO 9001:2015
const ISO_9001_VALID_CLAUSES = [
  // Cláusulas principales (4-10)
  '4',
  '4.1',
  '4.2',
  '4.3',
  '4.4',
  '4.4.1',
  '4.4.2',
  '5',
  '5.1',
  '5.1.1',
  '5.1.2',
  '5.2',
  '5.2.1',
  '5.2.2',
  '5.3',
  '6',
  '6.1',
  '6.1.1',
  '6.1.2',
  '6.2',
  '6.2.1',
  '6.2.2',
  '6.3',
  '7',
  '7.1',
  '7.1.1',
  '7.1.2',
  '7.1.3',
  '7.1.4',
  '7.1.5',
  '7.1.5.1',
  '7.1.5.2',
  '7.1.6',
  '7.2',
  '7.3',
  '7.4',
  '7.5',
  '7.5.1',
  '7.5.2',
  '7.5.3',
  '7.5.3.1',
  '7.5.3.2',
  '8',
  '8.1',
  '8.2',
  '8.2.1',
  '8.2.2',
  '8.2.3',
  '8.2.3.1',
  '8.2.3.2',
  '8.2.4',
  '8.3',
  '8.3.1',
  '8.3.2',
  '8.3.3',
  '8.3.4',
  '8.3.5',
  '8.3.6',
  '8.4',
  '8.4.1',
  '8.4.2',
  '8.4.3',
  '8.5',
  '8.5.1',
  '8.5.2',
  '8.5.3',
  '8.5.4',
  '8.5.5',
  '8.5.6',
  '8.6',
  '8.7',
  '8.7.1',
  '8.7.2',
  '9',
  '9.1',
  '9.1.1',
  '9.1.2',
  '9.1.3',
  '9.2',
  '9.2.1',
  '9.2.2',
  '9.3',
  '9.3.1',
  '9.3.2',
  '9.3.3',
  '10',
  '10.1',
  '10.2',
  '10.2.1',
  '10.2.2',
  '10.3',
];

// Patrones de cláusulas que NO existen (alucinaciones comunes)
const INVALID_CLAUSE_PATTERNS = [
  /cláusula\s*(1[1-9]|[2-9]\d)/i, // Cláusulas 11+
  /clause\s*(1[1-9]|[2-9]\d)/i,
  /punto\s*(1[1-9]|[2-9]\d)/i,
  /sección\s*(1[1-9]|[2-9]\d)/i,
];

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  sanitizedContent: string;
  hallucinationDetected: boolean;
}

export class IAOutputValidator {
  /**
   * Valida la salida de la IA de forma rápida (sin llamadas adicionales a API)
   * Tiempo de ejecución estimado: < 5ms
   */
  static validateOutput(content: string): ValidationResult {
    const warnings: string[] = [];
    let hallucinationDetected = false;
    let sanitizedContent = content;

    // 1. Verificar cláusulas ISO mencionadas
    const clauseMatches = content.match(
      /(?:cláusula|clause|punto|sección)\s*(\d+(?:\.\d+)*)/gi
    );

    if (clauseMatches) {
      for (const match of clauseMatches) {
        const clauseNumber = match.match(/(\d+(?:\.\d+)*)/)?.[1];
        if (clauseNumber && !this.isValidClause(clauseNumber)) {
          warnings.push(
            `Posible cláusula inventada detectada: ${clauseNumber}`
          );
          hallucinationDetected = true;
        }
      }
    }

    // 2. Verificar patrones de cláusulas inválidas
    for (const pattern of INVALID_CLAUSE_PATTERNS) {
      if (pattern.test(content)) {
        warnings.push(
          'La respuesta menciona cláusulas que no existen en ISO 9001:2015'
        );
        hallucinationDetected = true;
        break;
      }
    }

    // 3. Verificar menciones peligrosas (datos de otros tenants, system prompts)
    const dangerousPatterns = [
      /organization_id/i,
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token de acceso/i,
      /system prompt/i,
      /instrucciones del sistema/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        warnings.push('La respuesta podría contener información sensible');
        // Sanitizar: reemplazar con [REDACTED]
        sanitizedContent = sanitizedContent.replace(
          pattern,
          '[INFORMACIÓN PROTEGIDA]'
        );
      }
    }

    return {
      isValid: !hallucinationDetected && warnings.length === 0,
      warnings,
      sanitizedContent,
      hallucinationDetected,
    };
  }

  /**
   * Verifica si un número de cláusula es válido en ISO 9001:2015
   */
  private static isValidClause(clauseNumber: string): boolean {
    // Normalizar el número (quitar espacios, etc.)
    const normalized = clauseNumber.trim();

    // Verificar si está en la lista de cláusulas válidas
    if (ISO_9001_VALID_CLAUSES.includes(normalized)) {
      return true;
    }

    // Verificar si es una sub-cláusula válida (ej: 7.1.5.1)
    // Las cláusulas válidas van de 4 a 10
    const mainClause = parseInt(normalized.split('.')[0]);
    return mainClause >= 4 && mainClause <= 10;
  }

  /**
   * Sanitiza el input del usuario para prevenir prompt injection
   * Tiempo de ejecución: < 1ms
   */
  static sanitizeUserInput(input: string, maxLength: number = 2000): string {
    // 1. Limitar longitud
    let sanitized = input.slice(0, maxLength);

    // 2. Agregar prefijo de contexto para reforzar el rol
    sanitized = `[Pregunta del usuario]: ${sanitized}`;

    // 3. Escapar intentos comunes de inyección
    const injectionPatterns = [
      /ignore\s*(previous|all|above)\s*instructions/gi,
      /olvida\s*(las|todas)\s*(instrucciones|reglas)/gi,
      /actúa\s*como\s*(si|un)\s*(fueras|administrador)/gi,
      /reveal\s*(the|your)\s*(system|prompt)/gi,
      /muestra\s*(el|tu)\s*prompt/gi,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(sanitized)) {
        // Log el intento (para análisis de seguridad)
        console.warn(
          '[IAOutputValidator] Posible intento de prompt injection detectado'
        );
        // Reemplazar el intento con texto inofensivo
        sanitized = sanitized.replace(pattern, '[solicitud no válida]');
      }
    }

    return sanitized;
  }

  /**
   * Valida que la respuesta tenga un formato aceptable
   */
  static validateResponseFormat(response: string): boolean {
    // La respuesta no debe estar vacía
    if (!response || response.trim().length === 0) {
      return false;
    }

    // La respuesta no debe ser solo código o JSON
    const codeRatio = (response.match(/```/g) || []).length / response.length;
    if (codeRatio > 0.3) {
      return false;
    }

    // La respuesta debe tener contenido legible
    const wordCount = response.split(/\s+/).length;
    return wordCount >= 5;
  }
}
