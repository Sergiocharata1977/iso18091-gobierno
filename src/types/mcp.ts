/**
 * MCP (Mini Copiloto) - Tipos TypeScript
 * Sistema de automatización y registro ISO 9001
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Enums y tipos base
// ============================================================================

/** Tipo de tarea que puede ejecutar el mCP */
export type MCPTaskType =
  | 'facturacion'
  | 'formulario'
  | 'extraccion'
  | 'carga_datos'
  | 'otro';

/** Estado de ejecución de una tarea */
export type MCPExecutionStatus =
  | 'exitoso'
  | 'fallido'
  | 'parcial'
  | 'pendiente';

/** Tipo de evidencia generada */
export type MCPEvidenceType = 'screenshot' | 'pdf' | 'xlsx' | 'log';

/** Resultado de un paso individual */
export type MCPStepResult = 'ok' | 'error' | 'skipped';

// ============================================================================
// Interfaces principales
// ============================================================================

/**
 * Paso individual de una ejecución MCP
 */
export interface MCPStep {
  orden?: number;
  accion: string;
  selector?: string;
  valor?: string;
  resultado: MCPStepResult;
  timestamp: Timestamp | Date;
  error_mensaje?: string;
  duracion_ms?: number;
}

/**
 * Evidencia generada por el mCP
 */
export interface MCPEvidence {
  tipo: MCPEvidenceType;
  url: string;
  descripcion: string;
  timestamp: Timestamp | Date;
  size_bytes?: number;
}

/**
 * Registro completo de ejecución del mCP
 */
export interface MCPTaskExecution {
  id: string;
  organization_id: string;
  user_id: string;

  // Tarea asociada (opcional - puede ser ejecución ad-hoc)
  tarea_id?: string;
  hallazgo_id?: string;
  accion_id?: string;
  auditoria_id?: string;

  // Datos de ejecución
  tipo: MCPTaskType;
  sistema_origen: string; // "ERP SAP", "Google Sheets", etc.
  url_origen: string;
  comando_original?: string; // Comando del usuario si aplica

  // Resultado
  estado: MCPExecutionStatus;
  duracion_ms: number;
  log_pasos: MCPStep[];

  // Evidencias
  evidencias: MCPEvidence[];

  // Trazabilidad
  created_at: Timestamp | Date;
  updated_at?: Timestamp | Date;
  ip_address?: string;
  user_agent?: string;
}

// ============================================================================
// DTOs para API
// ============================================================================

/**
 * Request para completar una tarea
 */
export interface MCPCompleteTaskRequest {
  organization_id: string;
  user_id: string;
  tarea_id?: string;
  hallazgo_id?: string;
  accion_id?: string;

  tipo: MCPTaskType;
  sistema_origen: string;
  url_origen: string;
  comando_original?: string;

  estado: MCPExecutionStatus;
  duracion_ms: number;
  log_pasos: Omit<MCPStep, 'timestamp'>[];
}

/**
 * Request para subir evidencia
 */
export interface MCPUploadEvidenceRequest {
  organization_id: string;
  execution_id: string;
  tipo: MCPEvidenceType;
  data_base64: string;
  descripcion: string;
  filename?: string;
}

/**
 * Request para registrar ejecución ad-hoc
 */
export interface MCPRegisterExecutionRequest {
  organization_id: string;
  user_id: string;

  tipo: MCPTaskType;
  sistema_origen: string;
  url_origen: string;
  comando_original?: string;

  estado: MCPExecutionStatus;
  duracion_ms: number;
  log_pasos: Omit<MCPStep, 'timestamp'>[];

  // Evidencia inline (opcional)
  evidencia_base64?: string;
  evidencia_tipo?: MCPEvidenceType;
  evidencia_descripcion?: string;
}

/**
 * Tarea pendiente para el mCP
 */
export interface MCPPendingTask {
  id: string;
  tipo: 'hallazgo' | 'accion' | 'auditoria';
  titulo: string;
  descripcion?: string;
  fecha_limite?: Timestamp | Date;
  prioridad?: 'alta' | 'media' | 'baja';
  sistema_destino?: string;

  // Referencias
  hallazgo_id?: string;
  accion_id?: string;
  auditoria_id?: string;
}

/**
 * Respuesta de listado de tareas
 */
export interface MCPTasksResponse {
  success: boolean;
  data?: {
    tareas: MCPPendingTask[];
    total: number;
  };
  error?: string;
}

/**
 * Respuesta de operación MCP
 */
export interface MCPOperationResponse {
  success: boolean;
  data?: {
    execution_id?: string;
    evidence_url?: string;
  };
  error?: string;
}
