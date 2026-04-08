/**
 * Action Module Types
 *
 * Tipos e interfaces para la gestión de acciones correctivas
 */

import type { BaseDocument } from '../../base/types';

/**
 * Estado de la acción
 */
export type ActionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/**
 * Documento de acción
 */
export interface Action extends BaseDocument {
  // Información básica
  actionNumber?: string; // Número único de la acción
  title: string;
  description: string;
  details?: string; // Detalles adicionales
  findingId: string;
  responsibleId: string;
  responsible?: string; // Nombre del responsable
  type?: 'correctiva' | 'preventiva'; // Tipo de acción

  // Fechas
  dueDate: any; // Timestamp
  completedAt?: any; // Timestamp
  verificationDate?: any; // Timestamp

  // Prioridad y recursos
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost?: number;
  resources?: string[];
  tags?: string[];

  // Ejecución
  status: ActionStatus;
  progressPercentage: number; // 0-100
  notes?: string;
  attachments?: string[];
  evidence?: string; // Evidencia de la acción
  completedBy?: string;

  // Verificación de efectividad
  isEffective: boolean | null;
  verificationNotes?: string;
  verifiedBy?: string;
  evidenceAttachments?: string[];
  followUpRequired?: boolean;
  followUpDescription?: string;
}

/**
 * Input para crear acción
 */
export interface CreateActionInput {
  title: string;
  description: string;
  findingId: string;
  responsibleId: string;
  dueDate: Date | string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost?: number;
  resources?: string[];
  tags?: string[];
}

/**
 * Input para actualizar ejecución
 */
export interface UpdateActionExecutionInput {
  status: ActionStatus;
  progressPercentage?: number;
  notes?: string;
  attachments?: string[];
}

/**
 * Input para verificar efectividad
 */
export interface VerifyActionEffectivenessInput {
  isEffective: boolean;
  verificationDate: Date | string;
  verificationNotes: string;
  evidenceAttachments?: string[];
  followUpRequired?: boolean;
  followUpDescription?: string;
}

/**
 * Filtros para listar acciones
 */
export interface ActionFilters {
  status?: ActionStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  responsibleId?: string;
  findingId?: string;
  dueDateFrom?: Date | string;
  dueDateTo?: Date | string;
  isEffective?: boolean;
  search?: string;
}

/**
 * Estadísticas de acciones
 */
export interface ActionStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  effective: number;
  ineffective: number;
  unverified: number;
  overdue: number;
  averageProgressPercentage: number;
}
