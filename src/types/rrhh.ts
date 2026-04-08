// Tipos para el módulo de Recursos Humanos

// ===== NUEVOS TIPOS PARA SISTEMA DE COMPETENCIAS =====

export interface Competence {
  id: string; // Auto-generado por Firestore
  nombre: string; // Ej: "Trabajo en equipo", "Interpretación de planos"
  categoria: CompetenceCategory; // Default categories (legacy)
  categoriaId?: string; // Custom category ID (for editable categories per org)
  categoriaNombre?: string; // Cache del nombre de categoría custom
  descripcion: string; // Descripción detallada
  fuente: string; // 'interna' | 'iso_9001' | 'cliente' | 'legal'
  referenciaNorma?: string; // Ej: "ISO 9001:2015 7.2" (opcional)
  activo: boolean; // default true
  organization_id?: string; // Multi-tenant
  created_at: Date;
  updated_at: Date;
}

// Categorías por defecto (legacy, backwards compatible)
export type CompetenceCategory =
  | 'tecnica'
  | 'blanda'
  | 'seguridad'
  | 'iso_9001'
  | 'otra';

// Categoría personalizable por organización
export interface CompetenceCategoryConfig {
  id: string;
  nombre: string; // Ej: "Ventas", "Producción", "Calidad"
  descripcion?: string;
  color?: string; // Color para UI (hex)
  orden?: number; // Orden de display
  organization_id: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CompetenceFormData {
  organization_id: string; // Required for multi-tenant
  nombre: string;
  categoria: CompetenceCategory;
  categoriaId?: string;
  descripcion: string;
  fuente: string;
  referenciaNorma?: string;
  activo?: boolean;
}

export interface CompetenceFilters {
  search?: string;
  categoria?: CompetenceCategory;
  activo?: boolean;
  organization_id?: string;
}

// ===== TIPOS PARA ANÁLISIS DE BRECHAS =====

export interface CompetenceEvaluation {
  competenciaId: string; // ID de la competencia
  nombreCompetencia: string; // Nombre (desnormalizado para reportes)
  nivelRequerido: number; // Nivel que requiere el puesto (1-5)
  nivelEvaluado: number; // Nivel alcanzado por el empleado (1-5)
  observaciones?: string; // Comentarios del evaluador (opcional)
  brecha: number; // Calculado: nivelRequerido - nivelEvaluado
}

export interface CompetenceGap {
  personnelId: string;
  personnelName: string;
  puestoId: string;
  puestoName: string;
  competenciaId: string;
  competenciaNombre: string;
  nivelRequerido: number;
  nivelActual: number;
  brecha: number; // nivelRequerido - nivelActual
  severidad: 'critica' | 'media' | 'baja'; // Basado en tamaño de brecha
  capacitacionesSugeridas: string[]; // IDs de trainings recomendados
  fechaUltimaEvaluacion?: Date;
}

// ===== TIPOS PARA SISTEMA DE ALERTAS =====

export interface EvaluationAlert {
  personnelId: string;
  personnelName: string;
  puestoId: string;
  puestoName: string;
  ultimaEvaluacion?: Date;
  proximaEvaluacion: Date;
  diasRestantes: number; // Días hasta próxima evaluación
  estado: 'proxima' | 'vencida'; // proxima: <30 días, vencida: <0 días
  frecuenciaEvaluacion: number; // Meses
}

// ===== TIPOS PARA REPORTES =====

export interface CompetenceReport {
  organizationId: string;
  fechaGeneracion: Date;
  periodo: string;
  totalEmpleados: number;
  totalCompetencias: number;
  coberturaPromedio: number;
  brechasCriticas: number;
  brechasMedias: number;
  brechasBajas: number;
  capacitacionesPendientes: number;
}

export interface CoverageMetrics {
  totalEmpleados: number;
  empleadosConBrechas: number;
  porcentajeCobertura: number;
  brechasPorSeveridad: {
    critica: number;
    media: number;
    baja: number;
  };
  capacitacionesSugeridas: number;
}

// ===== MODIFICACIONES A TIPOS EXISTENTES =====

export interface Department {
  id: string;
  nombre: string; // Cambiado de 'name' a 'nombre' para consistencia
  descripcion?: string; // Cambiado de 'description'
  // Jerarquía opcional - un departamento puede depender de otro
  parent_id?: string; // ID del departamento padre (opcional)
  is_active: boolean;
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Position {
  id: string;
  organization_id: string;
  nombre: string;
  descripcion_responsabilidades?: string;
  requisitos_experiencia?: string;
  requisitos_formacion?: string;

  // Relaciones organizacionales
  departamento_id: string; // ⚠️ REQUERIDO - No puede existir Puesto sin Departamento
  reporta_a_id?: string;

  // Competencias requeridas para el puesto (con nivel)
  competenciasRequeridas?: PositionCompetence[];
  frecuenciaEvaluacion?: number; // Meses (sugerido)
  nivel?: PositionLevel; // 'operativo' | 'tecnico' | 'gerencial'

  // Asignaciones de contexto ELIMINADAS - ahora solo en Personnel
  // procesos_asignados, objetivos_asignados, indicadores_asignados

  // Metadata
  is_active?: boolean;
  created_at: Date;
  updated_at: Date;
}

// Competencia asignada a un puesto con nivel requerido
export interface PositionCompetence {
  competenciaId: string;
  nombreCompetencia: string; // Desnormalizado para visualización
  nivelRequerido: number; // 1-5
  esCritica?: boolean; // Si es crítica para el puesto
}

export type PositionLevel = 'operativo' | 'tecnico' | 'gerencial';

export interface Personnel {
  id: string;
  organization_id: string;
  user_id?: string; // ✅ Opcional: NULL si no tiene acceso al sistema

