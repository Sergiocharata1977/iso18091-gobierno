import type { BaseDocument } from '../../base/types';
import { Timestamp } from 'firebase-admin/firestore';

export type DocumentStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'archived';

export interface DocumentVersion {
  versionNumber: number;
  content: string;
  createdBy: string;
  createdAt: Timestamp;
  changesSummary: string;
}

export interface DocumentShare {
  userId: string;
  permissions: 'view' | 'comment' | 'edit';
  sharedAt: Timestamp;
  sharedBy: string;
}

export interface Document extends BaseDocument {
  organization_id?: string;
  title: string;
  description: string;
  content: string;
  status: DocumentStatus;
  category: string;
  tags: string[];
  currentVersion: number;
  versions: DocumentVersion[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
  publishedAt?: Timestamp;
  publishedBy?: string;
  approvedAt?: Timestamp;
  approvedBy?: string;
  attachments?: string[];
  relatedDocuments?: string[];
  deletedAt: Timestamp | null;
  // Advanced features
  sharedWith?: DocumentShare[];
  accessCount?: number;
  lastAccessedAt?: Timestamp;
}

export interface CreateDocumentInput {
  organization_id?: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags?: string[];
  attachments?: string[];
  relatedDocuments?: string[];
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  attachments?: string[];
  relatedDocuments?: string[];
}

export interface DocumentFilters {
  status?: DocumentStatus;
  category?: string;
  tags?: string[];
  createdBy?: string;
  search?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

export interface DocumentStats {
  total: number;
  draft: number;
  review: number;
  approved: number;
  published: number;
  archived: number;
  totalVersions: number;
  averageVersionsPerDocument: number;
}
