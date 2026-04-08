import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { CalendarEvent } from './types';

export class EventPublisher {
  private collectionName = 'eventLog';
  private db = getFirestore();

  async publishEvent(event: CalendarEvent, source: string): Promise<void> {
    try {
      const eventLog = {
        eventId: event.id,
        eventTitle: event.title,
        eventType: event.eventType,
        status: event.status,
        source,
        action: 'created',
        timestamp: Timestamp.now(),
        data: event,
      };

      await this.db.collection(this.collectionName).add(eventLog);
    } catch (error) {
      console.error('Error publishing event', error);
      throw error;
    }
  }

  async updateEvent(
    id: string,
    data: Partial<CalendarEvent>,
    source: string
  ): Promise<void> {
    try {
      const eventLog = {
        eventId: id,
        eventTitle: data.title,
        eventType: data.eventType,
        status: data.status,
        source,
        action: 'updated',
        timestamp: Timestamp.now(),
        changes: data,
      };

      await this.db.collection(this.collectionName).add(eventLog);
    } catch (error) {
      console.error('Error updating event log', error);
      throw error;
    }
  }

  async deleteEvent(id: string, source: string): Promise<void> {
    try {
      const eventLog = {
        eventId: id,
        source,
        action: 'deleted',
        timestamp: Timestamp.now(),
      };

      await this.db.collection(this.collectionName).add(eventLog);
    } catch (error) {
      console.error('Error deleting event log', error);
      throw error;
    }
  }

  async getEventHistory(eventId: string): Promise<any[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('eventId', '==', eventId)
        .orderBy('timestamp', 'desc')
        .get();

      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error getting event history for ${eventId}`, error);
      throw error;
    }
  }
}
