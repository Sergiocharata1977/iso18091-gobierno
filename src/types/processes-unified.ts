/**
 * Tipos Unificados para Gestión de Procesos ISO 9001
 *
 * Este archivo unifica los tipos de procesos.ts y processRecords.ts
 * e implementa el modelo SIPOC estructurado para seguimiento automático.
 *
 * @see PLAN_SIPOC_IMPLEMENTATION.md para detalles de implementación
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// CATEGORÍAS ISO 9001
// ============================================

export type ProcessCategoryId = 1 | 2 | 3 | 4;
export type ProcessCategoryName =
  | 'estrategia'
  | 'soporte'
  | 'operativo'
  | 'evaluacion';

export const PROCESS_CATEGORIES = {
  1: {
    id: 1,
    name: 'estrategia',
    label: 'Estrategia',
    color: 'bg-blue-100 text-blue-800',
  },
  2: {
    id: 2,
    name: 'soporte',
    label: 'Soporte',
    color: 'bg-yellow-100 text-yellow-800',
  },
  3: {
    id: 3,
    name: 'operativo',
    label: 'Operativo (Core)',
    color: 'bg-green-100 text-green-800',
  },
  4: {
    id: 4,
    name: 'evaluacion',
    label: 'Evaluación',
    color: 'bg-purple-100 text-purple-800',
  },
} as const;

// ============================================
// MODELO SIPOC ESTRUCTURADO
// ============================================

/**
 * Input de un proceso (SUPPLIERS → INPUTS)
 */
export interface ProcessInput {
  id: string;
  description: string;
  supplier?: string; // Quién provee (texto o ID)
  linked_process_id?: string; // Proceso que genera esta entrada
  linked_document_id?: string; // Documento asociado (ej: especificación)
  required: boolean; // ¿Es obligatorio?
  validation_criteria?: string; // Criterios de aceptación
}

/**
 * Actividad de un proceso (PROCESS)
 */
export interface ProcessActivity {
  id: string;
  step: number; // Orden de ejecución
  name: string; // Nombre corto
  description: string; // Descripción detallada
  responsible_position_id?: string; // Puesto responsable (FK a positions)
  record_template_id?: string; // Registro/checklist asociado
  estimated_duration?: string; // Duración estimada (ej: "2 horas")
  dependencies?: string[]; // IDs de actividades previas requeridas
  audit_questions?: string[]; // Preguntas de auditoría generadas por IA
}

/**
 * Output de un proceso (OUTPUTS → CUSTOMERS)
 */
export interface ProcessOutput {
  id: string;
  description: string;
  customer?: string; // Quién recibe (interno/externo)
  linked_process_id?: string; // Proceso que consume esta salida
  linked_document_id?: string; // Documento generado (ej: informe)
  quality_criteria?: string; // Criterios de calidad del output
  delivery_frequency?: string; // Frecuencia de entrega
}

/**
 * Control de un proceso
 */
export interface ProcessControl {
  id: string;
  description: string;
  type: 'indicator' | 'checklist' | 'inspection' | 'review'; // Tipo de control
  linked_indicator_id?: string; // Indicador del módulo de Calidad (FK)
  frequency: string; // Frecuencia de ejecución
  responsible_position_id?: string; // Quién ejecuta el control
  acceptance_criteria?: string; // Criterios de aceptación
  alert_threshold?: number; // Umbral para alertas automáticas
}

/**
 * Riesgo de un proceso (AMFE integrado)
 */
export interface ProcessRisk {
  id: string;
  description: string;
  cause?: string; // Causa raíz
  effect?: string; // Efecto potencial
  current_control?: string; // Control actual
  severity: 'baja' | 'media' | 'alta' | 'critica'; // Severidad
  probability: 'baja' | 'media' | 'alta'; // Probabilidad
  detection: 'baja' | 'media' | 'alta'; // Detectabilidad
  rpn?: number; // Risk Priority Number (S x P x D)
  linked_finding_ids?: string[]; // Hallazgos relacionados (FK a findings)
  mitigation_action_id?: string; // Acción de mitigación (FK a actions)
}