  // Datos básicos
  nombres: string;
  apellidos: string;
  email?: string; // ✅ Opcional: Solo si tiene acceso al sistema
  telefono?: string;
  documento_identidad?: string;
  fecha_nacimiento?: Date;
  nacionalidad?: string;
  direccion?: string;
  telefono_emergencia?: string;
  fecha_contratacion?: Date;
  numero_legajo?: string;
  estado: 'Activo' | 'Inactivo' | 'Licencia';
  meta_mensual: number;
  comision_porcentaje: number;
  supervisor_id?: string;
  especialidad_ventas?: string;
  fecha_inicio_ventas?: Date;
  tipo_personal:
    | 'administrativo'
    | 'ventas'
    | 'técnico'
    | 'supervisor'
    | 'gerencial';
  zona_venta?: string;

  // Acceso al sistema
  tiene_acceso_sistema: boolean; // ✅ NUEVO: Indica si tiene usuario del sistema

  // Información organizacional - Cadena: Department → Position → Personnel
  // ⚠️ puesto_id es conceptualmente requerido (validar en formulario/servicio)
  puesto_id?: string; // ID de Position - requerido para operar
  departamento_id?: string; // Se deriva de Position.departamento_id (desnormalizado)
  puesto?: string; // Texto desnormalizado para display
  departamento?: string; // Texto desnormalizado para display
  supervisor_nombre?: string;

  // Campos adicionales para UI
  foto?: string;
  fecha_ingreso?: Date | { seconds: number; nanoseconds: number };
  salario?: string;
  certificaciones?: string[];
  ultima_evaluacion?: Date | { seconds: number; nanoseconds: number };

  // Asignaciones de contexto (ÚNICO LUGAR - Core del sistema)
  procesos_asignados?: string[]; // Array of processDefinition IDs
  objetivos_asignados?: string[]; // Array of qualityObjective IDs
  indicadores_asignados?: string[]; // Array of qualityIndicator IDs

  // Sistema de competencias
  competenciasActuales?: CompetenceStatus[];
  capacitacionesRealizadas?: string[];
  evaluaciones?: string[];

  created_at: Date;
  updated_at: Date;
}

export interface CompetenceStatus {
  competenciaId: string;
  nivelAlcanzado: number;
  fechaUltimaEvaluacion: Date;
}

export interface Training {
  id: string;
  tema: string;
  descripcion?: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  horas?: number;
  modalidad: 'presencial' | 'virtual' | 'mixta';
  proveedor?: string;
  costo?: number;
  estado: 'planificada' | 'en_curso' | 'completada' | 'cancelada';
  certificado_url?: string;
  participantes: string[];

  // ===== RESPONSABLE =====
  responsable_id?: string; // Usuario responsable de la capacitación
  responsable_nombre?: string; // Nombre del responsable (cache)

  // ===== VINCULACIÓN CON COMPETENCIAS =====
  competenciasDesarrolladas?: string[]; // IDs de competencias que desarrolla (opcional)
  evaluacionPosterior?: boolean; // ¿Requiere evaluación post-capacitación? (opcional)
  evaluacionPosteriorId?: string; // ID de evaluación post (si existe)

  // ===== INTEGRACIÓN CON CALENDARIO =====
  calendar_event_id?: string; // ID del evento en calendario (legacy)
  event_id?: string; // ID del evento en colección events unificada

  created_at: Date;
  updated_at: Date;
  organization_id?: string; // Multi-tenant
}

export interface PerformanceEvaluation {
  id: string;
  titulo?: string; // Título de la evaluación grupal
  periodo?: string; // Ej: 2026-Q1
  fecha_evaluacion: Date;

