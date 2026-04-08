export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
};

export const MATURITY_DIMENSION_IDS = ['D1', 'D2', 'D3', 'D4', 'D5'] as const;

export type MaturityDimensionId = (typeof MATURITY_DIMENSION_IDS)[number];
export type MaturityScore = 1 | 2 | 3 | 4;

export const MATURITY_GLOBAL_LEVELS = [
  'Emergente',
  'En desarrollo',
  'Consolidado',
  'Maduro',
] as const;

export type MaturityGlobalLevel = (typeof MATURITY_GLOBAL_LEVELS)[number];

export interface MaturityDimensionDefinition {
  id: MaturityDimensionId;
  nombre: string;
  descripcion: string;
  nivel1: string;
  nivel2: string;
  nivel3: string;
  nivel4: string;
  recomendacion_base: string;
}

export interface DiagnosticoMadurez {
  id: string;
  organization_id: string;
  fecha: string;
  puntajes: Record<MaturityDimensionId, MaturityScore>;
  puntaje_total: number;
  nivel_global: MaturityGlobalLevel;
  plan_mejora: string[];
  created_by: string;
  created_at: FirestoreTimestamp;
}

export interface DiagnosticoMadurezSerialized
  extends Omit<DiagnosticoMadurez, 'created_at'> {
  created_at: string;
}

export interface DiagnosticoMadurezPayload {
  fecha?: string;
  puntajes: Record<MaturityDimensionId, MaturityScore>;
}