/**
 * Indicador vinculado al proceso
 */
export interface ProcessLinkedIndicator {
  indicator_id: string; // FK a quality_indicators
  current_value?: number; // Valor actual
  target_value?: number; // Meta
  status: 'ok' | 'warning' | 'critical'; // Estado
  last_measurement_date?: Date | Timestamp;
}

/**
 * Sugerencia de IA para el proceso
 */
export interface ProcessAISuggestion {
  type:
    | 'missing_control'
    | 'missing_indicator'
    | 'risk_not_mitigated'
    | 'activity_without_record';
  description: string;
  priority: 'low' | 'medium' | 'high';
  created_at: Date | Timestamp;
}

/**
 * Metadatos de seguimiento de cumplimiento
 */
export interface ProcessComplianceTracking {
  last_audit_date?: Date | Timestamp; // Última auditoría del proceso
  last_audit_score?: number; // Score de la última auditoría (0-100)
  pending_findings_count?: number; // Hallazgos abiertos relacionados
  maturity_level?: 1 | 2 | 3 | 4 | 5; // Nivel de madurez del proceso
  linked_indicators?: ProcessLinkedIndicator[];
  ai_suggestions?: ProcessAISuggestion[];
}

/**
 * Estructura SIPOC completa del proceso
 */
export interface ProcessSIPOC {
  inputs: ProcessInput[];
  activities: ProcessActivity[];
  outputs: ProcessOutput[];
  controls: ProcessControl[];
  risks: ProcessRisk[];
  compliance_tracking?: ProcessComplianceTracking;
}

// ============================================
// DEFINICIÓN DE PROCESO UNIFICADA
// ============================================

export type ProcessStatus = 'draft' | 'active' | 'obsolete' | 'under_review';

/**
 * Definición de Proceso Unificada
 * Combina campos de procesos.ts y processRecords.ts
 * Agrega estructura SIPOC para seguimiento automático
 */
export interface ProcessDefinition {
  id: string;
  organization_id: string;

  // ===== IDENTIFICACIÓN =====
  process_code: string; // Código único (ej: "PROC-PROD-001")
  nombre: string; // Nombre del proceso
  descripcion?: string; // Descripción corta
  descripcion_detallada?: string; // Descripción larga
  objetivo?: string; // Objetivo del proceso
  alcance?: string; // Alcance del proceso

  // ===== CATEGORIZACIÓN ISO 9001 =====
  category_id: ProcessCategoryId; // 1=Estrategia, 2=Soporte, 3=Operativo, 4=Evaluación
  category_name?: ProcessCategoryName; // Desnormalizado para performance

  // ===== SIPOC ESTRUCTURADO =====
  sipoc: ProcessSIPOC;

  // ===== RESPONSABILIDADES =====
  owner_position_id?: string | null; // Dueño del proceso (FK a positions)
  owner_name?: string; // Desnormalizado
  jefe_proceso_id?: string | null; // Jefe del proceso (FK a personnel)
  jefe_proceso_nombre?: string; // Desnormalizado
  departamento_responsable_id?: string | null; // Departamento responsable (FK a departments)
  departamento_responsable_nombre?: string | null; // Desnormalizado
  funciones_involucradas?: string[]; // Funciones involucradas

  // ===== VERSIONADO =====
  version: string; // Versionado (ej: "1.2")
  version_number?: number; // Número de versión (1, 2, 3...)
  vigente?: boolean; // true = versión actual, false = histórico
  version_anterior_id?: string | null; // ID de la versión anterior

  // ===== ESTADO =====
  status: ProcessStatus;
  activo: boolean; // Mantener por compatibilidad