  // ===== RESPONSABLE =====
  responsable_id?: string; // Usuario responsable de la evaluación
  responsable_nombre?: string; // Nombre del responsable (cache)
  evaluador_id?: string; // DEPRECATED: usar responsable_id

  // ===== TIPO DE EVALUACIÓN =====
  tipo?: EvaluationType; // 'evaluacion_competencias' | 'evaluacion_capacitacion'
  capacitacionId?: string; // Si tipo='evaluacion_capacitacion', referencia al Training

  // ===== MODELO GRUPAL =====
  // Competencias fijas que se evalúan a TODOS los empleados
  competencias_a_evaluar?: EvaluationCompetence[];

  // Empleados del grupo con sus evaluaciones individuales
  empleados_evaluados?: EmployeeEvaluationResult[];

  // ===== CAMPOS ADICIONALES =====
  resultado_global?: EvaluationResult; // Resumen general
  comentarios_generales?: string;
  plan_mejora?: string;
  estado?: 'borrador' | 'publicado' | 'cerrado'; // Default: borrador
  organization_id?: string; // Multi-tenant

  // ===== INTEGRACIÓN CON CALENDARIO =====
  calendar_event_id?: string; // ID del evento en calendario (legacy)
  event_id?: string; // ID del evento en colección events unificada

  // Legacy fields (deprecated, for backwards compatibility)
  personnel_id?: string;
  puestoId?: string;
  competencias?: CompetenceEvaluation[];
  fechaProximaEvaluacion?: Date | null;

  created_at: Date;
  updated_at: Date;
}

export type EvaluationType =
  | 'evaluacion_competencias'
  | 'evaluacion_capacitacion';

// Competencia a evaluar en el grupo (nivel requerido fijo para todos)
export interface EvaluationCompetence {
  competenciaId: string;
  nombreCompetencia: string;
  nivelRequerido: number; // 1-5
}

// Resultado de evaluación de un empleado
export interface EmployeeEvaluationResult {
  personnelId: string;
  nombreEmpleado: string; // Cache para display
  puestoId?: string;
  puestoNombre?: string;
  // Array de niveles evaluados, mismo orden que competencias_a_evaluar
  evaluaciones: EmployeeCompetenceScore[];
  resultado?: EvaluationResult; // Resultado individual
  observaciones?: string;
}

// Score de una competencia para un empleado
export interface EmployeeCompetenceScore {
  competenciaId: string;
  nivelEvaluado: number; // 0 = sin evaluar, 1-5
  brecha: number; // nivelEvaluado - nivelRequerido
  observaciones?: string;
}

export type EvaluationResult = 'Apto' | 'No Apto' | 'Requiere Capacitación';

// Tipos para formularios
export interface DepartmentFormData {
  nombre: string;
  descripcion?: string;
  responsable_id?: string;
  is_active: boolean;
}

export interface PositionFormData {
  nombre: string;
  descripcion_responsabilidades?: string;
  requisitos_experiencia?: string;
  requisitos_formacion?: string;

  // Relaciones organizacionales
  departamento_id?: string;
  reporta_a_id?: string;

  // Competencias del puesto (ahora objetos, no solo IDs)
  competenciasRequeridas?: PositionCompetence[];
  frecuenciaEvaluacion?: number;
  nivel?: PositionLevel;

  // Asignaciones de contexto
  procesos_asignados?: string[];
  objetivos_asignados?: string[];
  indicadores_asignados?: string[];
}

// Tipo extendido con datos expandidos y conteo de personal
export interface PositionWithAssignments extends Position {
  procesos_asignados?: string[]; // Array of processDefinition IDs
  objetivos_asignados?: string[]; // Array of qualityObjective IDs
  indicadores_asignados?: string[]; // Array of qualityIndicator IDs
  procesos_details?: unknown[]; // ProcessDefinition[] - evitamos import circular
  objetivos_details?: unknown[]; // QualityObjective[] - evitamos import circular
  indicadores_details?: unknown[]; // QualityIndicator[] - evitamos import circular
  personnel_count?: number; // Cantidad de personas en este puesto
}

// Form data para asignaciones de contexto
export interface PositionAssignmentsFormData {
  procesos_asignados: string[];
  objetivos_asignados: string[];
  indicadores_asignados: string[];
}

export interface PersonnelFormData {
  user_id?: string; // ✅ Para vincular con Firebase Auth (opcional)
  nombres: string;
  apellidos: string;
  email?: string; // ✅ Opcional: Solo si tiene acceso
  telefono?: string;
  documento_identidad?: string;
  fecha_nacimiento?: Date;
  nacionalidad?: string;
  direccion?: string;
  telefono_emergencia?: string;
  fecha_contratacion?: Date;
  numero_legajo?: string;
  estado: 'Activo' | 'Inactivo' | 'Licencia';
  meta_mensual: number;
  comision_porcentaje: number;
  supervisor_id?: string;
  especialidad_ventas?: string;
  fecha_inicio_ventas?: Date;
  tipo_personal:
    | 'administrativo'
    | 'ventas'
    | 'técnico'
    | 'supervisor'
    | 'gerencial';
  zona_venta?: string;

