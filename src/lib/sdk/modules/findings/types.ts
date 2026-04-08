/**
 * Finding Module Types
 *
 * Tipos e interfaces para la gestión de hallazgos (findings)
 * con soporte para 4 fases: registro, acción inmediata, ejecución, análisis
 */

import type { BaseDocument } from '../../base/types';

/**
 * Fases del hallazgo
 */
export type FindingPhase =
  | 'registered'
  | 'immediate_action_planned'
  | 'immediate_action_executed'
  | 'root_cause_analyzed'
  | 'closed';

/**
 * Estados del hallazgo
 */
export type FindingStatus =
  | 'registrado'
  | 'accion_planificada'
  | 'accion_ejecutada'
  | 'analisis_completado'
  | 'cerrado';

/**
 * Origen del hallazgo
 */
export type FindingOrigin =
  | 'audit'
  | 'internal'
  | 'customer'
  | 'supplier'
  | 'other';

/**
 * Información de registro del hallazgo (Fase 1)
 */
export interface FindingRegistration {
  origin: string;
  name: string;
  description: string;
  processId: string | null;
  processName: string | null;
  source: string;
  sourceId: string | null;
  severity?: string;
  category?: string;
}

/**
 * Planificación de acción inmediata (Fase 2)
 */
export interface FindingImmediateActionPlanning {
  responsiblePersonId: string;
  responsiblePersonName: string;
  plannedDate: any; // Timestamp
  comments: string | null;
}

/**
 * Ejecución de acción inmediata (Fase 3)
 */
export interface FindingImmediateActionExecution {
  executionDate: any; // Timestamp
  correction: string;
  executedBy: string;
  executedByName: string;
}

/**
 * Análisis de causa raíz (Fase 4)
 */
export interface FindingRootCauseAnalysis {
  analysis: string;
  requiresAction: boolean;
  analyzedBy: string;
  analyzedByName: string;
  analyzedDate: any; // Timestamp
}

/**
 * Documento de hallazgo
 */
export interface Finding extends BaseDocument {
  findingNumber: string;

  // Fase 1: Registro
  registration: FindingRegistration;

  // Fase 2: Planificación de acción inmediata
  immediateActionPlanning: FindingImmediateActionPlanning | null;

  // Fase 3: Ejecución de acción inmediata
  immediateActionExecution: FindingImmediateActionExecution | null;

  // Fase 4: Análisis de causa raíz
  rootCauseAnalysis: FindingRootCauseAnalysis | null;

  // Estado y progreso
  status: FindingStatus;
  currentPhase: FindingPhase;
  progress: number; // 0-100

  // Auditoría
  createdByName: string;
  updatedByName: string | null;
}

/**
 * Input para crear hallazgo
 */
export interface CreateFindingInput {
  origin: FindingOrigin;
  name: string;
  description: string;
  processId?: string | null;
  processName?: string | null;
  source: string;
  sourceId?: string | null;
}

/**
 * Input para actualizar planificación de acción inmediata
 */
export interface UpdateFindingImmediateActionPlanningInput {
  responsiblePersonId: string;
  responsiblePersonName: string;
  plannedDate: Date;
  comments?: string | null;
}

/**
 * Input para actualizar ejecución de acción inmediata
 */
export interface UpdateFindingImmediateActionExecutionInput {
  executionDate: Date;
  correction: string;
}

/**
 * Input para actualizar análisis de causa raíz
 */
export interface UpdateFindingRootCauseAnalysisInput {
  analysis: string;
  requiresAction: boolean;
}

/**
 * Filtros para listar hallazgos
 */
export interface FindingFilters {
  status?: FindingStatus;
  processId?: string;
  sourceId?: string;
  year?: number;
  search?: string;
  requiresAction?: boolean;
}

/**
 * Estadísticas de hallazgos
 */
export interface FindingStats {
  total: number;
  byStatus: Record<FindingStatus, number>;
  byProcess: Record<string, number>;
  averageProgress: number;
  requiresActionCount: number;
  closedCount: number;
}
