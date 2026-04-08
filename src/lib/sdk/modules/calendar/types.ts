import type { BaseDocument } from '../../base/types';
import { Timestamp } from 'firebase-admin/firestore';

export type EventType =
  | 'audit'
  | 'meeting'
  | 'training'
  | 'deadline'
  | 'review'
  | 'other';
export type EventStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface CalendarEvent extends BaseDocument {
  organization_id?: string;
  title: string;
  description: string;
  eventType: EventType;
  status: EventStatus;
  startDate: Timestamp;
  endDate: Timestamp;
  location?: string;
  attendees: string[];
  relatedModule: string;
  relatedEntityId?: string;
  reminders: number[];
  attachments?: string[];
  notes?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
  deletedAt: Timestamp | null;
}

export interface CalendarEventFilters {
  eventType?: EventType;
  status?: EventStatus;
  relatedModule?: string;
  userId?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  search?: string;
}

export interface CalendarStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  byType: Record<EventType, number>;
  upcomingCount: number;
}
