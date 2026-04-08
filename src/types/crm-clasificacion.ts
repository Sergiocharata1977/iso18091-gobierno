// Tipo de un criterio de clasificación configurable por organización
export type TipoSeleccionCriterio = 'select' | 'multiselect';

export interface OpcionClasificacion {
  id: string;
  label: string;
  slug: string;
  color?: string; // hex opcional para badges
  orden: number;
}

export interface CriterioClasificacion {
  id: string;
  organization_id: string;
  nombre: string;             // "Zona"
  slug: string;               // "zona" — snake_case, unique por org
  tipo: TipoSeleccionCriterio;
  activo: boolean;
  orden: number;
  aplica_a_clientes: boolean;
  aplica_a_oportunidades: boolean;
  opciones: OpcionClasificacion[];
  created_at: string;
  updated_at: string;
}

// Para crear un criterio nuevo
export interface CreateCriterioData {
  nombre: string;
  slug: string;
  tipo: TipoSeleccionCriterio;
  aplica_a_clientes: boolean;
  aplica_a_oportunidades: boolean;
  opciones?: OpcionClasificacion[];
}

// Map de clasificaciones asignadas a un cliente u oportunidad
// key = slug del criterio, value = slug de opción (select) o array de slugs (multiselect)
export type ClasificacionesMap = Record<string, string | string[]>;

// Métricas automáticas calculadas (no se guardan en Firestore)
export type TramoPipeline = '0-7' | '8-15' | '16-30' | '31-60' | '+60';
export type TramoUltimaAccion = 'hoy' | '1-3' | '4-7' | '8-15' | '16-30' | '+30';

export interface MetricasTemporalesOportunidad {
  dias_en_pipeline: number;
  dias_en_etapa_actual: number;
  tramo_pipeline: TramoPipeline;
}

export interface MetricasTemporalesCliente {
  dias_desde_ultima_accion: number;
  tramo_ultima_accion: TramoUltimaAccion;
}

// Helper functions types
export function calcularTramoPipeline(dias: number): TramoPipeline {
  if (dias <= 7) return '0-7';
  if (dias <= 15) return '8-15';
  if (dias <= 30) return '16-30';
  if (dias <= 60) return '31-60';
  return '+60';
}

export function calcularTramoUltimaAccion(dias: number): TramoUltimaAccion {
  if (dias === 0) return 'hoy';
  if (dias <= 3) return '1-3';
  if (dias <= 7) return '4-7';
  if (dias <= 15) return '8-15';
  if (dias <= 30) return '16-30';
  return '+30';
}
