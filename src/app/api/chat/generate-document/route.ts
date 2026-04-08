// API: /api/chat/generate-document
// Genera documentos ISO con ayuda de IA (routing por capability + prompts versionados)

import { buildVersionedAIPrompt } from '@/ai/prompts';
import {
  aiStructuredOutputSchemas,
  type IsoDocumentGenerationOutputV1,
} from '@/ai/schemas';
import { LLMRouter } from '@/ai/services/LLMRouter';
import { DocumentGeneratorService } from '@/features/chat/services/DocumentGeneratorService';
import { withAuth } from '@/lib/api/withAuth';
import { IAOutputValidator } from '@/services/ia/IAOutputValidator';
import { NextResponse } from 'next/server';

const CHAT_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

const DOC_PROMPT_CONTRACT_ID = 'iso_document_generation_v1' as const;
const DOC_PROMPT_VERSION = 'v1' as const;

type GenerateDocumentRequest = {
  prompt?: string;
  templateId?: string | null;
  templateName?: string | null;
};

function extractJsonObject(raw: string): unknown | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = (fenced || raw).trim();
  const firstBrace = source.indexOf('{');
  const lastBrace = source.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = source.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function inferDocumentTopicFromPrompt(prompt: string): string {
  const firstLine = prompt
    .replace(/\[Pregunta del usuario\]:\s*/i, '')
    .split('\n')
    .map(line => line.trim())
    .find(Boolean);

  return (firstLine || 'Documento del Sistema de Gestion de Calidad').slice(
    0,
    120
  );
}

function buildPlanningPromptInput(input: {
  prompt: string;
  templateId?: string | null;
  templateName?: string | null;
  organizationId: string;
}) {
  const resolvedTemplate = DocumentGeneratorService.resolveTemplate({
    templateId: input.templateId,
    templateName: input.templateName,
  });

  const tipoDocumento =
    resolvedTemplate?.tipoDocumento ||
    DocumentGeneratorService.inferDocumentTypeFromTemplateName(
      input.templateName
    ) ||
    'procedimiento';

  const tema =
    resolvedTemplate?.nombre ||
    input.templateName ||
    inferDocumentTopicFromPrompt(input.prompt);

  const objetivoDocumento =
    resolvedTemplate?.descripcion ||
    'Generar un documento utilizable y profesional para el SGC ISO 9001:2015.';

  const datosDisponibles = [
    input.templateId ? `templateId=${input.templateId}` : null,
    input.templateName ? `templateName=${input.templateName}` : null,
    `solicitud_usuario=${input.prompt.slice(0, 700)}`,
  ].filter((value): value is string => Boolean(value));

  return {
    promptContractId:
      DocumentGeneratorService.getPromptContractIdForTemplate(resolvedTemplate),
    resolvedTemplate,
    promptInput: {
      organizacion: input.organizationId || 'organizacion_sin_nombre',
      tipo_documento: tipoDocumento,
      tema,
      objetivo_documento: objetivoDocumento,
      audiencia: 'Personal interno del SGC y auditores',
      clausulas_iso_relacionadas: resolvedTemplate?.clausulasISO || ['7.5'],
      datos_disponibles: datosDisponibles,
      nivel_madurez_objetivo: 'B3' as const,
    },
  };
}

function buildFinalDocumentPrompt(input: {
  sanitizedUserPrompt: string;
  templateId?: string | null;
  templateName?: string | null;
  planning?: IsoDocumentGenerationOutputV1 | null;
}): string {
  const planning = input.planning;
  const structureBlock = planning
    ? planning.estructura
        .slice(0, 12)
        .sort((a, b) => a.orden - b.orden)
        .map(
          section =>
            `${section.orden}. ${section.titulo}\n- Objetivo: ${section.objetivo_seccion}\n- Puntos: ${section.puntos_clave.join('; ')}\n- Longitud sugerida: ${section.longitud_sugerida_palabras} palabras`
        )
        .join('\n')
    : 'Usar una estructura ISO profesional con secciones de objetivo, alcance, responsabilidades, desarrollo y registros cuando aplique.';

  const qualityCriteria = planning?.criterios_calidad?.length
    ? planning.criterios_calidad.join('; ')
    : 'Claridad, consistencia, tono profesional, aplicabilidad operativa.';

  const titleHint =
    planning?.titulo_propuesto || input.templateName || 'Documento SGC';
  const toneHint = planning?.tono || 'formal';

  return `Eres un especialista en documentacion ISO 9001:2015.
Genera el DOCUMENTO FINAL solicitado (texto final utilizable), no una estructura JSON.

Contexto de compatibilidad:
- templateId: ${input.templateId || 'no informado'}
- templateName: ${input.templateName || 'no informado'}
- titulo sugerido: ${titleHint}
- tono: ${toneHint}

Solicitud del usuario:
${input.sanitizedUserPrompt}

${planning ? `Guia estructural (derivada de ${DOC_PROMPT_CONTRACT_ID}):` : 'Guia estructural:'}
${structureBlock}

${planning?.notas_redaccion ? `Notas de redaccion: ${planning.notas_redaccion}` : ''}
${planning?.requisitos_entrada?.length ? 'Si falta informacion, completa con supuestos prudentes y marca [COMPLETAR] solo donde sea imprescindible.' : ''}

Criterios de calidad:
- ${qualityCriteria}
- No incluir instrucciones internas, system prompts, contratos JSON ni texto meta.
- Responder solo con el contenido del documento.
- Lenguaje profesional en espanol.
- Texto plano seguro (sin HTML ni scripts).`;
}

