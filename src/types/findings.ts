import { Timestamp } from 'firebase/firestore';
import type { SIGContextRef, OrigenHallazgo } from './sig-core';

// ============================================
// ENUMS Y TIPOS
// ============================================

export type FindingStatus = 'registrado' | 'en_tratamiento' | 'cerrado';

export type FindingPhase =
  | 'registered'
  | 'immediate_action_planned'
  | 'immediate_action_executed'
  | 'root_cause_analyzed';

// Tipos de fuente de hallazgos (polimórfico)
export type FindingSourceType =
  | 'auditoria'
  | 'encuesta'
  | 'declaracion'
  | 'inspeccion'
  | 'reclamo'
  | 'otro';

// ============================================
// FASES DEL HALLAZGO
// ============================================

// Fase 1: Alta del Hallazgo (se crea en el formulario inicial)
export interface FindingRegistration {
  origin: string;
  name: string;
  description: string;
  processId: string | null;
  processName: string | null;
  // Fuente polimórfica
  sourceType: FindingSourceType;
  sourceId: string | null;
  sourceName: string | null;
  // Puntos de norma relacionados (puede ser varios)
  normPoints: string[];
}

// Fase 2: Planificación de Acción Inmediata (Formulario 2)
export interface FindingImmediateActionPlanning {
  responsiblePersonId: string;
  responsiblePersonName: string;
  plannedDate: Timestamp;
  comments: string | null;
}

// Fase 3: Ejecución de la Acción Inmediata (Formulario 3)
export interface FindingImmediateActionExecution {
  executionDate: Timestamp;
  correction: string;
  executedBy: string;
  executedByName: string;
}

// Fase 4: Análisis de Causa Raíz (Formulario 4)
export interface FindingRootCauseAnalysis {
  analysis: string;
  requiresAction: boolean;
  analyzedBy: string;
  analyzedByName: string;
  analyzedDate: Timestamp;
}

// ============================================
// MODELO PRINCIPAL
// ============================================

export interface Finding {
  // Identificación
  id: string;
  organization_id: string;
  findingNumber: string;

  // Fase 1: Registro del Hallazgo
  registration: FindingRegistration;

  // Fase 2: Planificación de Acción Inmediata
  immediateActionPlanning: FindingImmediateActionPlanning | null;

  // Fase 3: Ejecución de Acción Inmediata
  immediateActionExecution: FindingImmediateActionExecution | null;

  // Fase 4: Análisis de Causa Raíz
  rootCauseAnalysis: FindingRootCauseAnalysis | null;

  // Estado general
  status: FindingStatus;
  currentPhase: FindingPhase;
  progress: number; // 0, 25, 50, 75, 100

  // Contexto normativo SIG (opcional — multi-norma)
  sig_context?: SIGContextRef;   // contexto normativo del hallazgo
  origen?: OrigenHallazgo;       // origen del hallazgo

  // Metadatos
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName: string;
  updatedBy: string | null;
  updatedByName: string | null;
  isActive: boolean;
}

// ============================================
// FORMULARIOS
// ============================================

// Formulario 1: Alta del Hallazgo (Modal)
export interface FindingFormData {
  name: string;
  description: string;
  processId: string;
  processName: string;
  // Fuente polimórfica
  sourceType: FindingSourceType;
  sourceId?: string;
  sourceName?: string;
  // Puntos de norma
  // Puntos de norma
  normPoints?: string[];
  organization_id: string;
}

// Formulario 2: Planificación de Acción Inmediata
export interface FindingImmediateActionPlanningFormData {
  responsiblePersonId: string;
  responsiblePersonName: string;
  plannedDate: Date;
  comments?: string;
}

// Formulario 3: Ejecución de Acción Inmediata
export interface FindingImmediateActionExecutionFormData {
  executionDate: Date;
  correction: string;
}

// Formulario 4: Análisis de Causa Raíz
export interface FindingRootCauseAnalysisFormData {
  analysis: string;
  requiresAction: boolean;
}

// ============================================
// FILTROS Y BÚSQUEDA
// ============================================

export interface FindingFilters {
  status?: FindingStatus;
  processId?: string;
  sourceId?: string;
  year?: number;
  search?: string;
  requiresAction?: boolean;
  norma?: string; // filtro por norma ISO (ISO_9001, ISO_14001, ISO_45001, etc.)
}

// ============================================
// ESTADÍSTICAS
// ============================================

export interface FindingStats {
  total: number;
  byStatus: Record<FindingStatus, number>;
  byProcess: Record<string, number>;
  averageProgress: number;
  requiresActionCount: number;
  closedCount: number;
}

// ============================================
// LABELS Y CONFIGURACIÓN
// ============================================

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  registrado: 'Registrado',
  en_tratamiento: 'En Tratamiento',
  cerrado: 'Cerrado',
};

export const FINDING_SOURCE_TYPE_LABELS: Record<FindingSourceType, string> = {
  auditoria: 'Auditoría Interna',
  encuesta: 'Encuesta/Informe',
  declaracion: 'Declaración de Empleado',
  inspeccion: 'Inspección',
  reclamo: 'Reclamo de Cliente',
  otro: 'Otra Fuente',
};

// ============================================
// COLORES PARA UI
// ============================================

export const FINDING_STATUS_COLORS: Record<FindingStatus, string> = {
  registrado: 'bg-gray-100 text-gray-800',
  en_tratamiento: 'bg-blue-100 text-blue-800',
  cerrado: 'bg-green-100 text-green-800',
};

export const FINDING_SOURCE_TYPE_COLORS: Record<FindingSourceType, string> = {
  auditoria: 'bg-blue-100 text-blue-800',
  encuesta: 'bg-purple-100 text-purple-800',
  declaracion: 'bg-green-100 text-green-800',
  inspeccion: 'bg-yellow-100 text-yellow-800',
  reclamo: 'bg-red-100 text-red-800',
  otro: 'bg-gray-100 text-gray-800',
};

// ============================================
// HELPERS
// ============================================

export function getProgressByStatus(status: FindingStatus): number {
  switch (status) {
    case 'registrado':
      return 0;
    case 'en_tratamiento':
      return 50;
    case 'cerrado':
      return 100;
    default:
      return 0;
  }
}

export function getNextStatus(
  currentStatus: FindingStatus
): FindingStatus | null {
  switch (currentStatus) {
    case 'registrado':
      return 'en_tratamiento';
    case 'en_tratamiento':
      return 'cerrado';
    case 'cerrado':
      return null;
    default:
      return null;
  }
}
