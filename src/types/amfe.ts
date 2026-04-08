/**
 * Tipos para el módulo AMFE (Análisis Modal de Fallos y Efectos)
 * Registros de Riesgos y Oportunidades
 */

export type TipoRegistroAMFE = 'riesgo' | 'oportunidad';

export type EstadoRegistroAMFE =
  | 'identificado'
  | 'analizado'
  | 'en_tratamiento'
  | 'cerrado';

export type NivelProbabilidad = 1 | 2 | 3 | 4 | 5;
export type NivelImpacto = 1 | 2 | 3 | 4 | 5;

export interface RegistroAMFE {
  id: string;
  organization_id: string;

  // Clasificación
  tipo: TipoRegistroAMFE;
  proceso_id?: string;
  proceso_nombre: string;

  // Descripción
  titulo: string;
  descripcion: string;
  causa?: string;
  efecto?: string;

  // Evaluación AMFE
  probabilidad: NivelProbabilidad;
  impacto: NivelImpacto;
  npr: number; // Número de Prioridad de Riesgo = probabilidad × impacto

  // Fechas
  fecha_identificacion: string;
  fecha_analisis?: string;
  fecha_cierre?: string;

  // Estado y tratamiento
  estado: EstadoRegistroAMFE;
  acciones_planificadas?: string;
  accion_mejora_id?: string; // Vinculación con módulo Mejora

  // Reevaluación
  probabilidad_residual?: NivelProbabilidad;
  impacto_residual?: NivelImpacto;
  npr_residual?: number;

  // Responsable
  responsable_id?: string;
  responsable_nombre?: string;

  // Auditoría
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
}

// Para crear un nuevo registro
export type CreateRegistroAMFE = Omit<
  RegistroAMFE,
  'id' | 'npr' | 'npr_residual' | 'created_at' | 'updated_at'
>;

// Niveles de riesgo según NPR
export const getNivelRiesgo = (
  npr: number
): { nivel: string; color: string } => {
  if (npr >= 15) return { nivel: 'Crítico', color: 'bg-red-600' };
  if (npr >= 10) return { nivel: 'Alto', color: 'bg-orange-500' };
  if (npr >= 5) return { nivel: 'Medio', color: 'bg-yellow-500' };
  return { nivel: 'Bajo', color: 'bg-green-500' };
};

// Descripción de probabilidad
export const PROBABILIDAD_LABELS: Record<NivelProbabilidad, string> = {
  1: 'Muy baja',
  2: 'Baja',
  3: 'Media',
  4: 'Alta',
  5: 'Muy alta',
};

// Descripción de impacto
export const IMPACTO_LABELS: Record<NivelImpacto, string> = {
  1: 'Insignificante',
  2: 'Menor',
  3: 'Moderado',
  4: 'Mayor',
  5: 'Catastrófico',
};
