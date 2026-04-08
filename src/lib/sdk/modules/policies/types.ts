import type { BaseDocument } from '../../base/types';
import { Timestamp } from 'firebase-admin/firestore';

export interface Policy extends BaseDocument {
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'active' | 'archived';
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface CreatePolicyInput {
  title: string;
  description: string;
  category: string;
}
