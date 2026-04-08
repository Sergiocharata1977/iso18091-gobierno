import { Timestamp } from 'firebase-admin/firestore';
import type { BaseDocument } from '../../base/types';

export type ComplianceStatus =
  | 'compliant'
  | 'non_compliant'
  | 'partial'
  | 'not_applicable';

export interface NormPoint extends BaseDocument {
  chapter: string;
  section: string;
  requirement: string;
  description: string;
  category: string;
  isMandatory: boolean;
  tipo_norma?: string; // Add field to interface
  relatedProcesses: string[];
  relatedDocuments: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}

export interface NormPointRelation extends BaseDocument {
  normPointId: string;
  entityType: 'process' | 'document' | 'procedure' | 'policy';
  entityId: string;
  complianceStatus: ComplianceStatus;
  evidence: string[];
  notes: string;
  lastVerifiedAt: Timestamp;
  verifiedBy: string;
  deletedAt: Timestamp | null;
}

export interface ComplianceMatrix {
  totalNormPoints: number;
  compliant: number;
  nonCompliant: number;
  partial: number;
  notApplicable: number;
  compliancePercentage: number;
  byCategory: Record<string, ComplianceCategoryStats>;
}

export interface ComplianceCategoryStats {
  total: number;
  compliant: number;
  nonCompliant: number;
  partial: number;
  compliancePercentage: number;
}

export interface NormPointFilters {
  chapter?: string;
  tipoNorma?: string; // Add filter
  category?: string;
  isMandatory?: boolean;
  search?: string;
}

export interface NormPointRelationFilters {
  normPointId?: string;
  entityType?: 'process' | 'document' | 'procedure' | 'policy';
  entityId?: string;
  complianceStatus?: ComplianceStatus;
}
