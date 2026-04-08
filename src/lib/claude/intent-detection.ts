// Intent Detection Service for Don Cándido

import { UserContext } from '@/types/context';
import { ClaudeService } from './client';

export type IntentType = 'query' | 'form' | 'action' | 'analysis' | 'report';

export type FormType =
  | 'no_conformidad'
  | 'auditoria'
  | 'accion_correctiva'
  | 'process_record'
  | 'hallazgo';

export type ActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'complete'
  | 'change_status';

export interface DetectedIntent {
  type: IntentType;
  formType?: FormType;
  actionType?: ActionType;
  confidence: number;
  parameters: Record<string, unknown>;
  reasoning?: string;
}

export class IntentDetectionService {
  /**
   * Detect user intent from message using Claude
   */
  static async detectIntent(
    message: string,
    context: UserContext
  ): Promise<DetectedIntent> {
    try {
      console.log('[IntentDetectionService] Detecting intent for:', message);

      // Create system prompt for intent detection
      const systemPrompt = this.createIntentDetectionPrompt(context);

      // Ask Claude to detect intent
      const response = await ClaudeService.enviarMensaje(
        systemPrompt,
        [
          {
            role: 'user',
            content: message,
          },
        ],
        500 // Short response for intent detection
      );

      // Parse Claude's response
      const intent = this.parseIntentResponse(response.content);

      console.log('[IntentDetectionService] Detected intent:', intent);

      return intent;
    } catch (error) {
      console.error('[IntentDetectionService] Error detecting intent:', error);

      // Default to query if detection fails
      return {
        type: 'query',
        confidence: 0.5,
        parameters: {},
        reasoning: 'Error en detección, asumiendo consulta simple',
      };
    }
  }

  /**
   * Create system prompt for intent detection
   */
  private static createIntentDetectionPrompt(context: UserContext): string {
    return `Eres un sistema de detección de intenciones para Don Cándido, un asistente de ISO 9001.

Tu tarea es analizar el mensaje del usuario y determinar su INTENCIÓN principal.

CONTEXTO DEL USUARIO:
- Nombre: ${context.personnel?.nombres} ${context.personnel?.apellidos}
- Puesto: ${context.position?.nombre || 'No especificado'}
- Departamento: ${context.department?.nombre || 'No especificado'}

TIPOS DE INTENCIÓN:

1. **query** - Consulta simple de información
   Ejemplos: "¿Qué es la cláusula 8.5?", "¿Cómo hago una auditoría?"

2. **form** - Quiere crear/registrar algo mediante formulario conversacional
   Ejemplos: "Quiero registrar una no conformidad", "Necesito crear una auditoría"
   Sub-tipos: no_conformidad, auditoria, accion_correctiva, process_record, hallazgo

3. **action** - Quiere ejecutar una acción sobre un registro existente
   Ejemplos: "Marca la auditoría AUD-123 como completada", "Asigna NC-456 a Juan"
   Sub-tipos: create, update, delete, assign, complete, change_status

4. **analysis** - Quiere análisis de datos o insights
   Ejemplos: "¿Cómo van mis indicadores?", "Muestra el estado de mis objetivos"

5. **report** - Quiere generar un reporte/documento
   Ejemplos: "Genera un reporte semanal", "Necesito un informe de auditorías"

INSTRUCCIONES:
1. Analiza el mensaje del usuario
2. Determina la intención principal
3. Extrae parámetros relevantes (nombres, fechas, áreas, etc.)
4. Responde SOLO en formato JSON, sin texto adicional

FORMATO DE RESPUESTA (JSON):
{
  "type": "query|form|action|analysis|report",
  "formType": "no_conformidad|auditoria|accion_correctiva|process_record|hallazgo" (solo si type=form),
  "actionType": "create|update|delete|assign|complete|change_status" (solo si type=action),
  "confidence": 0.0-1.0,
  "parameters": {
    "area": "...",
    "fecha": "...",
    "responsable": "...",
    etc.
  },
  "reasoning": "Breve explicación de por qué detectaste esta intención"
}

IMPORTANTE:
- Responde SOLO con el JSON, sin markdown ni texto adicional
- Si no estás seguro, usa confidence < 0.7
- Extrae todos los parámetros que puedas del mensaje`;
  }