  // Acceso al sistema
  tiene_acceso_sistema: boolean; // ✅ NUEVO: Si necesita usuario del sistema

  // Información organizacional (TEXTO LIBRE)
  puesto?: string; // ✅ MODIFICADO: Texto libre
  departamento?: string; // ✅ MODIFICADO: Texto libre
  supervisor?: string;

  // Campos adicionales
  foto?: string;
  fecha_ingreso?: Date;
  salario?: string;
  certificaciones?: string[];

  // Asignaciones de contexto
  procesos_asignados?: string[];
  objetivos_asignados?: string[];
  indicadores_asignados?: string[];

  // Sistema de competencias
  competenciasActuales?: CompetenceStatus[];
  capacitacionesRealizadas?: string[];
  evaluaciones?: string[];
}

export interface TrainingFormData {
  tema: string;
  descripcion?: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  horas?: number;
  modalidad: 'presencial' | 'virtual' | 'mixta';
  proveedor?: string;
  costo?: number;
  estado: 'planificada' | 'en_curso' | 'completada' | 'cancelada';
  certificado_url?: string;
  participantes: string[];

  // ===== RESPONSABLE =====
  responsable_id?: string;
  responsable_nombre?: string;

  // ===== COMPETENCIAS =====
  competenciasDesarrolladas?: string[]; // Opcional
  evaluacionPosterior?: boolean; // Opcional
  organization_id?: string;
}

export interface PerformanceEvaluationFormData {
  personnel_id: string;
  periodo: string;
  fecha_evaluacion: Date;
  evaluador_id: string;

  // ===== MODIFICACIÓN: ESTRUCTURA MEJORADA =====
  competencias: CompetenceEvaluation[];

  // ===== NUEVOS CAMPOS =====
  puestoId?: string; // Opcional por ahora
  resultado_global: EvaluationResult;
  fechaProximaEvaluacion?: Date; // Opcional

  comentarios_generales?: string;
  plan_mejora?: string;
  estado: 'borrador' | 'publicado' | 'cerrado';
}

// Tipos para filtros y búsqueda
export interface DepartmentFilters {
  search?: string;
  is_active?: boolean;
  responsible_user_id?: string;
}

export interface PositionFilters {
  search?: string;
  departamento_id?: string;
  reporta_a_id?: string;
}

export interface PersonnelFilters {
  search?: string;
  estado?: 'Activo' | 'Inactivo' | 'Licencia';
  tipo_personal?:
    | 'administrativo'
    | 'ventas'
    | 'técnico'
    | 'supervisor'
    | 'gerencial';
  supervisor_id?: string;
}

export interface TrainingFilters {
  search?: string;
  estado?: 'planificada' | 'en_curso' | 'completada' | 'cancelada';
  modalidad?: 'presencial' | 'virtual' | 'mixta';
  fecha_inicio?: Date;
  fecha_fin?: Date;
}

export interface PerformanceEvaluationFilters {
  search?: string;
  estado?: 'borrador' | 'publicado' | 'cerrado';
  periodo?: string;
  personnel_id?: string;
  evaluador_id?: string;
}

// Tipos para paginación
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos para estadísticas del dashboard
export interface RRHHStats {
  total_personnel: number;
  active_personnel: number;
  total_departments: number;
  active_departments: number;
  total_positions: number;
  active_trainings: number;
  pending_evaluations: number;
  completed_trainings: number;
}

// Tipos para relaciones extendidas
export interface PersonnelWithRelations extends Personnel {
  department?: Department;
  position?: Position;
  supervisor?: Personnel;
  subordinates?: Personnel[];
}

export interface TrainingWithRelations extends Training {
  participants_data?: Personnel[];
}

export interface PerformanceEvaluationWithRelations
  extends PerformanceEvaluation {
  personnel_data?: Personnel;
  evaluador_data?: Personnel;
}

// Tipos para Kanban
export interface KanbanItem {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assignee?: string;
  dueDate?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  maxItems?: number;
  allowDrop: boolean;
  order: number;
}

// Tipos para filtros y paginación
export interface TrainingFilters {
  search?: string;
  estado?: Training['estado'];
  modalidad?: Training['modalidad'];
  fecha_inicio?: Date;
  fecha_fin?: Date;
}

export interface PerformanceEvaluationFilters {
  search?: string;
  estado?: PerformanceEvaluation['estado'];
  periodo?: string;
  personnel_id?: string;
  evaluador_id?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