  // ===== RELACIONES =====
  parent_process_id?: string | null; // Proceso padre (si es subproceso)
  related_norm_points?: string[]; // Puntos de norma ISO relacionados
  documento_origen_id?: string | null; // Documento de origen
  documentos_ids?: string[]; // IDs de documentos relacionados

  // ===== REGISTROS =====
  etapas_default?: string[]; // Etapas por defecto para registros
  tipo_registros?: 'vincular' | 'crear' | 'ambos'; // Cómo maneja registros
  modulo_vinculado?: 'mejoras' | 'auditorias' | 'nc' | null; // Si vincula a otro módulo

  // ===== AUDITORÍA =====
  created_by: string;
  created_at: Date | Timestamp;
  updated_by: string;
  updated_at: Date | Timestamp;
  approved_by?: string;
  approved_at?: Date | Timestamp;
}

/**
 * Datos de formulario para crear/editar proceso
 */
export interface ProcessDefinitionFormData {
  // Campos básicos
  nombre: string; // REQUERIDO
  descripcion?: string;
  descripcion_detallada?: string;
  objetivo?: string;
  alcance?: string;

  // Categorización
  category_id?: ProcessCategoryId;
  process_code?: string;

  // Responsabilidades
  owner_position_id?: string;
  jefe_proceso_id?: string;
  departamento_responsable_id?: string;
  departamento_responsable_nombre?: string | null;
  funciones_involucradas?: string[];

  // SIPOC (opcional en creación, se puede agregar después)
  sipoc?: Partial<ProcessSIPOC>;

  // Estado
  status?: ProcessStatus;
  activo?: boolean;

  // Relaciones
  parent_process_id?: string;
  related_norm_points?: string[];
  documento_origen_id?: string;

  // Registros
  etapas_default?: string[];
  tipo_registros?: 'vincular' | 'crear' | 'ambos';
  modulo_vinculado?: 'mejoras' | 'auditorias' | 'nc' | null;

  // Multi-tenant
  organization_id?: string;
}

// ============================================
// HELPERS Y UTILIDADES
// ============================================

/**
 * Genera un ID único para elementos SIPOC
 */
