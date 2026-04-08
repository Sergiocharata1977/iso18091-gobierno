import { getAdminFirestore } from '@/lib/firebase/admin';
import type { ToolDefinition } from '@/types/ai-tools';
import { Timestamp } from 'firebase-admin/firestore';

function extractSummary(input: string): string {
  return input
    .replace(/^(hola[, ]*)?/i, '')
    .replace(/registr(a|ame)?/i, '')
    .replace(/(una )?(no conformidad|\bnc\b|desv[ií]o)/i, '')
    .trim()
    .slice(0, 180);
}

export const createNCTool: ToolDefinition = {
  name: 'createNC',
  description:
    'Crea borrador de No Conformidad en coleccion findings (MVP server-side)',
  matches: inputText => /(no conform|\bnc\b|desvio|desv[ií]o)/i.test(inputText),
  score: inputText =>
    /(registr|crear|cargar|anotar)/i.test(inputText) ? 100 : 60,
  async execute(ctx) {
    const resumen = extractSummary(ctx.inputText);
    const db = getAdminFirestore();
    const now = Timestamp.now();
    const rawText = ctx.inputText.slice(0, 500);
    const findingNumber = `HAL-DRAFT-${Date.now()}`;

    const findingRef = await db.collection('findings').add({
      findingNumber,
      organization_id: ctx.organizationId,
      registration: {
        origin: 'IA Omnicanal',
        name: resumen
          ? `Borrador IA: ${resumen.slice(0, 80)}`
          : 'Borrador IA de no conformidad',
        description:
          rawText || 'Borrador generado por IA desde canal conversacional.',
        processId: null,
        processName: 'Pendiente clasificacion',
        sourceType: 'otro',
        sourceId: null,
        sourceName: `ai_core:${ctx.channel}`,
        normPoints: [],
      },
      immediateActionPlanning: null,
      immediateActionExecution: null,
      rootCauseAnalysis: null,
      // Se conserva status compatible con modulos existentes.
      // La condicion de borrador queda explicitada en campos AI.
      status: 'registrado',
      currentPhase: 'registered',
      progress: 0,
      ai_draft: true,
      ai_draft_status: 'draft',
      ai_draft_metadata: {
        source: 'ai_core_tool',
        channel: ctx.channel,
        requested_by: ctx.userId,
        raw_text: rawText,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.userId,
      createdByName: 'IA Omnicanal',
      updatedBy: null,
      updatedByName: null,
      isActive: true,
    });

    return {
      success: true,
      text: `Listo, deje un borrador de No Conformidad en Hallazgos (${findingRef.id}).`,
      data: {
        findingId: findingRef.id,
        draftStatus: 'draft',
        status: 'registrado',
        source: 'findings',
        resumen,
      },
      actionLogAction: 'create_nc_draft',
    };
  },
};
