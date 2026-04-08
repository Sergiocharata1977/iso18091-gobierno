// Ola 2 — Motor de análisis estructurado
// Paso 1: scoring + norm gaps determinísticos (sin IA)
// Paso 2: narrative generada por LLM (LLMRouter con fallback Groq)
// Si la IA falla → devuelve resultados determinísticos parciales (no rompe el flujo)

import { LLMRouter } from '@/ai/services/LLMRouter';
import { parseStructuredOutput } from '@/ai/utils/structuredOutputParser';
import { StrategicAnalysisConfidenceService } from '@/services/strategic-analysis/StrategicAnalysisConfidenceService';
import type { ExecutiveAlert } from '@/types/executive-alerts';
import type { StrategicReadingOrientation } from '@/types/strategic-analysis';
import type {
  StrategicAnalysisContext,
  StrategicDimension,
  StrategicFinding,
  StrategicNormGap,
  StrategicPriority,
  StrategicSuggestedAction,
} from '@/types/strategic-analysis';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schema para la salida estructurada del LLM
// ---------------------------------------------------------------------------

const aiFindingSchema = z.object({
  id: z.string(),
  category: z.enum(['strategic', 'operational', 'alert', 'opportunity']),
  dimension: z.string(),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  titulo: z.string(),
  descripcion: z.string(),
  evidencia: z.array(z.string()).default([]),
  affectedAreas: z.array(z.string()).optional(),
});

const aiPrioritySchema = z.object({
  id: z.string(),
  horizonte: z.enum(['30d', '60d', '90d']),
  titulo: z.string(),
  descripcion: z.string(),
  impacto: z.enum(['low', 'medium', 'high']),
  urgencia: z.enum(['low', 'medium', 'high']),
  ownerSuggested: z.string().optional(),
  relatedDimensions: z.array(z.string()).default([]),
});

const aiOutputSchema = z.object({
  executive_summary: z.string(),
  strategic_findings: z.array(aiFindingSchema).default([]),
  operational_findings: z.array(aiFindingSchema).default([]),
  risks_alerts: z.array(aiFindingSchema).default([]),
  opportunities: z.array(aiFindingSchema).default([]),
  priorities: z.array(aiPrioritySchema).default([]),
});

type AIOutput = z.infer<typeof aiOutputSchema>;

// ---------------------------------------------------------------------------
// Resultado del análisis completo
// ---------------------------------------------------------------------------

export interface StrategicAnalysisResult {
  global_score: number;
  dimension_scores: Array<{ dimension: StrategicDimension; score: number }>;
  norm_gaps: StrategicNormGap[];
  executive_summary: string;
  rendered_markdown: string;
  strategic_findings: StrategicFinding[];
  operational_findings: StrategicFinding[];
  risks_alerts: StrategicFinding[];
  opportunities: StrategicFinding[];
  priorities: StrategicPriority[];
  suggested_actions: StrategicSuggestedAction[];
  ai_metadata: {
    provider?: string;
    model?: string;
    tokensUsed?: number;
    promptVersion: string;
    aiCallSucceeded: boolean;
  };
  // Índice de confianza — calculado por StrategicAnalysisConfidenceService
  context_completeness_pct?: number;
  confidence_level?: 'alto' | 'medio' | 'bajo';
  missing_sources?: string[];
  dimension_coverage?: Record<string, string[]>;
  executive_alerts?: ExecutiveAlert[];
  agentic_case_ids?: string[];
}

