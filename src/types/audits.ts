import { Timestamp } from 'firebase/firestore';
import type { SIGContextRef, NormaISO } from './sig-core';

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
  | 'F' // Fortaleza
  | null; // No verificado

// ============================================
// INTERFACES DE DATOS
// ============================================

export interface NormPointVerification {
  normPointCode: string;
  normPointId: string | null; // Preparar para futuro
  conformityStatus: ConformityStatus;
  processes: string[];
  processIds: string[] | null; // Preparar para futuro
  observations: string | null;
  verifiedAt: Timestamp | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
}

export interface Participant {
  name: string;
  role: string;
  userId: string | null; // Preparar para futuro
}

export interface OpeningMeeting {
  date: Timestamp;
  participants: Participant[];
  notes: string | null;
}

export interface ClosingMeeting {
  date: Timestamp;
  participants: Participant[];
  notes: string | null;
}

export interface ReportDelivery {
  date: Timestamp;
  deliveredBy: string;
  deliveredById: string | null; // Preparar para futuro
  receivedBy: string[];
  receivedByIds: string[] | null; // Preparar para futuro
  notes: string | null;
}

// ============================================
// MODELO PRINCIPAL
// ============================================

export interface Audit {
  // Identificación
  id: string;
  organization_id: string;
  auditNumber: string;

  // Planificación
  title: string;
  auditType: AuditType;
  scope: string;
  plannedDate: Timestamp;
  leadAuditor: string;
  leadAuditorId: string | null; // Preparar para futuro
  selectedNormPoints: string[]; // Solo para auditorías parciales

  // Ejecución
  executionDate: Timestamp | null;
  normPointsVerification: NormPointVerification[];
  openingMeeting: OpeningMeeting | null;
  closingMeeting: ClosingMeeting | null;
  reportDelivery: ReportDelivery | null;
  previousActionsVerification: string | null;
  observations: string | null;

  // Comentarios e Informe
  initialComments: string | null; // Comentarios previos a la ejecución
  finalReport: string | null; // Informe escrito del auditor
  archivedDocumentId: string | null; // ID del documento archivado en ABM

  // Estado
  status: AuditStatus;

  // Metadatos
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName: string;
  isActive: boolean;

  // SIG multi-norma (Ola 7A — extensión opcional, no rompe código existente)
  sig_context?: SIGContextRef;  // normativa de referencia de esta auditoría
  normas?: NormaISO[];           // normas que cubre esta auditoría (ej: ['ISO_9001', 'ISO_14001'])
}

// ============================================
// FORMULARIOS
// ============================================

export interface AuditFormData {
  title: string;
  auditType: AuditType;
  scope: string;
  plannedDate: Date;
  leadAuditor: string; // Maintain for backward compatibility
  leadAuditorId?: string;
  leadAuditorName?: string;
  selectedNormPoints: string[]; // Solo si auditType = 'partial'
  organization_id?: string;
  normas?: NormaISO[]; // SIG multi-norma (Ola 7A)
}

export interface AuditExecutionStartData {
  executionDate: Date;
}

export interface NormPointVerificationFormData {
  normPointCode: string;
  conformityStatus: ConformityStatus;
  processes: string[];
  observations: string | null;
}

export interface MeetingFormData {
  date: Date;
  participants: Omit<Participant, 'userId'>[];
  notes: string | null;
}

export interface ReportDeliveryFormData {
  date: Date;
  deliveredBy: string;
  receivedBy: string[];
  notes: string | null;
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

export const CONFORMITY_STATUS_LABELS: Record<string, string> = {
  CF: 'Cumple Satisfactoriamente',
  NCM: 'No Conformidad Mayor',
  NCm: 'No Conformidad Menor',
  NCT: 'No Conformidad Trivial',
  R: 'Riesgo',
  OM: 'Oportunidad de Mejora',
  F: 'Fortaleza',
};

export const CONFORMITY_STATUS_COLORS: Record<string, string> = {
  CF: 'bg-green-100 text-green-800 border-green-300',
  NCM: 'bg-red-100 text-red-800 border-red-300',
  NCm: 'bg-orange-100 text-orange-800 border-orange-300',
  NCT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  R: 'bg-purple-100 text-purple-800 border-purple-300',
  OM: 'bg-blue-100 text-blue-800 border-blue-300',
  F: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export const AUDIT_STATUS_COLORS: Record<AuditStatus, string> = {
  planned: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

// ============================================
// HELPERS
// ============================================

export function getConformityStatusIcon(status: ConformityStatus): string {
  switch (status) {
    case 'CF':
      return '✅';
    case 'NCM':
      return '❌';
    case 'NCm':
      return '⚠️';
    case 'NCT':
      return '⚡';
    case 'R':
      return '🔮';
    case 'OM':
      return '💡';
    case 'F':
      return '💪';
    default:
      return '○';
  }
}

export function getAuditProgress(audit: Audit): number {
  if (audit.status === 'planned') return 0;
  if (audit.status === 'completed') return 100;

  const totalPoints = audit.normPointsVerification.length;
  if (totalPoints === 0) return 0;

  const verifiedPoints = audit.normPointsVerification.filter(
    v => v.conformityStatus !== null
  ).length;

  return Math.round((verifiedPoints / totalPoints) * 100);
}

export function getConformitySummary(audit: Audit): Record<string, number> {
  const summary: Record<string, number> = {
    CF: 0,
    NCM: 0,
    NCm: 0,
    NCT: 0,
    R: 0,
    OM: 0,
    F: 0,
    pending: 0,
  };

  audit.normPointsVerification.forEach(verification => {
    if (verification.conformityStatus === null) {
      summary.pending++;
    } else {
      summary[verification.conformityStatus]++;
    }
  });

  return summary;
}
