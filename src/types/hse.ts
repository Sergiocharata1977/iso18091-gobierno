// Pack HSE — tipos para ISO 14001 (Ambiental) + ISO 45001 (SST)
// Compartidos por los submodules hse_ambiental, hse_sst y hse_ptw

export type NivelRiesgoHSE = 'muy_bajo' | 'bajo' | 'medio' | 'alto' | 'critico';

// ─── ISO 14001 — Gestión Ambiental ─────────────────────────────────────────

export type TipoAspecto = 'directo' | 'indirecto';
export type CondicionOperacion = 'normal' | 'anormal' | 'emergencia';
export type SignificanciaAmbiental = 'significativo' | 'no_significativo';

export interface AspectoAmbiental {
  id: string;
  organization_id: string;
  proceso_id?: string;
  actividad: string;
  aspecto: string;              // ej: 'Generación de residuos sólidos'
  impacto: string;              // ej: 'Contaminación del suelo'
  tipo: TipoAspecto;
  condicion: CondicionOperacion;
  nivel_riesgo: NivelRiesgoHSE;
  significancia: SignificanciaAmbiental;
  controles_existentes?: string;
  requisito_legal_id?: string;
  requiere_objetivo?: boolean;
  activo: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export type TipoRequisitoLegal =
  | 'ley'
  | 'decreto'
  | 'resolucion'
  | 'norma_iso'
  | 'otro';

export type EstadoCumplimientoLegal =
  | 'cumple'
  | 'parcial'
  | 'no_cumple'
  | 'en_evaluacion';

export interface RequisitoLegal {
  id: string;
  organization_id: string;
  norma_origen: string;         // ej: 'Ley 25.612 Residuos Industriales'
  tipo: TipoRequisitoLegal;
  descripcion: string;
  aplica_a: string[];           // proceso_ids o áreas
  fecha_vigencia?: Date;
  estado_cumplimiento: EstadoCumplimientoLegal;
  evidencia?: string;
  fecha_proxima_revision?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ObjetivoAmbiental {
  id: string;
  organization_id: string;
  aspecto_id?: string;
  descripcion: string;
  meta: string;
  indicador: string;
  responsable_id: string;
  fecha_meta: Date;
  progreso: number;             // 0-100
  estado: 'pendiente' | 'en_curso' | 'cumplido' | 'vencido';
  created_at: Date;
  updated_at: Date;
}

// ─── ISO 45001 — Seguridad y Salud en el Trabajo ───────────────────────────

export type TipoPeligro =
  | 'fisico'
  | 'quimico'
  | 'biologico'
  | 'ergonomico'
  | 'psicosocial'
  | 'mecanico'
  | 'electrico'
  | 'locativo';

export type GravedadIncidente = 'leve' | 'moderado' | 'grave' | 'fatal';

export type TipoIncidente =
  | 'accidente'
  | 'incidente'
  | 'casi_accidente'
  | 'enfermedad_profesional';

export type TipoControl =
  | 'eliminacion'
  | 'sustitucion'
  | 'ingenieria'
  | 'administrativo'
  | 'epp';

export interface ControlPeligro {
  tipo: TipoControl;
  descripcion: string;
}

export interface IdentificacionPeligro {
  id: string;
  organization_id: string;
  proceso_id?: string;
  area: string;
  actividad: string;
  peligro: string;
  tipo_peligro: TipoPeligro;
  riesgo_descripcion: string;
  nivel_riesgo: NivelRiesgoHSE;
  controles: ControlPeligro[];
  nivel_riesgo_residual: NivelRiesgoHSE;
  activo: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface IncidenteSST {
  id: string;
  organization_id: string;
  tipo: TipoIncidente;
  fecha_ocurrencia: Date;
  lugar: string;
  descripcion: string;
  personas_involucradas: string[];  // user_ids
  gravedad?: GravedadIncidente;
  dias_perdidos?: number;
  causa_raiz?: string;
  causa_inmediata?: string;
  acciones_correctivas?: string[];  // accion_ids del core
  peligro_id?: string;
  hallazgo_id?: string;             // hallazgo generado automáticamente si grave/fatal
  requiere_investigacion: boolean;
  estado: 'abierto' | 'en_investigacion' | 'cerrado';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export type EstadoEPP = 'activo' | 'vencido' | 'devuelto' | 'dado_de_baja';

export interface RegistroEPP {
  id: string;
  organization_id: string;
  persona_id: string;           // user_id
  tipo_epp: string;             // casco, guantes, calzado, etc.
  descripcion: string;
  fecha_entrega: Date;
  fecha_vencimiento?: Date;
  estado: EstadoEPP;
  entregado_por: string;
  firma_conformidad?: boolean;
  created_at: Date;
  updated_at: Date;
}

// ─── Matriz de Riesgo HSE (compartida 14001 + 45001) ───────────────────────

export interface CriterioProbabilidad {
  nivel: number;
  label: string;
  descripcion: string;
}

export interface CriterioConsecuencia {
  nivel: number;
  label: string;
  descripcion: string;
}

export interface RangoAceptabilidad {
  min: number;
  max: number;
  nivel: NivelRiesgoHSE;
  color: string;
  accion: string;
}

export interface MatrizRiesgoHSE {
  id: string;
  organization_id: string;
  norma: 'ISO_14001' | 'ISO_45001';
  nombre: string;
  descripcion?: string;
  criterios_probabilidad: CriterioProbabilidad[];
  criterios_consecuencia: CriterioConsecuencia[];
  rangos_aceptabilidad: RangoAceptabilidad[];
  activa: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// ─── Tipos de resumen para dashboard HSE ───────────────────────────────────

export interface DashboardHSEStats {
  incidentes_abiertos: number;
  incidentes_graves_30d: number;
  dias_sin_accidente: number;
  epp_vencidos: number;
  aspectos_significativos: number;
  requisitos_no_cumple: number;
  objetivos_vencidos: number;
}
