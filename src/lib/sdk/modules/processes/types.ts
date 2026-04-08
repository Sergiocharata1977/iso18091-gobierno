import type { BaseDocument } from '../../base/types';
import { Timestamp } from 'firebase-admin/firestore';

export interface Process extends BaseDocument {
  name: string;
  description: string;
  category: string;
  owner: string;
  status: 'active' | 'inactive' | 'archived';
  steps: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface CreateProcessInput {
  name: string;
  description: string;
  category: string;
  owner: string;
  steps?: string[];
}
