import { ExecutiveAlertRules } from '@/services/executive-alerts/ExecutiveAlertRules';
import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';
import { StrategicAnalysisTrendService } from '@/services/strategic-analysis/StrategicAnalysisTrendService';
import type {
  GovMaturityAssessment,
  GovMaturityDimensionSummary,
  GovMaturitySnapshot,
  GovMaturityStrategicSummary,
} from '@/types/gov-madurez';
import { Timestamp } from 'firebase-admin/firestore';

export const GOV_MATURITY_COLLECTION_NAME = 'maturity_assessments';

export function serializeTimestamp(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return new Date(0).toISOString();
}

export function serializeAssessment(
  id: string,
  data: Record<string, unknown>
): GovMaturityAssessment {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    fecha: String(data.fecha || ''),
    evaluador: String(data.evaluador || ''),
    dimensiones: Array.isArray(data.dimensiones)
      ? data.dimensiones.map(item => ({
          dimension: String(
            (item as Record<string, unknown>).dimension || ''
          ) as GovMaturityAssessment['dimensiones'][number]['dimension'],
          nivel: Number(
            (item as Record<string, unknown>).nivel || 1
          ) as GovMaturityAssessment['dimensiones'][number]['nivel'],
          evidencias: String(
            (item as Record<string, unknown>).evidencias || ''
          ),
          oportunidades_mejora: String(
            (item as Record<string, unknown>).oportunidades_mejora || ''
          ),
        }))
      : [],
    nivel_global: Number(data.nivel_global || 0),
    plan_accion: String(data.plan_accion || ''),
    estado: (data.estado || 'borrador') as GovMaturityAssessment['estado'],
    created_at: serializeTimestamp(data.created_at),
  };
}

export function calculateNivelGlobal(
  dimensiones: Array<{ nivel: number }>
): number {
  const total = dimensiones.reduce((sum, item) => sum + item.nivel, 0);
  return Number((total / dimensiones.length).toFixed(2));
}

export async function buildStrategicSummary(
  organizationId: string
): Promise<GovMaturityStrategicSummary | null> {
  const latestReport = await StrategicAnalysisReportService.getLatestReport(
    organizationId
  );

  if (!latestReport?.id) {
    return null;
  }

  const trend = await StrategicAnalysisTrendService.getTrend(
    organizationId,
    latestReport.id,
    3
  );

  const highStoredAlerts = (latestReport.executive_alerts ?? []).some(
    alert => alert.severity === 'critica' || alert.severity === 'alta'
  );
  const normalizedStoredAlerts = (latestReport.executive_alerts ?? [])
    .filter(alert => alert.severity === 'critica' || alert.severity === 'alta')
    .map(alert => ({
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      recommended_action: alert.recommended_action,
    }));

  const deterministicAlerts =
    ExecutiveAlertRules.alertsFromStrategicAnalysis({
      id: latestReport.id,
      org_id: organizationId,
      confidence_level: latestReport.confidence_level,
      global_score: latestReport.global_score,
      norm_gaps: latestReport.norm_gaps.map(gap => ({
        area: gap.titulo || gap.norma || gap.clausula,
        score:
          gap.severidad === 'critical'
            ? 20
            : gap.severidad === 'high'
              ? 35
              : gap.severidad === 'medium'
                ? 55
                : 75,
        gap_description: gap.descripcion,
      })),
      created_at: Timestamp.now(),
    }).filter(alert => alert.severity === 'critica' || alert.severity === 'alta');

  return {
    report_id: latestReport.id,
    title: latestReport.title,
    created_at: latestReport.created_at,
    global_score: latestReport.global_score,
    confidence_level: latestReport.confidence_level,
    context_completeness_pct: latestReport.context_completeness_pct,
    trend: {
      global_score_delta: trend.global_score_delta,
      trend_direction: trend.trend_direction,
      periods_analyzed: trend.periods_analyzed,
      previous_report_date: trend.previous_report_date?.toISOString(),
    },
    executive_alerts:
      highStoredAlerts || deterministicAlerts.length > 0
        ? [...normalizedStoredAlerts, ...deterministicAlerts].filter(
            (alert, index, alerts) =>
              alerts.findIndex(candidate => candidate.id === alert.id) === index
          )
        : [],
  };
}

function buildDimensionSummary(
  assessment: GovMaturityAssessment | null
): GovMaturityDimensionSummary[] {
  if (!assessment) {
    return [];
  }

  return assessment.dimensiones.map(item => ({
    dimension: item.dimension,
    nivel: item.nivel,
    score_pct: item.nivel * 25,
    has_evidence: item.evidencias.trim().length > 0,
    has_improvement_notes: item.oportunidades_mejora.trim().length > 0,
    evidencias: item.evidencias,
    oportunidades_mejora: item.oportunidades_mejora,
  }));
}

export async function buildGovMaturitySnapshot(input: {
  organizationId: string;
  assessments: GovMaturityAssessment[];
}): Promise<GovMaturitySnapshot> {
  const latest = input.assessments[0] ?? null;
  const previous = input.assessments[1] ?? null;
  const currentScorePct = latest ? Math.round((latest.nivel_global / 4) * 100) : 0;
  const previousScorePct = previous
    ? Math.round((previous.nivel_global / 4) * 100)
    : 0;
  const deltaPct = latest && previous ? currentScorePct - previousScorePct : 0;
  const trendDirection =
    deltaPct >= 5 ? 'mejorando' : deltaPct <= -5 ? 'empeorando' : 'estable';
  const strategicSummary = await buildStrategicSummary(input.organizationId);

  return {
    latest,
    previous,
    current_score_pct: currentScorePct,
    previous_score_pct: previous ? previousScorePct : null,
    delta_pct: latest && previous ? deltaPct : 0,
    trend_direction: strategicSummary?.trend.trend_direction ?? trendDirection,
    dimensions: buildDimensionSummary(latest),
    strategic_summary: strategicSummary,
  };
}
