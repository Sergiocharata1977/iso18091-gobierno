// Ola 1 — CRUD de reportes en Firestore
// Colección: organizations/{orgId}/strategic_analysis_reports/{reportId}
// Aislamiento fuerte por tenant — nunca colección global.

import { getAdminFirestore } from '@/lib/firebase/admin';
import type { StrategicAnalysisRequest } from '@/lib/validations/strategic-analysis';
import type { StrategicAnalysisResult } from '@/services/strategic-analysis/StrategicAnalysisService';
import type {
  StrategicAnalysisContext,
  StrategicAnalysisReport,
  StrategicAnalysisScope,
} from '@/types/strategic-analysis';

function reportsCollection(orgId: string) {
  return getAdminFirestore()
    .collection('organizations')
    .doc(orgId)
    .collection('strategic_analysis_reports');
}

function buildTitle(scope: StrategicAnalysisScope, targetName?: string): string {
  const scopeLabels: Record<StrategicAnalysisScope, string> = {
    organization_general: 'Análisis Organizacional',
    process: `Análisis de Proceso${targetName ? ` — ${targetName}` : ''}`,
    role: `Análisis de Puesto${targetName ? ` — ${targetName}` : ''}`,
    person: `Análisis de Responsable${targetName ? ` — ${targetName}` : ''}`,
    normative_compliance: 'Cumplimiento Normativo',
    operational: 'Análisis Operativo',
    management_review: 'Revisión por la Dirección',
    historical_comparison: 'Comparativa Histórica',
  };
  const fecha = new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
  });
  return `${scopeLabels[scope]} — ${fecha}`;
}

export class StrategicAnalysisReportService {
  static async create(
    orgId: string,
    userId: string,
    userRole: string,
    request: StrategicAnalysisRequest,
    context: StrategicAnalysisContext
  ): Promise<StrategicAnalysisReport> {
    const col = reportsCollection(orgId);
    const docRef = col.doc();
    const now = new Date().toISOString();

    const report: StrategicAnalysisReport = {
      id: docRef.id,
      organization_id: orgId,
      created_at: now,
      created_by: userId,
      created_for_role: userRole,
      title: buildTitle(request.scope, request.target_name),
      status: 'context_ready',
      analysis_scope: request.scope,
      reading_orientation: request.reading_orientation,
      plugin_scope: context.installedPlugins,
      horizon: request.horizon,
      period_reference: now.slice(0, 7), // YYYY-MM
      compared_report_id: request.compare_to_report_id,
      executive_summary: '', // Se completa en Ola 2 con IA
      rendered_markdown: undefined,
      global_score: undefined,
      dimension_scores: [],
      norm_gaps: [],
      strategic_findings: [],
      operational_findings: [],
      risks_alerts: [],
      opportunities: [],
      priorities: [],
      suggested_actions: [],
      raw_context_snapshot: context,
      ai_metadata: {},
    };

    await docRef.set(report);
    return report;
  }

  static async getById(
    orgId: string,
    reportId: string
  ): Promise<StrategicAnalysisReport | null> {
    const snap = await reportsCollection(orgId).doc(reportId).get();
    if (!snap.exists) return null;
    return snap.data() as StrategicAnalysisReport;
  }

  static async updateAnalysis(
    orgId: string,
    reportId: string,
    result: StrategicAnalysisResult
  ): Promise<StrategicAnalysisReport> {
    const col = reportsCollection(orgId);
    const updates: Partial<StrategicAnalysisReport> = {
      status: result.ai_metadata.aiCallSucceeded ? 'analyzed' : 'context_ready',
      global_score: result.global_score,
      dimension_scores: result.dimension_scores,
      norm_gaps: result.norm_gaps,
      executive_summary: result.executive_summary,
      rendered_markdown: result.rendered_markdown,
      strategic_findings: result.strategic_findings,
      operational_findings: result.operational_findings,
      risks_alerts: result.risks_alerts,
      opportunities: result.opportunities,
      priorities: result.priorities,
      suggested_actions: result.suggested_actions,
      ai_metadata: result.ai_metadata,
      // Índice de confianza
      context_completeness_pct: result.context_completeness_pct,
      confidence_level: result.confidence_level,
      missing_sources: result.missing_sources,
      dimension_coverage: result.dimension_coverage,
      executive_alerts: result.executive_alerts,
      agentic_case_ids: result.agentic_case_ids,
    };

    await col.doc(reportId).update(updates);

    const snap = await col.doc(reportId).get();
    return snap.data() as StrategicAnalysisReport;
  }

  static async list(
    orgId: string,
    options: {
      scope?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<StrategicAnalysisReport[]> {
    const { scope, limit = 10, cursor } = options;

    let q = reportsCollection(orgId)
      .orderBy('created_at', 'desc')
      .limit(Math.min(limit, 50));

    if (scope) {
      q = q.where('analysis_scope', '==', scope) as typeof q;
    }

    if (cursor) {
      const cursorSnap = await reportsCollection(orgId).doc(cursor).get();
      if (cursorSnap.exists) {
        q = q.startAfter(cursorSnap) as typeof q;
      }
    }

    const snap = await q.get();
    return snap.docs.map(d => d.data() as StrategicAnalysisReport);
  }

  static async getLatestReport(
    orgId: string
  ): Promise<StrategicAnalysisReport | null> {
    const snap = await reportsCollection(orgId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (snap.empty) return null;
    return snap.docs[0].data() as StrategicAnalysisReport;
  }
}
