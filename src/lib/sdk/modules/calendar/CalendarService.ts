import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  CalendarEvent,
  CalendarEventFilters,
  CalendarStats,
} from './types';
import {
  CreateCalendarEventSchema,
  UpdateCalendarEventSchema,
  CalendarEventFiltersSchema,
} from './validations';

export class CalendarService extends BaseService<CalendarEvent> {
  protected collectionName = 'calendarEvents';
  protected schema = CreateCalendarEventSchema;

  async createAndReturnId(data: any, userId: string): Promise<string> {
    const validated = this.schema.parse(data);

    const startDate =
      validated.startDate instanceof Date
        ? validated.startDate
        : new Date(validated.startDate);
    const endDate =
      validated.endDate instanceof Date
        ? validated.endDate
        : new Date(validated.endDate);

    const eventData: Omit<CalendarEvent, 'id'> = {
      ...validated,
      status: 'scheduled',
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      reminders: validated.reminders || [],
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db.collection(this.collectionName).add(eventData);
    return docRef.id;
  }

  async list(
    filters: CalendarEventFilters = {},
    options: any = {}
  ): Promise<CalendarEvent[]> {
    try {
      CalendarEventFiltersSchema.parse(filters);

      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.eventType) {
        query = query.where('eventType', '==', filters.eventType);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.relatedModule) {
        query = query.where('relatedModule', '==', filters.relatedModule);
      }

      if (filters.dateFrom) {
        const fromDate =
          filters.dateFrom instanceof Date
            ? filters.dateFrom
            : new Date(filters.dateFrom);
        query = query.where('startDate', '>=', Timestamp.fromDate(fromDate));
      }

      if (filters.dateTo) {
        const toDate =
          filters.dateTo instanceof Date
            ? filters.dateTo
            : new Date(filters.dateTo);
        query = query.where('endDate', '<=', Timestamp.fromDate(toDate));
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('startDate', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      let events = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as CalendarEvent
      );

      if (filters.userId) {
        events = events.filter(e => e.attendees.includes(filters.userId!));
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        events = events.filter(
          e =>
            e.title.toLowerCase().includes(searchLower) ||
            e.description.toLowerCase().includes(searchLower)
        );
      }

      return events;
    } catch (error) {
      console.error('Error listing calendar events', error);
      throw error;
    }
  }

  async getById(id: string): Promise<CalendarEvent | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as CalendarEvent;
    } catch (error) {
      console.error(`Error getting calendar event ${id}`, error);
      throw error;
    }
  }

  async getByDateRange(
    startDate: Date | string,
    endDate: Date | string
  ): Promise<CalendarEvent[]> {
    try {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);

      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .where('startDate', '>=', Timestamp.fromDate(start))
        .where('endDate', '<=', Timestamp.fromDate(end))
        .orderBy('startDate', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as CalendarEvent
      );
    } catch (error) {
      console.error('Error getting events by date range', error);
      throw error;
    }
  }

  async getUpcoming(days: number = 7): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .where('status', '==', 'scheduled')
        .where('startDate', '>=', Timestamp.fromDate(now))
        .where('startDate', '<=', Timestamp.fromDate(futureDate))
        .orderBy('startDate', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as CalendarEvent
      );
    } catch (error) {
      console.error('Error getting upcoming events', error);
      throw error;
    }
  }

  async getByUser(userId: string): Promise<CalendarEvent[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .where('attendees', 'array-contains', userId)
        .orderBy('startDate', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as CalendarEvent
      );
    } catch (error) {
      console.error(`Error getting events for user ${userId}`, error);
      throw error;
    }
  }

  async getByModule(module: string): Promise<CalendarEvent[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .where('relatedModule', '==', module)
        .orderBy('startDate', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as CalendarEvent
      );
    } catch (error) {
      console.error(`Error getting events for module ${module}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting calendar event ${id}`, error);
      throw error;
    }
  }

  async getStats(): Promise<CalendarStats> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .get();

      const events = snapshot.docs.map(doc => doc.data() as CalendarEvent);
      const now = new Date();

      const stats: CalendarStats = {
        total: events.length,
        scheduled: events.filter(e => e.status === 'scheduled').length,
        inProgress: events.filter(e => e.status === 'in_progress').length,
        completed: events.filter(e => e.status === 'completed').length,
        cancelled: events.filter(e => e.status === 'cancelled').length,
        byType: {
          audit: events.filter(e => e.eventType === 'audit').length,
          meeting: events.filter(e => e.eventType === 'meeting').length,
          training: events.filter(e => e.eventType === 'training').length,
          deadline: events.filter(e => e.eventType === 'deadline').length,
          review: events.filter(e => e.eventType === 'review').length,
          other: events.filter(e => e.eventType === 'other').length,
        },
        upcomingCount: events.filter(e => {
          const startDate =
            e.startDate instanceof Timestamp
              ? e.startDate.toDate()
              : new Date(e.startDate);
          return startDate > now && e.status === 'scheduled';
        }).length,
      };

      return stats;
    } catch (error) {
      console.error('Error getting calendar stats', error);
      throw error;
    }
  }
}