export function generateSIPOCElementId(
  type: 'input' | 'activity' | 'output' | 'control' | 'risk'
): string {
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calcula el RPN (Risk Priority Number) de un riesgo
 */
export function calculateRPN(risk: ProcessRisk): number {
  const severityMap = { baja: 1, media: 5, alta: 8, critica: 10 };
  const probabilityMap = { baja: 1, media: 5, alta: 10 };
  const detectionMap = { baja: 10, media: 5, alta: 1 }; // Invertido: baja detección = alto riesgo

  const s = severityMap[risk.severity];
  const p = probabilityMap[risk.probability];
  const d = detectionMap[risk.detection];

  return s * p * d;
}

/**
 * Valida si un SIPOC está completo
 */
export function validateSIPOC(sipoc: ProcessSIPOC): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validaciones críticas
  if (!sipoc.activities || sipoc.activities.length === 0) {
    errors.push('El proceso debe tener al menos una actividad');
  }

  // Validaciones de advertencia
  if (!sipoc.inputs || sipoc.inputs.length === 0) {
    warnings.push('El proceso no tiene inputs definidos');
  }

  if (!sipoc.outputs || sipoc.outputs.length === 0) {
    warnings.push('El proceso no tiene outputs definidos');
  }

  if (!sipoc.controls || sipoc.controls.length === 0) {
    warnings.push('El proceso no tiene controles definidos');
  }

  if (!sipoc.risks || sipoc.risks.length === 0) {
    warnings.push('El proceso no tiene riesgos identificados');
  }

  // Validar que actividades tengan orden secuencial
  const steps = sipoc.activities.map(a => a.step).sort((a, b) => a - b);
  for (let i = 0; i < steps.length; i++) {
    if (steps[i] !== i + 1) {
      errors.push(
        `Las actividades deben tener pasos secuenciales (falta el paso ${i + 1})`
      );
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Crea un SIPOC vacío con estructura inicial
 */
export function createEmptySIPOC(): ProcessSIPOC {
  return {
    inputs: [],
    activities: [],
    outputs: [],
    controls: [],
    risks: [],
    compliance_tracking: {
      pending_findings_count: 0,
      linked_indicators: [],
      ai_suggestions: [],
    },
  };
}

// ============================================
// COMPLIANCE & REPORTING
// ============================================

export interface Inconsistency {
  type:
    | 'missing_control'
    | 'broken_link'
    | 'missing_evidence'
    | 'outdated_document'
    | 'risk_exposure';
  description: string;
  element_id?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface MaturityScore {
  level: 1 | 2 | 3 | 4 | 5;
  score: number; // 0-100
  label: string; // e.g., "Inicial", "Definido", "Controlado", "Gestionado", "Optimizado"
  criteria_met: string[];
  next_steps: string[];
}

export interface ProcessComplianceReport {
  process_id: string;
  generated_at: Date | Timestamp;
  maturity: MaturityScore;
  inconsistencies: Inconsistency[];
  missing_controls_count: number;
  open_findings_count: number;
  indicators_status: {
    total: number;
    with_measurements: number;
    within_target: number;
  };
}

// ============================================
// GOVERNANCE & ALERTS
// ============================================

export interface GovernanceThresholdConfig {
  low_maturity_alert_level: number; // Generar alerta si el nivel de madurez es menor a este valor (1-5)
  critical_maturity_level: number; // Cambia severidad a "critical" si el nivel es <= a este valor (1-5)
  missing_controls_alert_min_count: number; // Mínimo de controles faltantes para alertar
  high_rpn_threshold: number; // RPN considerado alto para exposición de riesgos
  max_high_severity_for_optimized: number; // Máximo de inconsistencias high para nivel 5
}

export interface GovernanceConfig {
  enabled: boolean;
  thresholds: GovernanceThresholdConfig;
  updated_at?: Date | Timestamp;
  updated_by?: string;
}

export const DEFAULT_GOVERNANCE_THRESHOLDS: GovernanceThresholdConfig = {
  low_maturity_alert_level: 2,
  critical_maturity_level: 1,
  missing_controls_alert_min_count: 1,
  high_rpn_threshold: 80,
  max_high_severity_for_optimized: 0,
};

export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  enabled: true,
  thresholds: DEFAULT_GOVERNANCE_THRESHOLDS,
};

export type GovernanceAlertType =
  | 'low_maturity'
  | 'missing_controls'
  | 'risk_exposure'
  | 'indicators_out_of_target';

export interface GovernanceAlert {
  id: string;
  organization_id: string;
  process_id: string;
  process_name: string;
  type: GovernanceAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  created_at: Date | Timestamp;
  status: 'active' | 'acknowledged' | 'resolved';

  // Vinculación futura con Agentes
  suggested_agent_action?: string; // Ej: "iso.finding.create"
}

export interface GovernanceScanResult {
  scan_id: string;
  organization_id: string;
  scanned_at: Date | Timestamp;
  processes_scanned: number;
  average_maturity: number;
  alerts_generated: GovernanceAlert[];
}

// ============================================
// AUDIT & GENERATED CONTENT
// ============================================

export interface AuditQuestion {
  id: string;
  text: string;
  type: 'boolean' | 'multiple_choice' | 'text' | 'evidence_upload';
  options?: string[]; // Para multiple_choice

  // Contexto del SIPOC
  linked_activity_id?: string;
  linked_control_id?: string;
  linked_norm_point?: string; // Ej: "8.5.1"

  required_evidence: boolean;
}

export interface AuditChecklist {
  id: string;
  process_id: string;
  generated_at: Date | Timestamp;
  title: string;

  questions: AuditQuestion[];

  // Metadatos
  is_ai_generated: boolean;
  status: 'draft' | 'approved' | 'used';
}