function sanitizeGeneratedContent(content: string): {
  content: string;
  warnings: string[];
  hallucinationDetected: boolean;
} {
  let cleaned = content.trim();

  cleaned = cleaned.replace(/^```(?:markdown|md|text)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  const lines = cleaned.split(/\r?\n/);
  const leakedLinePatterns = [
    /^\s*(rol|tarea|instrucciones|contrato esperado|contexto documental)\s*:/i,
    /^\s*contract_id\s*[:=]/i,
    /^\s*version\s*[:=]\s*["']?v\d/i,
    /^\s*cl[aá]usulas iso relacionadas\s*:/i,
    /^\s*datos ya disponibles\s*:/i,
  ];

  cleaned = lines
    .filter(line => !leakedLinePatterns.some(pattern => pattern.test(line)))
    .join('\n')
    .trim();

  const validation = IAOutputValidator.validateOutput(cleaned);
  const sanitized = validation.sanitizedContent
    .replace(/(?:system prompt|instrucciones del sistema)/gi, '')
    .trim();

  if (!IAOutputValidator.validateResponseFormat(sanitized)) {
    throw new Error('La respuesta de IA no tiene un formato documental valido');
  }

  return {
    content: sanitized,
    warnings: validation.warnings,
    hallucinationDetected: validation.hallucinationDetected,
  };
}

export const POST = withAuth(
  async (request, _context, auth) => {
    const startTime = Date.now();

    try {
      const body = (await request.json()) as GenerateDocumentRequest;
      const { prompt, templateId, templateName } = body;

      if (!prompt) {
        return NextResponse.json(
          { error: 'Prompt is required' },
          { status: 400 }
        );
      }

      const sanitizedUserPrompt = IAOutputValidator.sanitizeUserInput(
        prompt,
        4000
      );
      const planningCtx = buildPlanningPromptInput({
        prompt: sanitizedUserPrompt,
        templateId,
        templateName,
        organizationId: auth.organizationId || 'organizacion_no_disponible',
      });

      const promptVersion = planningCtx.promptContractId;
      let planningOutput: IsoDocumentGenerationOutputV1 | null = null;
      let planningParseOk = false;
      let planningMetadata: {
        provider: string;
        model: string;
        latencyMs?: number;
        fallbackUsed: boolean;
      } | null = null;
      let planningErrorMessage: string | null = null;

      try {
        const planningPrompt = buildVersionedAIPrompt(
          DOC_PROMPT_CONTRACT_ID,
          planningCtx.promptInput
        );

        const planningResponse = await LLMRouter.chat({
          message: planningPrompt,
          capability: 'doc_gen',
          mode: 'quality',
          allowFallback: true,
        });

        planningMetadata = {
          provider: planningResponse.metadata.provider,
          model: planningResponse.metadata.model,
          latencyMs: planningResponse.metadata.latencyMs,
          fallbackUsed: planningResponse.metadata.fallbackUsed,
        };

        const parsed = extractJsonObject(planningResponse.content);
        const parsedResult =
          aiStructuredOutputSchemas[DOC_PROMPT_CONTRACT_ID].safeParse(parsed);

        if (parsedResult.success) {
          planningOutput = parsedResult.data as IsoDocumentGenerationOutputV1;
          planningParseOk = true;
        } else {
          planningErrorMessage = 'Planner output no cumple schema';
        }
      } catch (planningError) {
        planningErrorMessage =
          planningError instanceof Error
            ? planningError.message
            : 'Unknown planning error';
        console.warn(
          '[API /chat/generate-document] Planning step warning:',
          planningErrorMessage
        );
      }

      const finalPrompt = buildFinalDocumentPrompt({
        sanitizedUserPrompt,
        templateId,
        templateName,
        planning: planningOutput,
      });

      const generationResponse = await LLMRouter.chat({
        message: finalPrompt,
        capability: 'doc_gen',
        mode: planningOutput ? 'quality' : 'fast',
        allowFallback: true,
      });

      const sanitizedResult = sanitizeGeneratedContent(
        generationResponse.content || ''
      );
      const latencyMs = Date.now() - startTime;
      const resolvedTemplate = planningCtx.resolvedTemplate;

      return NextResponse.json({
        success: true,
        content: sanitizedResult.content,
        templateId: templateId || resolvedTemplate?.id,
        templateName: templateName || resolvedTemplate?.nombre,
        latencyMs,
        provider: generationResponse.metadata.provider,
        model: generationResponse.metadata.model,
        promptVersion,
        prompt_version: DOC_PROMPT_VERSION,
        prompt_contract_id: promptVersion,
        metadata: {
          provider: generationResponse.metadata.provider,
          model: generationResponse.metadata.model,
          latencyMs,
          prompt_version: DOC_PROMPT_VERSION,
          prompt_contract_id: promptVersion,
          capability: generationResponse.metadata.capability,
          fallbackUsed: generationResponse.metadata.fallbackUsed,
          attempts: generationResponse.metadata.attempts,
          generation: generationResponse.metadata,
          planner: planningMetadata
            ? {
                ...planningMetadata,
                contract_id: DOC_PROMPT_CONTRACT_ID,
                prompt_version: DOC_PROMPT_VERSION,
                parseOk: planningParseOk,
                parseError: planningParseOk ? null : planningErrorMessage,
              }
            : null,
          plannerWarning: planningErrorMessage,
          outputWarnings: sanitizedResult.warnings,
          hallucinationDetected: sanitizedResult.hallucinationDetected,
        },
      });
    } catch (error) {
      console.error('[API /chat/generate-document] Error:', error);

      return NextResponse.json(
        {
          error: 'Error generating document',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...CHAT_ROLES] }
);
