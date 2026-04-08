/**
 * Tipos para Plugin A — rrhh_ciclo_vida
 * Contratos, ATS (Vacantes + Candidatos), Onboarding, Offboarding
 */

// ─────────────────────────────────────────────────────────────
// CONTRATOS Y LEGAJOS
// ─────────────────────────────────────────────────────────────

export type TipoContrato =
  | 'indefinido'
  | 'plazo_fijo'
  | 'eventual'
  | 'pasantia'
  | 'monotributo'
  | 'otro';

export type EstadoContrato =
  | 'vigente'
  | 'por_vencer'
  | 'vencido'
  | 'rescindido';

export interface Contrato {
  id: string;
  organization_id: string;
  personnel_id: string;
  personnel_nombre?: string;
  tipo: TipoContrato;
  fecha_inicio: string; // ISO date
  fecha_fin?: string;   // null = indefinido
  categoria?: string;
  remuneracion_bruta?: number;
  estado: EstadoContrato;
  archivo_url?: string;
  archivo_nombre?: string;
  notas?: string;
  alerta_dias?: number; // días antes del vencimiento para alertar
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type ContratoCreate = Omit<Contrato, 'id' | 'created_at' | 'updated_at' | 'estado'>;

// ─────────────────────────────────────────────────────────────
// ATS — ATRACCIÓN Y SELECCIÓN
// ─────────────────────────────────────────────────────────────

export type EstadoVacante =
  | 'borrador'
  | 'publicada'
  | 'en_proceso'
  | 'suspendida'
  | 'cerrada';

export type ModalidadVacante = 'presencial' | 'remoto' | 'hibrido';

export interface Vacante {
  id: string;
  organization_id: string;
  titulo: string;
  departamento_id?: string;
  departamento_nombre?: string;
  position_id?: string;
  position_nombre?: string;
  descripcion?: string;
  requisitos?: string;
  modalidad: ModalidadVacante;
  ubicacion?: string;
  remuneracion_desde?: number;
  remuneracion_hasta?: number;
  estado: EstadoVacante;
  fecha_apertura: string;
  fecha_cierre_estimada?: string;
  responsable_id?: string;
  responsable_nombre?: string;
  cantidad_posiciones: number;
  candidatos_count?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type VacanteCreate = Omit<Vacante, 'id' | 'created_at' | 'updated_at' | 'candidatos_count'>;

export type EtapaSeleccion =
  | 'postulado'
  | 'screening'
  | 'entrevista_hr'
  | 'entrevista_tecnica'
  | 'oferta'
  | 'contratado'
  | 'descartado';

export interface Candidato {
  id: string;
  organization_id: string;
  vacante_id: string;
  vacante_titulo?: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  cv_url?: string;
  etapa: EtapaSeleccion;
  puntaje?: number; // 1-5
  notas?: string;
  motivo_descarte?: string;
  fecha_postulacion: string;
  personnel_id?: string; // vinculado al crear el empleado
  created_at: string;
  updated_at: string;
}

export type CandidatoCreate = Omit<Candidato, 'id' | 'created_at' | 'updated_at'>;

// ─────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────

export type EstadoTareaOnboarding = 'pendiente' | 'en_proceso' | 'completada' | 'omitida';

export interface TareaOnboarding {
  id: string;
  titulo: string;
  descripcion?: string;
  responsable_id?: string;
  responsable_nombre?: string;
  fecha_limite?: string;
  estado: EstadoTareaOnboarding;
  orden: number;
  categoria: 'documentacion' | 'accesos' | 'equipamiento' | 'capacitacion' | 'presentacion' | 'otro';
  completada_en?: string;
  notas?: string;
}

export interface Onboarding {
  id: string;
  organization_id: string;
  personnel_id: string;
  personnel_nombre?: string;
  fecha_ingreso: string;
  buddy_id?: string;
  buddy_nombre?: string;
  tareas: TareaOnboarding[];
  progreso: number; // 0-100
  estado: 'en_proceso' | 'completado' | 'cancelado';
  candidato_id?: string; // si vino del ATS
  notas?: string;
  created_at: string;
  updated_at: string;
}

export type OnboardingCreate = Omit<Onboarding, 'id' | 'created_at' | 'updated_at' | 'progreso'>;

// ─────────────────────────────────────────────────────────────
// OFFBOARDING
// ─────────────────────────────────────────────────────────────

export type MotivoEgreso =
  | 'renuncia_voluntaria'
  | 'despido_causa'
  | 'despido_sin_causa'
  | 'fin_contrato'
  | 'jubilacion'
  | 'mutuo_acuerdo'
  | 'fallecimiento'
  | 'otro';

export interface TareaOffboarding {
  id: string;
  titulo: string;
  descripcion?: string;
  responsable_id?: string;
  responsable_nombre?: string;
  fecha_limite?: string;
  estado: EstadoTareaOnboarding;
  orden: number;
  categoria: 'documentacion' | 'accesos' | 'equipamiento' | 'liquidacion' | 'entrevista' | 'otro';
  completada_en?: string;
  notas?: string;
}

export interface EntrevistaEgreso {
  fecha?: string;
  motivo_declarado?: string;
  aspectos_positivos?: string;
  aspectos_negativos?: string;
  recomendaria_empresa?: boolean;
  puntuacion_satisfaccion?: number; // 1-5
  comentarios_adicionales?: string;
}

export interface Offboarding {
  id: string;
  organization_id: string;
  personnel_id: string;
  personnel_nombre?: string;
  fecha_egreso: string;
  motivo: MotivoEgreso;
  tareas: TareaOffboarding[];
  progreso: number; // 0-100
  estado: 'en_proceso' | 'completado' | 'cancelado';
  entrevista_egreso?: EntrevistaEgreso;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export type OffboardingCreate = Omit<Offboarding, 'id' | 'created_at' | 'updated_at' | 'progreso'>;

// ─────────────────────────────────────────────────────────────
// PLUGIN B — rrhh_operaciones
// ─────────────────────────────────────────────────────────────

// PLANIFICACIÓN DE RRHH / HEADCOUNT
export interface PlanificacionHeadcount {
  id: string;
  organization_id: string;
  periodo: string; // 'YYYY' o 'YYYY-S1'
  departamento_id: string;
  departamento_nombre?: string;
  headcount_actual: number;
  headcount_objetivo: number;
  motivo?: string;
  estado: 'borrador' | 'aprobado' | 'en_revision';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ASISTENCIA Y PRESENTISMO
export type TipoFichaje = 'presencial' | 'remoto' | 'ausente' | 'licencia' | 'vacaciones' | 'feriado';

export interface Fichaje {
  id: string;
  organization_id: string;
  personnel_id: string;
  personnel_nombre?: string;
  fecha: string; // YYYY-MM-DD
  tipo: TipoFichaje;
  hora_entrada?: string; // HH:mm
  hora_salida?: string;  // HH:mm
  horas_trabajadas?: number;
  justificacion?: string;
  aprobado?: boolean;
  aprobado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface Ausencia {
  id: string;
  organization_id: string;
  personnel_id: string;
  personnel_nombre?: string;
  tipo: 'enfermedad' | 'vacaciones' | 'licencia_sin_sueldo' | 'licencia_con_sueldo' | 'maternidad' | 'paternidad' | 'otro';
  desde: string;
  hasta: string;
  dias_habiles?: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo?: string;
  archivo_url?: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// PLUGIN C — rrhh_estrategico
// ─────────────────────────────────────────────────────────────

// CLIMA Y BIENESTAR
export interface EncuestaClima {
  id: string;
  organization_id: string;
  titulo: string;
  descripcion?: string;
  periodo: string; // 'Q1-2026', '2026-03', etc.
  estado: 'borrador' | 'activa' | 'cerrada';
  fecha_inicio: string;
  fecha_cierre?: string;
  total_invitados?: number;
  total_respuestas?: number;
  puntaje_promedio?: number; // 1-10
  departamentos?: string[]; // IDs de departamentos incluidos
  resultados?: {
    categoria: string;
    puntaje: number;
    comentarios?: string[];
  }[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// GESTIÓN DEL TALENTO
export type ReadinessScore = 'listo' | 'en_desarrollo' | 'requiere_plan';

export interface PlanCarrera {
  id: string;
  organization_id: string;
  personnel_id: string;
  personnel_nombre?: string;
  position_actual_id?: string;
  position_objetivo_id?: string;
  position_objetivo_nombre?: string;
  horizonte_anios: number; // 1, 2, 3, 5
  competencias_a_desarrollar: string[]; // IDs de competencias
  acciones: {
    id: string;
    descripcion: string;
    tipo: 'capacitacion' | 'mentoring' | 'proyecto' | 'rotacion' | 'otro';
    fecha_objetivo?: string;
    estado: 'pendiente' | 'en_curso' | 'completada';
  }[];
  readiness: ReadinessScore;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface TalentoIdentificado {
  id: string;
  organization_id: string;
  personnel_id: string;
  personnel_nombre?: string;
  potencial: 1 | 2 | 3; // 1=bajo, 2=medio, 3=alto (eje Y 9-box)
  desempeno: 1 | 2 | 3;  // 1=bajo, 2=medio, 3=alto (eje X 9-box)
  categoria_9box?: string; // calculado
  es_critico: boolean;
  sucesor_de?: string; // position_id
  etiquetas?: string[];
  notas?: string;
  updated_at: string;
  created_at: string;
}

// RELACIONES LABORALES
export type TipoAcuerdo = 'acta_acuerdo' | 'convenio_colectivo' | 'contrato_individual' | 'reglamento' | 'otro';

export interface AcuerdoLaboral {
  id: string;
  organization_id: string;
  titulo: string;
  tipo: TipoAcuerdo;
  partes?: string;
  fecha_firma: string;
  fecha_vigencia_hasta?: string;
  estado: 'vigente' | 'vencido' | 'rescindido';
  archivo_url?: string;
  archivo_nombre?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface IncidenteLaboral {
  id: string;
  organization_id: string;
  personnel_id?: string;
  personnel_nombre?: string;
  tipo: 'conflicto' | 'sancion' | 'queja' | 'accidente' | 'reclamo' | 'otro';
  descripcion: string;
  fecha: string;
  estado: 'abierto' | 'en_gestion' | 'resuelto' | 'cerrado';
  resolucion?: string;
  created_at: string;
  updated_at: string;
}
