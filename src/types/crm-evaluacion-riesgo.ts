// src/types/crm-evaluacion-riesgo.ts
// Tipos para el Sistema de Evaluación de Riesgo Crediticio (CDSS)

// ============================================================
// EVALUACIÓN PRINCIPAL
// ============================================================

export type EstadoEvaluacion =
  | 'borrador'
  | 'pendiente'
  | 'aprobada'
  | 'rechazada';
export type TierCredito = 'A' | 'B' | 'C' | 'REPROBADO';
export type CategoriaItem = 'cualitativos' | 'conflictos' | 'cuantitativos';

export interface EvaluacionRiesgo {
  id: string;
  organization_id: string;
  crm_organizacion_id: string;
  // Permite vincular la evaluación a la oportunidad comercial que dispara el análisis.
  oportunidad_id?: string;
  // Referencia el subflujo operativo, no reemplaza la evaluación técnica.
  credit_workflow_id?: string;

  // Info del cliente (denormalizado para listados)
  cliente_nombre: string;
  cliente_cuit: string;

  // Datos de la evaluación
  fecha_evaluacion: string;
  evaluador_id: string;
  evaluador_nombre: string;
  estado: EstadoEvaluacion;

  // Scores por categoría (calculados)
  score_cualitativos: number;
  score_conflictos: number;
  score_cuantitativos: number;
  score_nosis?: number;

  // Score total y tier
  score_ponderado_total: number;
  tier_sugerido: TierCredito;

  // Decisión humana
  tier_asignado?: TierCredito;
  limite_credito_asignado?: number;
  evaluacion_personal?: string;

  // Datos financieros snapshot
  patrimonio_neto_computable: number;
  capital_garantia: number; // patrimonio × 50%

  // Vigencia
  es_vigente: boolean;

  created_at: string;
  updated_at: string;
}

// ============================================================
// ITEMS DE EVALUACIÓN
// ============================================================

export interface ItemEvaluacion {
  id: string;
  evaluacion_id: string;
  categoria: CategoriaItem;
  item_key: string;
  item_nombre: string;
  puntaje: number; // 1-10
  peso_categoria: number; // 0.43, 0.31, 0.26
  peso_item: number; // % dentro de categoría
  puntaje_ponderado: number;
  observaciones?: string;
}

// Constantes de items por defecto
export const ITEMS_CUALITATIVOS = [
  {
    key: 'capacidad_direccion',
    nombre: 'Capacidad de la dirección',
    peso: 0.143,
  },
  {
    key: 'condiciones_ramo',
    nombre: 'Condiciones del ramo o actividad',
    peso: 0.143,
  },
  {
    key: 'organizacion_controles',
    nombre: 'Organización y controles',
    peso: 0.143,
  },
  {
    key: 'cheques_rechazados_empresa',
    nombre: 'Cheques rechazados en la Empresa',
    peso: 0.143,
  },
  {
    key: 'terminos_pago',
    nombre: 'Términos y condiciones de pago (cumplimiento)',
    peso: 0.143,
  },
  {
    key: 'potencial_crecimiento',
    nombre: 'Potencialidad y capacidad de crecimiento',
    peso: 0.143,
  },
  { key: 'nivel_fidelizacion', nombre: 'Nivel de fidelización', peso: 0.142 },
] as const;

export const ITEMS_CONFLICTOS = [
  { key: 'concursos_quiebras', nombre: 'Concursos y quiebras', peso: 0.333 },
  { key: 'problemas_fiscales', nombre: 'Problemas fiscales', peso: 0.333 },
  {
    key: 'cheques_rechazados_historial',
    nombre: 'Cheques rechazados (historial)',
    peso: 0.334,
  },
] as const;

export const ITEMS_CUANTITATIVOS = [
  { key: 'situacion_economica', nombre: 'Situación económica', peso: 0.25 },
  { key: 'situacion_financiera', nombre: 'Situación financiera', peso: 0.25 },
  { key: 'volumenes_operados', nombre: 'Volúmenes operados', peso: 0.25 },
  { key: 'situacion_patrimonial', nombre: 'Situación patrimonial', peso: 0.25 },
] as const;

// ============================================================
// CONFIGURACIÓN DE SCORING
// ============================================================

export interface ConfigScoring {
  id: string;
  organization_id: string;

  // Pesos de categorías
  peso_cualitativos: number; // Default 0.43
  peso_conflictos: number; // Default 0.31
  peso_cuantitativos: number; // Default 0.26

  // Límites por tier
  tier_a_min_score: number; // Default 8
  tier_a_max_patrimonio: number; // % para tier A
  tier_b_min_score: number; // Default 6
  tier_b_max_patrimonio: number;
  tier_c_min_score: number; // Default 4
  tier_c_max_patrimonio: number;

  // Frecuencia de actualización
  frecuencia_actualizacion_meses: number;

  created_at: string;
  updated_at: string;
}

export const CONFIG_SCORING_DEFAULT: Omit<
  ConfigScoring,
  'id' | 'organization_id' | 'created_at' | 'updated_at'
> = {
  peso_cualitativos: 0.43,
  peso_conflictos: 0.31,
  peso_cuantitativos: 0.26,
  tier_a_min_score: 8,
  tier_a_max_patrimonio: 0.5,
  tier_b_min_score: 6,
  tier_b_max_patrimonio: 0.4,
  tier_c_min_score: 4,
  tier_c_max_patrimonio: 0.3,
  frecuencia_actualizacion_meses: 12,
};

// ============================================================
// DTOs
// ============================================================

export interface CreateEvaluacionData {
  crm_organizacion_id: string;
  oportunidad_id?: string;
  credit_workflow_id?: string;
  cliente_nombre: string;
  cliente_cuit: string;
  patrimonio_neto_computable: number;
  items: {
    categoria: CategoriaItem;
    item_key: string;
    puntaje: number;
    observaciones?: string;
  }[];
  score_nosis?: number;
  evaluacion_personal?: string;
}

export interface UpdateEvaluacionData {
  oportunidad_id?: string;
  credit_workflow_id?: string;
  items?: {
    categoria: CategoriaItem;
    item_key: string;
    puntaje: number;
    observaciones?: string;
  }[];
  score_nosis?: number;
  tier_asignado?: TierCredito;
  limite_credito_asignado?: number;
  evaluacion_personal?: string;
  estado?: EstadoEvaluacion;
}

// ============================================================
// RESULTADO DE CÁLCULO
// ============================================================

export interface ResultadoCalculo {
  score_cualitativos: number;
  score_conflictos: number;
  score_cuantitativos: number;
  score_ponderado_total: number;
  tier_sugerido: TierCredito;
  capital_garantia: number;
  limite_maximo_sugerido: {
    tier_a: number;
    tier_b: number;
    tier_c: number;
  };
}
