/**
 * API Endpoint: POST /api/ai/assist
 * Genera asistencia IA para diferentes modulos del sistema.
 *
 * Actualizado (Febrero 2026):
 * - Integracion directa con LLMRouter (sin /api/chat)
 * - Seleccion capability/schema por modulo/tipo
 * - Validacion/fallback y manejo robusto de timeout/errores
 */

import { LLMRouter } from '@/ai/services/LLMRouter';
import type { AIContractId } from '@/ai/types';
import type { LLMCapability, LLMMode } from '@/ai/types/LLMRouterTypes';
import { parseStructuredOutputByContract } from '@/ai/utils/structuredOutputParser';
import {
  getImplementationContext,
  type ImplementationContext,
} from '@/lib/ai/implementationContext';
import { buildSystemPrompt } from '@/lib/ai/systemPrompt';
import { withAuth } from '@/lib/api/withAuth';
import {
  getContextDocsForScreen,
  getDocSummariesForModule,
} from '@/lib/docs/ai-context';
import { IAOutputValidator } from '@/services/ia/IAOutputValidator';
import type { DocModule } from '@/types/docs';
import { NextResponse } from 'next/server';

interface AIAssistContext {
  modulo: string;
  tipo: string;
  campo?: string;
  datos?: Record<string, unknown>;
  organizationId?: string;
  pathname?: string;
  screen?: string;
}

interface AIAssistRequest {
  context: AIAssistContext;
  action?: 'generate' | 'suggest' | 'analyze';
}

interface AssistRoutingSpec {
  capability: LLMCapability;
  mode: LLMMode;
  contractId?: AIContractId;
  legacy: boolean;
  reason: string;
}

const LLM_TIMEOUT_MS = 30_000;
const SUPPORTED_DOC_MODULES = new Set<DocModule>([
  'mi-panel',
  'rrhh',
  'procesos',
  'documentos',
  'crm',
  'auditorias',
  'hallazgos',
  'acciones',
  'don-candido',
]);

function resolveDocModule(module?: string): DocModule | null {
  const normalizedModule = String(module || '')
    .trim()
    .toLocaleLowerCase('es') as DocModule;

  return SUPPORTED_DOC_MODULES.has(normalizedModule) ? normalizedModule : null;
}

function getTaskSpecificPrompt(ctx: AIAssistContext): string {
  const tipo = ctx.tipo;
  const datos = ctx.datos || {};

  switch (tipo) {
    case 'procedimiento':
      return `
TAREA ESPECIFICA: Generar contenido de procedimiento ISO 9001.
Modulo: "${ctx.modulo}"
${datos.nombre ? `Nombre del procedimiento: ${String(datos.nombre)}` : ''}
${datos.objetivo ? `Objetivo: ${String(datos.objetivo)}` : ''}

El procedimiento debe incluir:
1. Objetivo
2. Alcance
3. Responsabilidades
4. Descripcion de actividades (paso a paso)
5. Registros asociados

Escribi en espanol, de forma clara y profesional.
`.trim();

    case 'proceso':
      return `
TAREA ESPECIFICA: Generar descripcion detallada de proceso ISO 9001 (enfoque SIPOC + riesgos).
Modulo: "${ctx.modulo}"
${datos.nombre ? `Nombre del proceso: ${String(datos.nombre)}` : ''}
${datos.objetivo ? `Objetivo: ${String(datos.objetivo)}` : ''}
${datos.alcance ? `Alcance: ${String(datos.alcance)}` : ''}

Estructura obligatoria sugerida:
- Entradas
- Actividades puntuales (paso a paso)
- Salidas
- Controles / KPIs
- Riesgos

Escribi en espanol neutro, profesional y directo.
`.trim();

    case 'competencias':
      return `
TAREA ESPECIFICA: Sugerir competencias para puesto.
Puesto: "${String(datos.puesto || datos.nombre || 'no especificado')}"
${datos.departamento ? `Departamento: ${String(datos.departamento)}` : ''}

Genera una lista de:
1. Competencias tecnicas (minimo 3)
2. Competencias blandas (minimo 3)
3. Formacion requerida
4. Experiencia sugerida

Escribi en espanol, de forma concisa.
`.trim();

    case 'causa_raiz':
      return `
TAREA ESPECIFICA: Analisis de causa raiz.
Problema/hallazgo: "${String(
        datos.problema || datos.descripcion || datos.titulo || 'No especificado'
      )}"
${datos.tipo ? `Tipo de accion: ${String(datos.tipo)}` : ''}

Aplica tecnica de 5 Por Ques y proporciona:
1. Analisis de causa raiz
2. Causas principales
3. Acciones correctivas sugeridas
4. Acciones preventivas sugeridas

Escribi en espanol, de forma estructurada.
`.trim();

    case 'checklist':
      return `
TAREA ESPECIFICA: Generar checklist de auditoria.
Modulo: "${ctx.modulo}"
${datos.clausula ? `Clausula ISO: ${String(datos.clausula)}` : ''}

El checklist debe incluir:
1. Puntos a verificar (minimo 10)
2. Evidencias esperadas
3. Criterio de cumplimiento

Formato: lista de verificacion con [ ] para marcar.
Escribi en espanol.
`.trim();

    default:
      return `
TAREA ESPECIFICA: Generar contenido para "${ctx.tipo}" en modulo "${ctx.modulo}".
${datos.nombre ? `Nombre: ${String(datos.nombre)}` : ''}
${datos.descripcion ? `Descripcion: ${String(datos.descripcion)}` : ''}

Escribi en espanol, de forma clara y profesional.
`.trim();
  }
}

