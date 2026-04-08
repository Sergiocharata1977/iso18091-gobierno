/**
 * API Endpoint: POST /api/ai/process-suggestions
 * Genera sugerencias de IA para definición de procesos ISO 9001
 *
 * ACTUALIZADO (Enero 2026):
 * - Usa Prompt Único del sistema
 * - Valida etapa de implementación antes de sugerir
 * - Contexto real de organización
 *
 * Modos:
 * - "name": Sugiere 3 nombres de proceso con justificación
 * - "full": Genera contenido completo para todos los campos vacíos
 * - "section": Genera contenido para una sección específica
 */

import {
  getImplementationContext,
  validateAIAction,
} from '@/lib/ai/implementationContext';
import { getProcessSuggestionPrompt } from '@/lib/ai/systemPrompt';
import { PROCESS_CATEGORIES, ProcessCategoryId } from '@/types/processRecords';
import { withAuth } from '@/lib/api/withAuth';
import { NextRequest, NextResponse } from 'next/server';

interface ProcessAIContext {
  rubro?: string;
  tamanioEmpresa?: string;
  normaCriterios?: string;
  organizationId?: string;
}

interface ProcessAISuggestionRequest {
  mode: 'name' | 'full' | 'section' | 'sipoc';
  processName?: string;
  category?: ProcessCategoryId;
  existingFields?: {
    descripcion?: string;
    objetivo?: string;
    alcance?: string;
    funciones_involucradas?: string[];
  };
  context?: ProcessAIContext;
  section?:
    | 'descripcion'
    | 'objetivo'
    | 'alcance'
    | 'funciones'
    | 'entradas_salidas';
}

