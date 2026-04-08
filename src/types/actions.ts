import { Timestamp } from 'firebase/firestore';

// ============================================
// ENUMS Y TIPOS
// ============================================

export type ActionType = 'correctiva' | 'preventiva' | 'mejora';
export type ActionPriority = 'baja' | 'media' | 'alta' | 'critica';
export type ActionStatus =
  | 'planificada'
  | 'ejecutada'
  | 'en_control'
  | 'completada'
  | 'cancelada';
export type ActionPhase =
  | 'planning'
  | 'executed'
  | 'control_planning'
  | 'completed';
export type ActionSourceType = 'manual' | 'hallazgo' | 'auditoria' | 'otro';

// ============================================
// FASES DE LA ACCIÓN
// ============================================

// Fase 1: Planificación (se crea en el formulario inicial)
export interface ActionPlanning {
  responsiblePersonId: string;
  responsiblePersonName: string;
  plannedDate: Timestamp;
  observations: string | null;
}

// Fase 2: Ejecución (Formulario 2)
export interface ActionExecution {
  executionDate: Timestamp | null;
  comments: string | null;
  completedBy: string | null;
  completedByName: string | null;
}

// Fase 3: Planificación del Control (Formulario 3)
export interface ActionControlPlanning {
  responsiblePersonId: string;
  responsiblePersonName: string;
  plannedDate: Timestamp;
  effectivenessCriteria: string;
  comments: string | null;
}

// Fase 4: Ejecución del Control (Formulario 4)
export interface ActionControlExecution {
  executionDate: Timestamp | null;
  verificationResult: string;
  isEffective: boolean;
  comments: string | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
}

// ============================================
// MODELO PRINCIPAL
// ============================================

export interface Action {
  // Identificación
  id: string;
  organization_id: string;
  actionNumber: string;
  title: string;
  description: string;

  // Clasificación
  actionType: ActionType;
  priority: ActionPriority;

  // Origen
  sourceType: ActionSourceType;
  findingId: string | null;
  findingNumber: string | null;
  sourceName: string;

  // Proceso involucrado
  processId: string | null;
  processName: string | null;

  // Fase 1: Planificación
  planning: ActionPlanning;

  // Fase 2: Ejecución
  execution: ActionExecution | null;

  // Fase 3: Planificación del Control
  controlPlanning: ActionControlPlanning | null;

  // Fase 4: Ejecución del Control
  controlExecution: ActionControlExecution | null;

  // Estado general
  status: ActionStatus;
  currentPhase: ActionPhase;
  progress: number; // 0, 33, 66, 100

  // Observaciones generales
  observations: string | null;

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

// Formulario 1: Planificación inicial (Modal)
export interface ActionFormData {
  // Información básica
  title: string;
  description: string;

  // Clasificación
  actionType: ActionType;
  priority: ActionPriority;

  // Origen
  sourceType: ActionSourceType;
  sourceName: string;

  // Proceso
  processId: string;
  processName: string;

  // Planificación de la acción
  implementationResponsibleId: string;
  implementationResponsibleName: string;
  plannedExecutionDate: Date;
  planningObservations?: string;
  organization_id?: string;
}

// Formulario 2: Ejecución de lo planificado
export interface ActionExecutionFormData {
  executionDate: Date;
  comments?: string;
}

// Formulario 3: Planificación del control
export interface ActionControlPlanningFormData {
  responsiblePersonId: string;
  responsiblePersonName: string;
  plannedDate: Date;
  effectivenessCriteria: string;
  comments?: string;
}

// Formulario 4: Ejecución del control
export interface ActionControlExecutionFormData {
  executionDate: Date;
  verificationResult: string;
  isEffective: boolean;
  comments?: string;
}

// ============================================
// FILTROS Y BÚSQUEDA
// ============================================

export interface ActionFilters {
  status?: ActionStatus;
  actionType?: ActionType;
  priority?: ActionPriority;
  responsiblePersonId?: string;
  processId?: string;
  findingId?: string;
  year?: number;
  search?: string;
}

// ============================================
// ESTADÍSTICAS
// ============================================

export interface ActionStats {
  total: number;
  byStatus: Record<ActionStatus, number>;
  byType: Record<ActionType, number>;
  byPriority: Record<ActionPriority, number>;
  byProcess: Record<string, number>;
  averageProgress: number;
  verifiedCount: number;
  effectiveCount: number;
  overdueCount: number;
}

// ============================================
// LABELS Y CONFIGURACIÓN
// ============================================

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  correctiva: 'Correctiva',
  preventiva: 'Preventiva',
  mejora: 'Mejora',
};

export const ACTION_PRIORITY_LABELS: Record<ActionPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  planificada: 'Planificada',
  ejecutada: 'Ejecutada',
  en_control: 'En Control',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export const ACTION_SOURCE_TYPE_LABELS: Record<ActionSourceType, string> = {
  manual: 'Manual',
  hallazgo: 'Hallazgo',
  auditoria: 'Auditoría',
  otro: 'Otro',
};

// ============================================
// COLORES PARA UI
// ============================================

export const ACTION_PRIORITY_COLORS: Record<ActionPriority, string> = {
  baja: 'bg-gray-100 text-gray-800',
  media: 'bg-blue-100 text-blue-800',
  alta: 'bg-orange-100 text-orange-800',
  critica: 'bg-red-100 text-red-800',
};

export const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  planificada: 'bg-gray-100 text-gray-800',
  ejecutada: 'bg-blue-100 text-blue-800',
  en_control: 'bg-yellow-100 text-yellow-800',
  completada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
};

export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  correctiva: 'bg-red-100 text-red-800',
  preventiva: 'bg-blue-100 text-blue-800',
  mejora: 'bg-green-100 text-green-800',
};

// ============================================
// HELPERS
// ============================================

export function getProgressByStatus(status: ActionStatus): number {
  switch (status) {
    case 'planificada':
      return 0;
    case 'ejecutada':
      return 33;
    case 'en_control':
      return 66;
    case 'completada':
      return 100;
    case 'cancelada':
      return 0;
    default:
      return 0;
  }
}

export function getNextStatus(
  currentStatus: ActionStatus
): ActionStatus | null {
  switch (currentStatus) {
    case 'planificada':
      return 'ejecutada';
    case 'ejecutada':
      return 'en_control';
    case 'en_control':
      return 'completada';
    case 'completada':
      return null;
    case 'cancelada':
      return null;
    default:
      return null;
  }
}