function buildSuggestedActions(
  ctx: StrategicAnalysisContext,
  normGaps: StrategicNormGap[],
  priorities: StrategicPriority[]
): StrategicSuggestedAction[] {
  const actions: StrategicSuggestedAction[] = [];

  if ((ctx.evidenceSummary.auditsOverdue ?? 0) > 0) {
    actions.push({
      id: 'sa-audit-19011',
      actionType: 'CREATE',
      entity: 'audit',
      title: 'Programar auditoria interna focalizada',
      description:
        'Crear auditoria interna para validar el cierre de desviaciones en procesos con vencimientos.',
      payload: {
        titulo: 'Auditoria interna focalizada por desvio estrategico',
        estado: 'pendiente',
        referencia_norma: 'ISO 19011',
      },
      requiresConfirmation: true,
      safeToAutoPrepare: true,
      rationale:
        'Existe backlog de auditorias vencidas; conviene una auditoria focalizada para recuperar control del programa.',
    });
  }

  const topNormGaps = normGaps.slice(0, 3);
  topNormGaps.forEach(gap => {
    actions.push({
      id: `sa-gap-${gap.id}`,
      actionType: 'CREATE',
      entity: 'action',
      title: `Plan correctivo para clausula ${gap.clausula}`,
      description: gap.recomendacion,
      payload: {
        titulo: gap.titulo,
        descripcion: gap.descripcion,
        estado: 'pendiente',
        prioridad:
          gap.severidad === 'critical' || gap.severidad === 'high'
            ? 'alta'
            : 'media',
      },
      requiresConfirmation: true,
      safeToAutoPrepare: true,
      rationale: `Brecha normativa detectada en ${gap.clausula} (${gap.norma}).`,
    });
  });

  const topPriorities = priorities.slice(0, 2);
  topPriorities.forEach(priority => {
    actions.push({
      id: `sa-priority-${priority.id}`,
      actionType: 'CREATE',
      entity: 'action',
      title: priority.titulo,
      description: priority.descripcion,
      payload: {
        titulo: priority.titulo,
        descripcion: priority.descripcion,
        horizonte: priority.horizonte,
        impacto: priority.impacto,
        urgencia: priority.urgencia,
      },
      requiresConfirmation: true,
      safeToAutoPrepare: true,
      rationale:
        'Prioridad estrategica convertida en accion ejecutable con confirmacion humana.',
    });
  });

  return actions.slice(0, 6);
}

// ---------------------------------------------------------------------------
// Paso 1 — Scoring determinístico
// ---------------------------------------------------------------------------

