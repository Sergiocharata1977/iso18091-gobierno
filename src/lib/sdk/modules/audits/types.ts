/**
 * Audit Module Types
 *
 * Type definitions for the Audit module
 */

import type { BaseDocument } from '../../base/types';

// ============================================
// ENUMS Y TIPOS
// ============================================

export type AuditType = 'complete' | 'partial';
export type AuditStatus = 'planned' | 'in_progress' | 'completed';

export type ConformityStatus =
  | 'CF' // Cumple satisfactoriamente
  | 'NCM' // No conformidad mayor
  | 'NCm' // No conformidad menor
  | 'NCT' // No conformidad trivial
  | 'R' // Riesgo
  | 'OM' // Oportunidad de mejora
  | 'F'; // Fortaleza

// ============================================
// INTERFACES DE DATOS
// ============================================

export interface NormPointVerification {
  normPointCode: string;
  normPointId: string | null;
  conformityStatus: ConformityStatus | null;
  processes: string[];
  processIds: string[] | null;
  observations: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
}

export interface Participant {
  name: string;
  role: string;
  userId: string | null;
}

export interface OpeningMeeting {
  date: Date;
  participants: Participant[];
  notes: string | null;
}

export interface ClosingMeeting {
  date: Date;
  participants: Participant[];
  notes: string | null;
}

export interface ReportDelivery {
  date: Date;
  deliveredBy: string;
  deliveredById: string | null;
  receivedBy: string[];
  receivedByIds: string[] | null;
  notes: string | null;
}

// ============================================
// MODELO PRINCIPAL
// ============================================

export interface Audit extends BaseDocument {
  // Identificación
  auditNumber: string;

  // Planificación
  title: string;
  auditType: AuditType;
  scope: string;
  plannedDate: Date;
  leadAuditor: string;
  leadAuditorId: string | null;
  selectedNormPoints: string[];

  // Ejecución
  executionDate: Date | null;
  normPointsVerification: NormPointVerification[];
  openingMeeting: OpeningMeeting | null;
  closingMeeting: ClosingMeeting | null;
  reportDelivery: ReportDelivery | null;
  previousActionsVerification: string | null;
  observations: string | null;

  // Estado
  status: AuditStatus;
}

// ============================================
// FORMULARIOS
// ============================================

export interface CreateAuditInput {
  title: string;
  auditType: AuditType;
  scope: string;
  plannedDate: Date;
  leadAuditor: string;
  selectedNormPoints: string[];
  normas?: string[]; // normas ISO que cubre esta auditoría (multi-norma SIG)
}

export interface UpdateAuditInput {
  title?: string;
  auditType?: AuditType;
  scope?: string;
  plannedDate?: Date;
  leadAuditor?: string;
  selectedNormPoints?: string[];
}

export interface StartExecutionInput {
  executionDate: Date;
}

export interface UpdateNormPointVerificationInput {
  normPointCode: string;
  conformityStatus: ConformityStatus;
  processes: string[];
  observations?: string | null;
}

export interface UpdateMeetingInput {
  date: Date;
  participants: Omit<Participant, 'userId'>[];
  notes?: string | null;
}

export interface UpdateReportDeliveryInput {
  date: Date;
  deliveredBy: string;
  receivedBy: string[];
  notes?: string | null;
}

// ============================================
// LABELS Y CONFIGURACIÓN
// ============================================

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  complete: 'Auditoría Completa',
  partial: 'Auditoría Parcial',
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  planned: 'Planificada',
  in_progress: 'En Progreso',
  completed: 'Completada',
};

export const CONFORMITY_STATUS_LABELS: Record<ConformityStatus, string> = {
  CF: 'Cumple Satisfactoriamente',
  NCM: 'No Conformidad Mayor',
  NCm: 'No Conformidad Menor',
  NCT: 'No Conformidad Trivial',
  R: 'Riesgo',
  OM: 'Oportunidad de Mejora',
  F: 'Fortaleza',
};

// ============================================
// FILTROS Y BÚSQUEDA AVANZADA
// ============================================

export interface AuditAdvancedFilters {
  status?: AuditStatus[];
  auditType?: AuditType[];
  leadAuditorId?: string;
  dateRange?: { start: Date; end: Date };
  conformityStatus?: ConformityStatus[];
  searchText?: string;
  year?: number;
  limit?: number;
}

// ============================================
// ESTADÍSTICAS
// ============================================

export interface ConformityStats {
  CF: number;
  NCM: number;
  NCm: number;
  NCT: number;
  R: number;
  OM: number;
  F: number;
}

export interface AuditStats {
  total: number;
  byStatus: Record<AuditStatus, number>;
  byType: Record<AuditType, number>;
  averageConformity: number;
  nonConformitiesCount: number;
  completionRate: number;
  conformityStats: ConformityStats;
}

export interface AuditTrend {
  month: string;
  auditsCount: number;
  nonConformitiesCount: number;
  completionRate: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
