import { BaseDocument } from '../../base/types';
import { Timestamp } from 'firebase-admin/firestore';

export interface ReunionTrabajo extends BaseDocument {
  title: string;
  description: string;
  startDate: Timestamp;
  endDate: Timestamp;
  location: string;
  attendees: string[];
  agenda: string[];
  minutes: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

export interface CreateReunionTrabajoInput {
  title: string;
  description: string;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  location: string;
  attendees: string[];
  agenda: string[];
}

export interface UpdateReunionTrabajoInput {
  title?: string;
  description?: string;
  startDate?: Date | Timestamp;
  endDate?: Date | Timestamp;
  location?: string;
  attendees?: string[];
  agenda?: string[];
  minutes?: string;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}