function computeGlobalScore(ctx: StrategicAnalysisContext): number {
  const ev = ctx.evidenceSummary;
  let score = 65; // base: tener un SGC activo

  // Bonus por cobertura de procesos
  if ((ev.processesTotal ?? 0) >= 5) score += 5;
  if ((ev.processesTotal ?? 0) >= 10) score += 5;

  // Auditorías: bonus por tener auditorías, penalización por vencidas
  if ((ev.auditsTotal ?? 0) > 0) {
    score += 5;
    const overdueRatio = (ev.auditsOverdue ?? 0) / Math.max(ev.auditsTotal ?? 1, 1);
    score -= overdueRatio * 15;
  }

  // Acciones correctivas vencidas
  if ((ev.actionsOpen ?? 0) > 0) {
    const overdueRatio = (ev.actionsOverdue ?? 0) / Math.max(ev.actionsOpen ?? 1, 1);
    score -= overdueRatio * 20;
  }

  // Hallazgos fuera de SLA
  if ((ev.findingsOpen ?? 0) > 0) {
    const slaRatio = (ev.findingsOverdueSla ?? 0) / Math.max(ev.findingsOpen ?? 1, 1);
    score -= slaRatio * 10;
  }

  // Bonus por objetivos e indicadores definidos
  if ((ev.objectivesTotal ?? 0) > 0) score += 5;
  if ((ev.indicatorsTotal ?? 0) > 0) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeDimensionScores(
  ctx: StrategicAnalysisContext
): Array<{ dimension: StrategicDimension; score: number }> {
  const ev = ctx.evidenceSummary;
  const scores: Array<{ dimension: StrategicDimension; score: number }> = [];

  // Auditorías
  if ((ev.auditsTotal ?? 0) > 0) {
    const overdueRatio = (ev.auditsOverdue ?? 0) / Math.max(ev.auditsTotal ?? 1, 1);
    scores.push({ dimension: 'audits', score: Math.round((1 - overdueRatio) * 100) });
  }

  // Hallazgos y acciones
  const openActions = ev.actionsOpen ?? 0;
  const overdueActions = ev.actionsOverdue ?? 0;
  if (openActions > 0) {
    scores.push({
      dimension: 'findings_actions',
      score: Math.round((1 - overdueActions / Math.max(openActions, 1)) * 100),
    });
  }

  // Procesos
  if ((ev.processesTotal ?? 0) > 0) {
    scores.push({
      dimension: 'processes',
      score: Math.min(100, Math.round((ev.processesTotal ?? 0) * 5 + 50)),
    });
  }

  // KPIs
  const kpiScore =
    (ev.objectivesTotal ?? 0) > 0 && (ev.indicatorsTotal ?? 0) > 0 ? 80 : 40;
  scores.push({ dimension: 'kpis', score: kpiScore });

  return scores;
}

// ---------------------------------------------------------------------------
// Paso 1 — Norm gaps determinísticos
// ---------------------------------------------------------------------------

function detectNormGaps(ctx: StrategicAnalysisContext): StrategicNormGap[] {
  const gaps: StrategicNormGap[] = [];
  const ev = ctx.evidenceSummary;

  if ((ev.actionsOverdue ?? 0) > 0) {
    gaps.push({
      id: 'gap-10-2',
      norma: 'ISO 9001:2015',
      clausula: '10.2',
      severidad: (ev.actionsOverdue ?? 0) > 5 ? 'high' : 'medium',
      titulo: 'Acciones correctivas vencidas sin cierre',
      descripcion: `Existen ${ev.actionsOverdue} acciones correctivas con plazo vencido. Esto evidencia falta de seguimiento del ciclo de mejora.`,
      evidencia: [
        `${ev.actionsOverdue} acciones vencidas sobre ${ev.actionsOpen} abiertas totales`,
      ],
      recomendacion:
        'Revisar, cerrar o reprogramar todas las acciones correctivas vencidas esta semana.',
      sourceDimension: 'findings_actions',
    });
  }

  if ((ev.auditsOverdue ?? 0) > 0) {
    gaps.push({
      id: 'gap-9-2',
      norma: 'ISO 9001:2015',
      clausula: '9.2',
      severidad: 'medium',
      titulo: 'Auditorías internas con instancias vencidas',
      descripcion: `${ev.auditsOverdue} auditorías internas tienen instancias abiertas con plazo vencido.`,
      evidencia: [`${ev.auditsOverdue} de ${ev.auditsTotal} auditorías con incidencias vencidas`],
      recomendacion:
        'Completar las auditorías vencidas o reprogramar según el programa de auditoría vigente.',
      sourceDimension: 'audits',
    });
  }

  if ((ev.findingsOverdueSla ?? 0) > 0) {
    gaps.push({
      id: 'gap-10-1',
      norma: 'ISO 9001:2015',
      clausula: '10.1',
      severidad: 'medium',
      titulo: 'Hallazgos fuera de SLA de tratamiento',
      descripcion: `${ev.findingsOverdueSla} hallazgos superaron el plazo de tratamiento definido.`,
      evidencia: [
        `${ev.findingsOverdueSla} hallazgos fuera de SLA sobre ${ev.findingsOpen} abiertos`,
      ],
      recomendacion:
        'Asignar responsables y fechas límite a todos los hallazgos sin tratamiento activo.',
      sourceDimension: 'findings_actions',
    });
  }

  if ((ev.objectivesTotal ?? 0) === 0) {
    gaps.push({
      id: 'gap-6-2',
      norma: 'ISO 9001:2015',
      clausula: '6.2',
      severidad: 'high',
      titulo: 'Sin objetivos de calidad definidos',
      descripcion:
        'No se registran objetivos de calidad en el sistema. Es un requisito explícito de la norma.',
      evidencia: ['0 objetivos de calidad en el SGC'],
      recomendacion:
        'Definir y registrar al menos un objetivo de calidad por proceso clave.',
      sourceDimension: 'kpis',
    });
  }

  if ((ev.indicatorsTotal ?? 0) === 0) {
    gaps.push({
      id: 'gap-9-1',
      norma: 'ISO 9001:2015',
      clausula: '9.1',
      severidad: 'high',
      titulo: 'Sin indicadores de seguimiento definidos',
      descripcion:
        'No hay indicadores de desempeño registrados. Sin medición no hay evidencia de mejora continua.',
      evidencia: ['0 indicadores de calidad en el SGC'],
      recomendacion:
        'Definir KPIs medibles para los procesos principales y registrar su seguimiento mensual.',
      sourceDimension: 'kpis',
    });
  }

  return gaps;
}

// ---------------------------------------------------------------------------
// Paso 2 — Prompt para el LLM
// ---------------------------------------------------------------------------

function buildAnalysisPrompt(
  ctx: StrategicAnalysisContext,
  orientation: StrategicReadingOrientation,
  normGaps: StrategicNormGap[],
  confidencePct: number,
  confidenceLevel: 'alto' | 'medio' | 'bajo',
  missingSources: string[]
): string {
  const ev = ctx.evidenceSummary;
  const org = ctx.organization;
  const gapsText = normGaps
    .map(g => `- Cláusula ${g.clausula}: ${g.titulo} (${g.severidad})`)
    .join('\n');

  const orientationInstructions: Record<StrategicReadingOrientation, string> = {
    direccion:
      'Foco en riesgo estratégico, tendencias, impacto en la certificación, decisiones de alto nivel y visión de largo plazo.',
    jefatura:
      'Foco en desvíos operativos, backlog de acciones, responsables, procesos con mayor carga y prioridades inmediatas.',
    operativo:
      'Foco en alertas accionables, vencimientos próximos, cuellos de botella y tareas pendientes concretas.',
  };

  const processInfo = ctx.processContext
    ? `\nPROCESO ANALIZADO: ${ctx.processContext.processName ?? 'N/A'} (${ctx.processContext.processCode ?? ''})
- Hallazgos abiertos: ${ctx.processContext.openFindings ?? 0}
- Acciones abiertas: ${ctx.processContext.openActions ?? 0}
- Acciones vencidas: ${ctx.processContext.overdueActions ?? 0}`
    : '';

  // --- CRM metrics si el plugin está activo ---
  const crmCtx = ctx.pluginContexts['crm'];
  const hasCrm = ctx.installedPlugins.some(p => p === 'crm' || p.startsWith('crm'));
  const crmInfo =
    hasCrm && crmCtx
      ? `\nMÉTRICAS CRM (plugin activo):
${typeof crmCtx.total_clients === 'number' ? `- Clientes activos: ${crmCtx.total_clients}` : ''}
${typeof crmCtx.open_opportunities === 'number' ? `- Oportunidades abiertas: ${crmCtx.open_opportunities}` : ''}
${typeof crmCtx.avg_nps_score === 'number' ? `- NPS promedio: ${crmCtx.avg_nps_score}` : ''}
${typeof crmCtx.overdue_follow_ups === 'number' ? `- Seguimientos vencidos: ${crmCtx.overdue_follow_ups}` : ''}`.trim()
      : '';

  // --- Nota de confianza para el LLM ---
  const confidenceNote =
    missingSources.length > 0
      ? `\nNOTA DE CONFIANZA DEL ANÁLISIS: ${confidencePct}% de completitud (nivel ${confidenceLevel}). Fuentes sin datos: ${missingSources.join(', ')}. Basa tus hallazgos únicamente en la evidencia disponible; no asumas datos de las fuentes faltantes.`
      : `\nNOTA DE CONFIANZA DEL ANÁLISIS: ${confidencePct}% de completitud (nivel ${confidenceLevel}). Todas las fuentes principales están disponibles.`;

  return `Eres un consultor senior de sistemas de gestión ISO 9001 con experiencia en análisis estratégico.
Analiza la siguiente información del SGC y genera un informe estructurado en JSON.

ORGANIZACIÓN: ${org.name ?? 'Sin nombre'} ${org.sector ? `| Sector: ${org.sector}` : ''}
ORIENTACIÓN DEL ANÁLISIS: ${orientation} — ${orientationInstructions[orientation]}
SCOPE: ${ctx.analysisScope}${processInfo}${crmInfo}${confidenceNote}

EVIDENCIA OPERATIVA:
- Procesos: ${ev.processesTotal ?? 0}
- Auditorías totales: ${ev.auditsTotal ?? 0} | Abiertas: ${ev.auditsOpen ?? 0} | Vencidas: ${ev.auditsOverdue ?? 0}
- Hallazgos abiertos: ${ev.findingsOpen ?? 0} | Fuera de SLA: ${ev.findingsOverdueSla ?? 0}
- Acciones abiertas: ${ev.actionsOpen ?? 0} | Vencidas: ${ev.actionsOverdue ?? 0}
- Objetivos de calidad: ${ev.objectivesTotal ?? 0}
- Indicadores: ${ev.indicatorsTotal ?? 0}

BRECHAS NORMATIVAS DETECTADAS:
${gapsText || '- Sin brechas detectadas automáticamente'}

PLUGINS/MÓDULOS ACTIVOS: ${ctx.installedPlugins.length > 0 ? ctx.installedPlugins.join(', ') : 'Solo core ISO 9001'}

INSTRUCCIONES DE FORMATO:
Devuelve ÚNICAMENTE el siguiente JSON válido, sin markdown, sin texto previo ni posterior:
{
  "executive_summary": "Párrafos narrativos de 3-5 oraciones adaptados al perfil ${orientation}. Menciona los aspectos más críticos y los logros.",
  "strategic_findings": [
    {
      "id": "sf-1",
      "category": "strategic",
      "dimension": "audits",
      "level": "high",
      "titulo": "Título conciso",
      "descripcion": "Descripción con contexto e impacto",
      "evidencia": ["dato concreto 1"],
      "affectedAreas": ["área 1"]
    }
  ],
  "operational_findings": [
    { "id": "of-1", "category": "operational", "dimension": "findings_actions", "level": "medium", "titulo": "...", "descripcion": "...", "evidencia": [], "affectedAreas": [] }
  ],
  "risks_alerts": [
    { "id": "ra-1", "category": "alert", "dimension": "governance", "level": "critical", "titulo": "...", "descripcion": "...", "evidencia": [], "affectedAreas": [] }
  ],
  "opportunities": [
    { "id": "op-1", "category": "opportunity", "dimension": "processes", "level": "medium", "titulo": "...", "descripcion": "...", "evidencia": [] }
  ],
  "priorities": [
    { "id": "p-1", "horizonte": "30d", "titulo": "Prioridad inmediata", "descripcion": "Acción concreta", "impacto": "high", "urgencia": "high", "relatedDimensions": ["findings_actions"] },
    { "id": "p-2", "horizonte": "60d", "titulo": "Prioridad media", "descripcion": "...", "impacto": "medium", "urgencia": "medium", "relatedDimensions": ["audits"] },
    { "id": "p-3", "horizonte": "90d", "titulo": "Prioridad largo plazo", "descripcion": "...", "impacto": "medium", "urgencia": "low", "relatedDimensions": ["kpis"] }
  ]
}

Reglas:
- Máximo 3 findings por categoría para el MVP
- Máximo 3 prioridades (una por horizonte)
- Todo en español
- Solo incluir findings con evidencia real de los datos proporcionados
- NO inventar datos ni responsables que no estén en el contexto`;
}

// ---------------------------------------------------------------------------
// Paso 2 — Llamada al LLM y parsing
// ---------------------------------------------------------------------------

async function generateNarrative(
  ctx: StrategicAnalysisContext,
  orientation: StrategicReadingOrientation,
  normGaps: StrategicNormGap[],
  confidencePct: number,
  confidenceLevel: 'alto' | 'medio' | 'bajo',
  missingSources: string[]
): Promise<{
  output: AIOutput | null;
  provider: string;
  model: string;
  tokensUsed?: number;
  succeeded: boolean;
}> {
  try {
    const prompt = buildAnalysisPrompt(ctx, orientation, normGaps, confidencePct, confidenceLevel, missingSources);

    const response = await LLMRouter.chat({
      message: prompt,
      systemPrompt:
        'Eres un consultor ISO 9001 experto. Respondes ÚNICAMENTE con JSON válido, sin ningún texto adicional.',
      capability: 'audit_eval',
      mode: 'quality',
      allowFallback: true,
    });

    const parsed = parseStructuredOutput(response.content, aiOutputSchema);

    if (!parsed.ok) {
      console.error('[StrategicAnalysisService] AI parse failed:', parsed.code, parsed.message);
      return {
        output: null,
        provider: response.metadata.provider,
        model: response.metadata.model,
        succeeded: false,
      };
    }

    return {
      output: parsed.data,
      provider: response.metadata.provider,
      model: response.metadata.model,
      succeeded: true,
    };
  } catch (err) {
    console.error('[StrategicAnalysisService] AI call failed:', err);
    return { output: null, provider: 'none', model: 'none', succeeded: false };
  }
}

// ---------------------------------------------------------------------------
// Renderizado markdown
// ---------------------------------------------------------------------------

function renderMarkdown(
  ctx: StrategicAnalysisContext,
  normGaps: StrategicNormGap[],
  aiOutput: AIOutput | null,
  globalScore: number
): string {
  const org = ctx.organization;
  const ev = ctx.evidenceSummary;
  const lines: string[] = [];

  lines.push(`# Informe Estratégico — ${org.name ?? 'Organización'}`);
  lines.push(`**Fecha:** ${new Date().toLocaleDateString('es-AR')} | **Score global:** ${globalScore}/100\n`);

  if (aiOutput?.executive_summary) {
    lines.push('## Resumen Ejecutivo');
    lines.push(aiOutput.executive_summary);
    lines.push('');
  }

  lines.push('## Evidencia del SGC');
  lines.push(`| Dimensión | Valor |`);
  lines.push(`|---|---|`);
  lines.push(`| Procesos | ${ev.processesTotal ?? 0} |`);
  lines.push(`| Auditorías abiertas | ${ev.auditsOpen ?? 0} (${ev.auditsOverdue ?? 0} vencidas) |`);
  lines.push(`| Hallazgos abiertos | ${ev.findingsOpen ?? 0} (${ev.findingsOverdueSla ?? 0} fuera de SLA) |`);
  lines.push(`| Acciones abiertas | ${ev.actionsOpen ?? 0} (${ev.actionsOverdue ?? 0} vencidas) |`);
  lines.push(`| Objetivos | ${ev.objectivesTotal ?? 0} | Indicadores | ${ev.indicatorsTotal ?? 0} |`);
  lines.push('');

  if (normGaps.length > 0) {
    lines.push('## Brechas Normativas');
    normGaps.forEach(g => {
      lines.push(`### ${g.clausula} — ${g.titulo}`);
      lines.push(`**Severidad:** ${g.severidad} | **Norma:** ${g.norma}`);
      lines.push(g.descripcion);
      lines.push(`> **Recomendación:** ${g.recomendacion}`);
      lines.push('');
    });
  }

  if ((aiOutput?.priorities?.length ?? 0) > 0) {
    lines.push('## Prioridades');
    aiOutput!.priorities.forEach(p => {
      lines.push(`### [${p.horizonte}] ${p.titulo}`);
      lines.push(p.descripcion);
      lines.push('');
    });
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// API pública del servicio
// ---------------------------------------------------------------------------

const confidenceService = new StrategicAnalysisConfidenceService();

export class StrategicAnalysisService {
  static async analyze(
    ctx: StrategicAnalysisContext,
    orientation: StrategicReadingOrientation
  ): Promise<StrategicAnalysisResult> {
    // Paso 1 — determinístico
    const globalScore = computeGlobalScore(ctx);
    const dimensionScores = computeDimensionScores(ctx);
    const normGaps = detectNormGaps(ctx);

    // Paso 1b — índice de confianza (antes de llamar a la IA)
    const confidence = confidenceService.computeConfidence(ctx);

    // Paso 2 — IA (con confianza incluida en el prompt)
    const narrativeResult = await generateNarrative(
      ctx,
      orientation,
      normGaps,
      confidence.context_completeness_pct,
      confidence.confidence_level,
      confidence.missing_sources
    );
    const ai = narrativeResult.output;

    const renderedMarkdown = renderMarkdown(ctx, normGaps, ai, globalScore);

    return {
      global_score: globalScore,
      dimension_scores: dimensionScores,
      norm_gaps: normGaps,
      executive_summary: ai?.executive_summary ?? '',
      rendered_markdown: renderedMarkdown,
      strategic_findings: (ai?.strategic_findings ?? []) as StrategicFinding[],
      operational_findings: (ai?.operational_findings ?? []) as StrategicFinding[],
      risks_alerts: (ai?.risks_alerts ?? []) as StrategicFinding[],
      opportunities: (ai?.opportunities ?? []) as StrategicFinding[],
      priorities: (ai?.priorities ?? []) as StrategicPriority[],
      suggested_actions: buildSuggestedActions(
        ctx,
        normGaps,
        (ai?.priorities ?? []) as StrategicPriority[]
      ),
      ai_metadata: {
        provider: narrativeResult.provider,
        model: narrativeResult.model,
        promptVersion: 'v1.1-ola2-confidence',
        aiCallSucceeded: narrativeResult.succeeded,
      },
      // Índice de confianza
      context_completeness_pct: confidence.context_completeness_pct,
      confidence_level: confidence.confidence_level,
      missing_sources: confidence.missing_sources,
      dimension_coverage: confidence.dimension_coverage,
    };
  }
}
