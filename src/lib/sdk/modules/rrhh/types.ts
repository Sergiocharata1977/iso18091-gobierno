import type { BaseDocument } from '../../base/types';
import { Timestamp } from 'firebase-admin/firestore';

export interface Personnel extends BaseDocument {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  positionId: string;
  departmentId: string;
  hireDate: Timestamp;
  status: 'active' | 'inactive' | 'on_leave';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface Position extends BaseDocument {
  title: string;
  description: string;
  departmentId: string;
  level: string;
  requiredCompetencies: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface Training extends BaseDocument {
  title: string;
  description: string;
  personnelId: string;
  competencyId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface Evaluation extends BaseDocument {
  personnelId: string;
  evaluatorId: string;
  competencyId: string;
  score: number;
  comments: string;
  evaluationDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface Department extends BaseDocument {
  name: string;
  description: string;
  managerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface Competence extends BaseDocument {
  name: string;
  description: string;
  category: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface CreatePersonnelInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  positionId: string;
  departmentId: string;
  hireDate: Date | string;
}

export interface CreatePositionInput {
  title: string;
  description: string;
  departmentId: string;
  level: string;
  requiredCompetencies?: string[];
}

export interface CreateTrainingInput {
  title: string;
  description: string;
  personnelId: string;
  competencyId: string;
  startDate: Date | string;
  endDate: Date | string;
}

export interface CreateEvaluationInput {
  personnelId: string;
  evaluatorId: string;
  competencyId: string;
  score: number;
  comments: string;
  evaluationDate: Date | string;
}

export interface CreateDepartmentInput {
  name: string;
  description: string;
  managerId: string;
}

export interface CreateCompetenceInput {
  name: string;
  description: string;
  category: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
}
