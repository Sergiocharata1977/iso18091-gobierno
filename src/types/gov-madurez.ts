import { z } from 'zod';
import type { ExecutiveAlert } from '@/types/executive-alerts';

export type DimensionISO18091 =
  | 'liderazgo'
  | 'planificacion'
  | 'apoyo'
  | 'operacion'
  | 'mejora';

export type NivelMadurez = 1 | 2 | 3 | 4;

export interface DimensionEvaluacion {
  dimension: DimensionISO18091;
  nivel: NivelMadurez;
  evidencias: string;
  oportunidades_mejora: string;
}

export interface GovMaturityAssessment {
  id: string;
  organization_id: string;
  fecha: string;
  evaluador: string;
  dimensiones: DimensionEvaluacion[];
  nivel_global: number;
  plan_accion: string;
  estado: 'borrador' | 'finalizado';
  created_at: string;
}

export interface GovMaturityTrendSummary {
  global_score_delta: number;
  trend_direction: 'mejorando' | 'estable' | 'empeorando';
  periods_analyzed: number;
  previous_report_date?: string;
}

export interface GovMaturityStrategicSummary {
  report_id: string;
  title: string;
  created_at: string;
  global_score?: number;
  confidence_level?: 'alto' | 'medio' | 'bajo';
  context_completeness_pct?: number;
  trend: GovMaturityTrendSummary;
  executive_alerts: Array<
    Pick<ExecutiveAlert, 'id' | 'severity' | 'title' | 'recommended_action'>
  >;
}

export interface GovMaturityDimensionSummary {
  dimension: DimensionISO18091;
  nivel: NivelMadurez;
  score_pct: number;
  has_evidence: boolean;
  has_improvement_notes: boolean;
  evidencias: string;
  oportunidades_mejora: string;
}

export interface GovMaturitySnapshot {
  latest: GovMaturityAssessment | null;
  previous: GovMaturityAssessment | null;
  current_score_pct: number;
  previous_score_pct: number | null;
  delta_pct: number;
  trend_direction: 'mejorando' | 'estable' | 'empeorando';
  dimensions: GovMaturityDimensionSummary[];
  strategic_summary: GovMaturityStrategicSummary | null;
}

const DIMENSIONES_ISO_18091 = [
  'liderazgo',
  'planificacion',
  'apoyo',
  'operacion',
  'mejora',
] as const;

export const GovMaturityCreateSchema = z.object({
  fecha: z.string(),
  evaluador: z.string().min(3),
  dimensiones: z
    .array(
      z.object({
        dimension: z.enum(DIMENSIONES_ISO_18091),
        nivel: z.number().int().min(1).max(4),
        evidencias: z.string().default(''),
        oportunidades_mejora: z.string().default(''),
      })
    )
    .length(5)
    .refine(
      dimensiones =>
        new Set(dimensiones.map(item => item.dimension)).size ===
        DIMENSIONES_ISO_18091.length,
      {
        message: 'Las 5 dimensiones deben estar presentes una sola vez',
        path: ['dimensiones'],
      }
    ),
  plan_accion: z.string().default(''),
  estado: z.enum(['borrador', 'finalizado']).default('borrador'),
});

export type GovMaturityCreateInput = z.infer<typeof GovMaturityCreateSchema>;