// Prompts específicos por modo (ahora incluye Prompt Único)
function buildPrompt(
  request: ProcessAISuggestionRequest,
  systemContext: string
): string {
  const categoryLabel = request.category
    ? PROCESS_CATEGORIES[request.category]?.label || 'Sin categoría'
    : 'Sin categoría';

  const userContext = request.context
    ? `
Contexto adicional del usuario:
- Rubro/Industria: ${request.context.rubro || 'No especificado'}
- Tamaño de empresa: ${request.context.tamanioEmpresa || 'No especificado'}
`
    : '';

  switch (request.mode) {
    case 'name':
      return `${systemContext}

==== TAREA ESPECÍFICA ====
${userContext}
Generá 3 sugerencias de nombres para un proceso del Sistema de Gestión de Calidad.
${request.context?.rubro ? `El proceso debe ser relevante para el rubro: ${request.context.rubro}` : ''}

Respondé SOLO en formato JSON válido con esta estructura exacta:
{
  "nameOptions": [
    {"title": "Nombre del proceso 1", "reason": "Justificación breve de 1 línea"},
    {"title": "Nombre del proceso 2", "reason": "Justificación breve de 1 línea"},
    {"title": "Nombre del proceso 3", "reason": "Justificación breve de 1 línea"}
  ]
}

Los nombres deben ser formales, claros y orientados a ISO 9001.
IMPORTANTE: No repitas procesos que ya existen en la organización.`;

    case 'full':
      return `${systemContext}

==== TAREA ESPECÍFICA ====
Generá la definición completa para el proceso "${request.processName || 'Sin nombre'}".
Categoría ISO: ${categoryLabel}
${userContext}

Respondé SOLO en formato JSON válido con esta estructura:
{
  "descripcion": "Descripción detallada del proceso (2-3 párrafos)",
  "objetivo": "Objetivo claro y medible del proceso",
  "alcance": "Alcance: desde qué punto hasta qué punto, áreas incluidas/excluidas",
  "entradas": ["Entrada 1", "Entrada 2", "..."],
  "salidas": ["Salida 1", "Salida 2", "..."],
  "funciones": ["Función/Rol 1", "Función/Rol 2", "..."],
  "registros": ["Registro/Evidencia 1", "Registro/Evidencia 2", "..."],
  "indicadores": ["KPI 1 con meta sugerida", "KPI 2 con meta sugerida"]
}

Redacción formal, clara, orientada a ISO 9001. Si falta información, marcar con "[COMPLETAR]".`;

    case 'section':
      const sectionPrompts: Record<string, string> = {
        descripcion: `Generá una descripción detallada (2-3 párrafos) para el proceso "${request.processName}".`,
        objetivo: `Generá un objetivo claro y medible para el proceso "${request.processName}".`,
        alcance: `Definí el alcance para el proceso "${request.processName}": punto de inicio, punto final, áreas incluidas y excluidas.`,
        funciones: `Listá las funciones/roles/áreas que deben estar involucradas en el proceso "${request.processName}".`,
        entradas_salidas: `Listá las entradas y salidas esperadas del proceso "${request.processName}".`,
      };

      return `${systemContext}

==== TAREA ESPECÍFICA ====
${userContext}
${sectionPrompts[request.section || 'descripcion']}

Categoría: ${categoryLabel}

Respondé en texto plano, redacción formal y clara.`;

    case 'sipoc':
      return `${systemContext}

==== TAREA ESPECÍFICA ====
Generá la estructura SIPOC completa para el proceso "${request.processName || 'Sin nombre'}".
Categoría ISO: ${categoryLabel}
${userContext}

Respondé SOLO en formato JSON válido con esta estructura:
{
  "inputs": [
    {"description": "Qué entra (Input)", "supplier": "Quién provee (Proveedor)", "validation_criteria": "Requisitos de entrada"}
  ],
  "activities": [
    {"name": "Nombre corto actividad", "description": "Detalle paso a paso", "responsible_position_id": "Puesto responsable (texto libre o dejar vacío)"}
  ],
  "outputs": [
    {"description": "Qué sale (Output)", "customer": "Quién recibe (Cliente)", "quality_criteria": "Criterios de aceptación"}
  ],
  "controls": [
    {"description": "Qué se controla", "type": "review", "frequency": "Frecuencia (ej: Mensual, Por lote)", "responsible_position_id": "Responsable"}
  ],
  "risks": [
    {"description": "Descripción del riesgo", "severity": "baja", "probability": "baja", "detection": "media"}
  ]
}

IMPORTANTE: 
- "severity", "probability", "detection" SOLO pueden ser: "baja", "media", "alta".
- "type" en controls SOLO: "indicator", "checklist", "inspection", "review".
- Generá al menos 3-5 actividades secuenciales.
- Redacción formal, clara, orientada a ISO 9001.`;

    default:
      return systemContext;
  }
}

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body: ProcessAISuggestionRequest = await request.json();

    // Validar request
    if (!body.mode) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el campo "mode"' },
        { status: 400 }
      );
    }

    if (body.mode !== 'name' && !body.processName) {
      return NextResponse.json(
        { success: false, error: 'Se requiere "processName" para este modo' },
        { status: 400 }
      );
    }

    // OBLIGATORIO: organizationId
    const orgId = auth.organizationId || body.context?.organizationId;
    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Falta organizationId',
          message:
            'Se requiere identificar la organización para usar el asistente IA.',
          hint: 'Verificá que estés logueado correctamente.',
        },
        { status: 400 }
      );
    }

    // Obtener contexto de implementación
    let systemContext = '';
    let implementationContext = null;

    try {
      implementationContext = await getImplementationContext(orgId);

      // GUARDRAIL: Validar que puede sugerir procesos
      if (
        body.mode === 'full' ||
        body.mode === 'section' ||
        body.mode === 'sipoc'
      ) {
        const validation = validateAIAction(
          implementationContext,
          'suggest_process'
        );
        if (!validation.allowed) {
          return NextResponse.json({
            success: false,
            error: validation.message,
            stage: implementationContext.implementation_stage,
            hint: 'Completá primero las etapas anteriores del SGC.',
          });
        }
      }

      // Generar prompt con contexto real
      systemContext = getProcessSuggestionPrompt(implementationContext);
    } catch (ctxError) {
      console.warn('Error getting implementation context:', ctxError);
      // Continuar sin contexto completo
    }

    // Si no hay contexto de organización, usar prompt básico
    if (!systemContext) {
      systemContext = `Sos Don Cándido IA, experto en ISO 9001:2015.
Tu objetivo es ayudar a definir procesos de forma práctica y clara.
Rubro: ${body.context?.rubro || 'General'}
Tamaño: ${body.context?.tamanioEmpresa || 'No especificado'}`;
    }

    // Construir prompt completo
    const prompt = buildPrompt(body, systemContext);

    // Llamar a la API de chat usando URL relativa (más confiable)
    const chatResponse = await fetch(
      new URL('/api/chat', request.url).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      }
    );

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Error en chat API:', errorText);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al comunicarse con el servicio de IA',
          details:
            process.env.NODE_ENV === 'development' ? errorText : undefined,
        },
        { status: 500 }
      );
    }

    const chatData = await chatResponse.json();
    const content = chatData.content || chatData.message || chatData.text || '';

    // Parsear respuesta según el modo
    let suggestions: Record<string, unknown> = {};

    if (body.mode === 'name' || body.mode === 'full' || body.mode === 'sipoc') {
      // Intentar parsear como JSON
      try {
        // Buscar el JSON en la respuesta (puede venir con texto adicional)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          suggestions = { descripcion: content };
        }
      } catch {
        // Si no es JSON válido, devolver como texto
        suggestions = { descripcion: content };
      }
    } else {
      // Modo section: devolver como texto
      suggestions = { [body.section || 'descripcion']: content };
    }

    return NextResponse.json({
      success: true,
      suggestions,
      mode: body.mode,
      implementationStage: implementationContext?.implementation_stage,
    });
  } catch (error) {
    console.error('Error en /api/ai/process-suggestions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
});
