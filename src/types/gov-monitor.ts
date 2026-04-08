import type { DimensionISO18091, GovMaturitySnapshot } from '@/types/gov-madurez';

export type GovMonitorStatus = 'critico' | 'en_riesgo' | 'estable' | 'solido';
export type GovGapPriority = 'alta' | 'media' | 'baja';
export type GovRoadmapWindow = '30_dias' | '60_dias' | '90_dias';

export interface GovMonitorSourceCounts {
  servicios_total: number;
  servicios_activos: number;
  servicios_publicos: number;
  expedientes_total: number;
  expedientes_abiertos: number;
  expedientes_resueltos: number;
  ciudadanos_total: number;
  ciudadanos_activos: number;
  evaluaciones_madurez: number;
  evidencias_dimensiones: number;
}

export interface GovMonitorComplianceMetric {
  id: string;
  label: string;
  score_pct: number;
  status: GovMonitorStatus;
  detail: string;
}

export interface GovMonitorCumplimiento {
  score_pct: number;
  status: GovMonitorStatus;
  metrics: GovMonitorComplianceMetric[];
  summary: string;
  source_counts: GovMonitorSourceCounts;
}

export interface GovMonitorMaturityDimension {
  dimension: DimensionISO18091;
  nivel: number;
  score_pct: number;
  status: GovMonitorStatus;
  has_evidence: boolean;
}

export interface GovMonitorMaturityBlock {
  snapshot: GovMaturitySnapshot;
  score_pct: number;
  status: GovMonitorStatus;
  trend_direction: GovMaturitySnapshot['trend_direction'];
  dimensions: GovMonitorMaturityDimension[];
  summary: string;
}

export interface GovMonitorGap {
  id: string;
  title: string;
  priority: GovGapPriority;
  status: GovMonitorStatus;
  area: 'cumplimiento' | 'madurez' | 'datos' | 'riesgos';
  reason: string;
  evidence: string[];
  suggested_action: string;
}

export interface GovMonitorRoadmapAction {
  id: string;
  horizon: GovRoadmapWindow;
  priority: GovGapPriority;
  title: string;
  objective: string;
  expected_impact: string;
  related_gap_ids: string[];
}

export interface GovMonitorData {
  organization_id: string;
  generated_at: string;
  cumplimiento: GovMonitorCumplimiento;
  madurez: GovMonitorMaturityBlock;
  gaps: GovMonitorGap[];
  roadmap: GovMonitorRoadmapAction[];
}

export interface GovMonitorMobileData {
  organization_id: string;
  generated_at: string;
  cumplimiento: Pick<GovMonitorCumplimiento, 'score_pct' | 'status' | 'summary'>;
  madurez: Pick<
    GovMonitorMaturityBlock,
    'score_pct' | 'status' | 'trend_direction' | 'summary'
  >;
  priorities: Array<Pick<GovMonitorGap, 'id' | 'title' | 'priority' | 'status'>>;
  roadmap: Array<
    Pick<GovMonitorRoadmapAction, 'id' | 'horizon' | 'priority' | 'title'>
  >;
  counters: GovMonitorSourceCounts;
}

export interface GovPanelData {
  expedientes_total: number;
  ciudadanos_registrados: number;
  expedientes_pendientes: number;
  nps_ciudadano: number | null;
  monitor: {
    cumplimiento_score_pct: number;
    madurez_score_pct: number;
    gaps_altos: number;
    roadmap_inmediato: number;
    status: GovMonitorStatus;
  };
}