function normalizeKey(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function resolveAssistRouting(
  context: AIAssistContext,
  action: NonNullable<AIAssistRequest['action']>
): AssistRoutingSpec {
  const modulo = normalizeKey(context.modulo);
  const tipo = normalizeKey(context.tipo);

  const wantsDocument =
    ['procedimiento', 'proceso', 'manual', 'instructivo', 'formato'].includes(
      tipo
    ) || /(document|procedim|proceso|manual|sgc)/.test(modulo);
  if (wantsDocument) {
    return {
      capability: 'doc_gen',
      mode: 'quality',
      contractId: 'iso_document_generation_v1',
      legacy: false,
      reason: 'document_generation',
    };
  }

  const wantsGapEval =
    ['gap', 'brecha', 'evaluacion_brecha', 'diagnostico_gap'].includes(tipo) ||
    /(gap|brecha|diagnost)/.test(modulo);
  if (wantsGapEval) {
    return {
      capability: 'audit_eval',
      mode: 'quality',
      contractId: 'iso_gap_evaluation_v1',
      legacy: false,
      reason: 'gap_evaluation',
    };
  }

  const wantsIndicatorAnalysis =
    ['indicador', 'analisis_indicador', 'kpi', 'metricas'].includes(tipo) ||
    /(indicador|kpi|metric)/.test(modulo);
  if (wantsIndicatorAnalysis) {
    return {
      capability: 'audit_eval',
      mode: 'quality',
      contractId: 'iso_indicator_analysis_v1',
      legacy: false,
      reason: 'indicator_analysis',
    };
  }

  const wantsActionRecommendation =
    [
      'causa_raiz',
      'accion_correctiva',
      'accion_preventiva',
      'plan_accion',
      'recomendacion_accion',
    ].includes(tipo) || /(mejora|hallazgo|accion)/.test(modulo);
  if (wantsActionRecommendation) {
    return {
      capability: 'audit_eval',
      mode: 'quality',
      contractId: 'iso_action_recommendation_v1',
      legacy: false,
      reason: 'action_recommendation',
    };
  }

  if (tipo === 'competencias' || /(rrhh|rh|talento|personal)/.test(modulo)) {
    return {
      capability: 'agent_ops',
      mode: 'fast',
      legacy: true,
      reason: 'rrhh_legacy_text',
    };
  }

  if (tipo === 'checklist') {
    return {
      capability: 'audit_eval',
      mode: action === 'analyze' ? 'quality' : 'fast',
      legacy: true,
      reason: 'checklist_legacy_text',
    };
  }

  return {
    capability: 'chat_general',
    mode: action === 'analyze' ? 'quality' : 'fast',
    legacy: true,
    reason: 'default_general',
  };
}

function buildStructuredOutputInstruction(contractId?: AIContractId): string {
  if (!contractId) return '';

  return [
    'FORMATO DE SALIDA OBLIGATORIO:',
    '- Responde SOLO con JSON valido (sin markdown, sin texto adicional).',
    `- El campo \"contract_id\" debe ser \"${contractId}\".`,
    '- Si un dato no esta disponible, usa null, [] o "" segun corresponda.',
    '- No inventes datos de la organizacion; explicita incertidumbre dentro del JSON.',
  ].join('\n');
}

function buildUserMessage(
  context: AIAssistContext,
  action: NonNullable<AIAssistRequest['action']>
): string {
  const datos = context.datos ? JSON.stringify(context.datos, null, 2) : '{}';

  return [
    `Accion solicitada: ${action}`,
    `Modulo: ${context.modulo}`,
    `Tipo: ${context.tipo}`,
    context.campo ? `Campo objetivo: ${context.campo}` : '',
    `Datos de entrada (JSON):\n${datos}`,
    'Responde en espanol y prioriza utilidad practica.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function runLLMWithTimeout(input: {
  message: string;
  systemPrompt: string;
  capability: LLMCapability;
  mode: LLMMode;
  timeoutMs: number;
}) {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      LLMRouter.chat({
        message: input.message,
        systemPrompt: input.systemPrompt,
        capability: input.capability,
        mode: input.mode,
      }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          const timeoutError = new Error('LLM request timeout') as Error & {
            code?: string;
          };
          timeoutError.code = 'LLM_TIMEOUT';
          reject(timeoutError);
        }, input.timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body = (await request.json()) as AIAssistRequest;
    const { context, action = 'generate' } = body;

    if (
      !context ||
      typeof context !== 'object' ||
      typeof context.modulo !== 'string' ||
      typeof context.tipo !== 'string' ||
      !context.modulo.trim() ||
      !context.tipo.trim()
    ) {
      return NextResponse.json(
        { error: 'Contexto incompleto. Se requiere modulo y tipo.' },
        { status: 400 }
      );
    }

    if (!['generate', 'suggest', 'analyze'].includes(action)) {
      return NextResponse.json(
        { error: 'Accion invalida. Debe ser generate, suggest o analyze.' },
        { status: 400 }
      );
    }

    const organizationId = auth.organizationId || context.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        {
          error: 'Falta organizationId',
          message:
            'Se requiere identificar la organizacion para usar el asistente IA.',
          hint: 'Verifica que estes logueado correctamente.',
        },
        { status: 400 }
      );
    }
    context.organizationId = organizationId;

    const routing = resolveAssistRouting(context, action);
    const taskPrompt = getTaskSpecificPrompt(context);
    const docModule = resolveDocModule(context.modulo);
    const docsContext =
      (context.pathname || context.screen
        ? getContextDocsForScreen(
            context.pathname || context.screen || '',
            auth.role
          )
        : '') || (docModule ? getDocSummariesForModule(docModule) : '');
    const structuredInstruction = buildStructuredOutputInstruction(
      routing.contractId
    );

    let implementationContext: ImplementationContext | null = null;
    let systemPrompt = '';

    try {
      implementationContext = await getImplementationContext(organizationId);
      systemPrompt = buildSystemPrompt({
        context: implementationContext,
        taskType: 'general',
        additionalContext: [
          taskPrompt,
          docsContext
            ? `DOCUMENTACION FUNCIONAL RELEVANTE:\n${docsContext}\n\nUsa esta documentacion como referencia prioritaria para responder sobre el uso del sistema.`
            : '',
          structuredInstruction,
        ]
          .filter(Boolean)
          .join('\n\n'),
      });
    } catch (ctxError) {
      console.warn('Error getting implementation context:', ctxError);
      const basicIdentity = [
        'Sos Don Candido IA, experto en ISO 9001:2015.',
        'Tu objetivo es ayudar de forma practica y clara.',
        'Escribi en espanol latinoamericano.',
      ].join('\n');

      systemPrompt = [
        basicIdentity,
        taskPrompt,
        docsContext
          ? `DOCUMENTACION FUNCIONAL RELEVANTE:\n${docsContext}\n\nUsa esta documentacion como referencia prioritaria para responder sobre el uso del sistema.`
          : '',
        structuredInstruction,
      ]
        .filter(Boolean)
        .join('\n\n');
    }

    try {
      const llmResponse = await runLLMWithTimeout({
        message: buildUserMessage(context, action),
        systemPrompt,
        capability: routing.capability,
        mode: routing.mode,
        timeoutMs: LLM_TIMEOUT_MS,
      });

      const rawContent = (llmResponse.content || '').trim();
      const textValidation = IAOutputValidator.validateOutput(rawContent);
      let content = textValidation.sanitizedContent?.trim() || rawContent;
      let responseFormat: 'text' | 'json' = 'text';
      let structuredData: unknown;
      let structuredParse:
        | { ok: true; contractId: AIContractId }
        | { ok: false; contractId: AIContractId; code: string; message: string }
        | undefined;

      if (routing.contractId) {
        const parsed = parseStructuredOutputByContract(
          routing.contractId,
          rawContent
        );

        if (parsed.ok) {
          responseFormat = 'json';
          structuredData = parsed.data;
          content = parsed.jsonText || content;
          structuredParse = { ok: true, contractId: routing.contractId };
        } else {
          structuredParse = {
            ok: false,
            contractId: routing.contractId,
            code: parsed.code,
            message: parsed.message,
          };
        }
      }

      if (
        !content ||
        (responseFormat === 'text' &&
          !IAOutputValidator.validateResponseFormat(content))
      ) {
        content =
          'No se pudo generar una respuesta utilizable en este intento. Intenta de nuevo con mas contexto.';
      }

      return NextResponse.json({
        success: true,
        content,
        responseFormat,
        structuredData,
        routing: {
          capability: routing.capability,
          mode: routing.mode,
          legacy: routing.legacy,
          reason: routing.reason,
          provider: llmResponse.metadata.provider,
          model: llmResponse.metadata.model,
          fallbackUsed: llmResponse.metadata.fallbackUsed,
          latencyMs: llmResponse.metadata.latencyMs,
          attempts: llmResponse.metadata.attempts,
        },
        validation: {
          warnings: textValidation.warnings,
          hallucinationDetected: textValidation.hallucinationDetected,
          sanitized: content !== rawContent,
          structuredParse,
        },
        context: {
          modulo: context.modulo,
          tipo: context.tipo,
          action,
          organizationId,
        },
        implementationStage: implementationContext?.implementation_stage,
        isoStatus: implementationContext?.iso_status_summary,
      });
    } catch (llmError) {
      const err = llmError as Error & { code?: string; name?: string };

      if (err.code === 'LLM_TIMEOUT' || err.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'Tiempo de espera agotado',
            message:
              'El asistente esta tardando mas de lo esperado. Intenta de nuevo.',
          },
          { status: 504 }
        );
      }

      console.error('Error en LLMRouter /api/ai/assist:', llmError);
      return NextResponse.json(
        {
          error: 'El asistente no pudo procesar tu solicitud',
          message: 'Intenta de nuevo en unos segundos.',
          details:
            process.env.NODE_ENV === 'development' ? err.message : undefined,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error en /api/ai/assist:', error);
    return NextResponse.json(
      {
        error: 'Ocurrio un problema inesperado',
        message:
          'El equipo tecnico fue notificado. Intenta de nuevo mas tarde.',
        details:
          process.env.NODE_ENV === 'development'
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
});