  /**
   * Parse Claude's response to extract intent
   */
  private static parseIntentResponse(response: string): DetectedIntent {
    try {
      // Remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/g, '');
      }

      // Parse JSON
      const parsed = JSON.parse(cleanResponse);

      // Validate and return
      return {
        type: parsed.type || 'query',
        formType: parsed.formType,
        actionType: parsed.actionType,
        confidence: parsed.confidence || 0.5,
        parameters: parsed.parameters || {},
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('[IntentDetectionService] Error parsing response:', error);
      console.error('[IntentDetectionService] Response was:', response);

      // Try to extract intent from text if JSON parsing fails
      return this.fallbackIntentDetection(response);
    }
  }

  /**
   * Fallback intent detection if JSON parsing fails
   */
  private static fallbackIntentDetection(response: string): DetectedIntent {
    const lowerResponse = response.toLowerCase();

    // Check for form keywords
    if (
      lowerResponse.includes('registrar') ||
      lowerResponse.includes('crear') ||
      lowerResponse.includes('nuevo')
    ) {
      if (
        lowerResponse.includes('no conformidad') ||
        lowerResponse.includes('nc')
      ) {
        return {
          type: 'form',
          formType: 'no_conformidad',
          confidence: 0.6,
          parameters: {},
        };
      }
      if (lowerResponse.includes('auditor')) {
        return {
          type: 'form',
          formType: 'auditoria',
          confidence: 0.6,
          parameters: {},
        };
      }
      if (
        lowerResponse.includes('acción correctiva') ||
        lowerResponse.includes('ac')
      ) {
        return {
          type: 'form',
          formType: 'accion_correctiva',
          confidence: 0.6,
          parameters: {},
        };
      }
    }

    // Check for action keywords
    if (
      lowerResponse.includes('marca') ||
      lowerResponse.includes('asigna') ||
      lowerResponse.includes('cambia') ||
      lowerResponse.includes('completa')
    ) {
      return {
        type: 'action',
        confidence: 0.6,
        parameters: {},
      };
    }

    // Check for analysis keywords
    if (
      lowerResponse.includes('cómo van') ||
      lowerResponse.includes('estado de') ||
      lowerResponse.includes('muestra') ||
      lowerResponse.includes('cuántos') ||
      lowerResponse.includes('cuántas')
    ) {
      return {
        type: 'analysis',
        confidence: 0.6,
        parameters: {},
      };
    }

    // Check for report keywords
    if (
      lowerResponse.includes('reporte') ||
      lowerResponse.includes('informe') ||
      lowerResponse.includes('genera')
    ) {
      return {
        type: 'report',
        confidence: 0.6,
        parameters: {},
      };
    }

    // Default to query
    return {
      type: 'query',
      confidence: 0.5,
      parameters: {},
    };
  }

  /**
   * Quick check if message is likely a form request (without calling Claude)
   */
  static isLikelyFormRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const formKeywords = [
      'registrar',
      'crear',
      'nuevo',
      'nueva',
      'quiero registrar',
      'necesito crear',
      'voy a registrar',
    ];

    const formTypes = [
      'no conformidad',
      'auditoría',
      'auditoria',
      'acción correctiva',
      'accion correctiva',
      'hallazgo',
      'registro',
    ];

    const hasFormKeyword = formKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );
    const hasFormType = formTypes.some(type => lowerMessage.includes(type));

    return hasFormKeyword && hasFormType;
  }

  /**
   * Quick check if message is likely an action request
   */
  static isLikelyActionRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const actionKeywords = [
      'marca',
      'marcar',
      'asigna',
      'asignar',
      'cambia',
      'cambiar',
      'completa',
      'completar',
      'cierra',
      'cerrar',
      'actualiza',
      'actualizar',
    ];

    return actionKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}
