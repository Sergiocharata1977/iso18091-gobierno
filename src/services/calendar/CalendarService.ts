import { db } from '@/firebase/config';
import type {
  CalendarErrorCode,
  CalendarEvent,
  CalendarEventCreateData,
  CalendarEventUpdateData,
  EventFilters,
} from '@/types/calendar';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'calendar_events';

export class CalendarService {
  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Crear un nuevo evento de calendario
   */
  static async createEvent(data: CalendarEventCreateData): Promise<string> {
    try {
      const now = Timestamp.now();

      const eventData: Omit<CalendarEvent, 'id'> = {
        title: data.title,
        description: data.description,
        date: Timestamp.fromDate(data.date),
        endDate: data.endDate ? Timestamp.fromDate(data.endDate) : null,
        type: data.type,
        sourceModule: data.sourceModule,
        status: 'scheduled',
        priority: data.priority,
        sourceRecordId: data.sourceRecordId,
        sourceRecordType: data.sourceRecordType,
        sourceRecordNumber: data.sourceRecordNumber,
        responsibleUserId: data.responsibleUserId,
        responsibleUserName: data.responsibleUserName,
        participantIds: data.participantIds,
        organizationId: data.organizationId,
        processId: data.processId,
        processName: data.processName,
        metadata: data.metadata,
        notificationSchedule: data.notificationSchedule,
        notificationsSent: false,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule
          ? {
              frequency: data.recurrenceRule.frequency,
              interval: data.recurrenceRule.interval,
              endDate: data.recurrenceRule.endDate
                ? Timestamp.fromDate(data.recurrenceRule.endDate)
                : null,
              occurrences: data.recurrenceRule.occurrences,
            }
          : null,
        createdAt: now,
        updatedAt: now,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        isActive: true,
        isSystemGenerated: data.isSystemGenerated,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), eventData);

      return docRef.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw this.handleError(
        error,
        'Error al crear evento de calendario',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Obtener evento por ID
   */
  static async getEventById(id: string): Promise<CalendarEvent | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as CalendarEvent;
    } catch (error) {
      console.error('Error getting calendar event:', error);
      throw this.handleError(
        error,
        'Error al obtener evento de calendario',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Actualizar evento
   */
  static async updateEvent(
    id: string,
    data: CalendarEventUpdateData
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.date !== undefined)
        updateData.date = Timestamp.fromDate(data.date);
      if (data.endDate !== undefined)
        updateData.endDate = data.endDate
          ? Timestamp.fromDate(data.endDate)
          : null;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.responsibleUserId !== undefined)
        updateData.responsibleUserId = data.responsibleUserId;
      if (data.responsibleUserName !== undefined)
        updateData.responsibleUserName = data.responsibleUserName;
      if (data.participantIds !== undefined)
        updateData.participantIds = data.participantIds;
      if (data.processId !== undefined) updateData.processId = data.processId;
      if (data.processName !== undefined)
        updateData.processName = data.processName;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;
      if (data.notificationSchedule !== undefined)
        updateData.notificationSchedule = data.notificationSchedule;

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw this.handleError(
        error,
        'Error al actualizar evento de calendario',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Eliminar evento (soft delete)
   */
  static async deleteEvent(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      await updateDoc(docRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw this.handleError(
        error,
        'Error al eliminar evento de calendario',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Eliminar evento permanentemente (hard delete)
   * Solo para uso interno en sincronización
   */
  static async hardDeleteEvent(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error hard deleting calendar event:', error);
      throw this.handleError(
        error,
        'Error al eliminar permanentemente evento de calendario',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Obtener eventos por rango de fechas
   */
  static async getEventsByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: EventFilters,
    organizationId?: string
  ): Promise<CalendarEvent[]> {
    try {
      const constraints: QueryConstraint[] = [where('isActive', '==', true)];

      // Filtro por organización (requerido para seguridad)
      if (organizationId) {
        constraints.push(where('organizationId', '==', organizationId));
      }

      // Filtro por rango de fechas
      constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
      constraints.push(where('date', '<=', Timestamp.fromDate(endDate)));

      // Aplicar filtros adicionales
      if (filters?.type && typeof filters.type === 'string') {
        constraints.push(where('type', '==', filters.type));
      }

      if (filters?.sourceModule && typeof filters.sourceModule === 'string') {
        constraints.push(where('sourceModule', '==', filters.sourceModule));
      }

      if (filters?.status && typeof filters.status === 'string') {
        constraints.push(where('status', '==', filters.status));
      }

      if (filters?.responsibleUserId) {
        constraints.push(
          where('responsibleUserId', '==', filters.responsibleUserId)
        );
      }

      if (filters?.processId) {
        constraints.push(where('processId', '==', filters.processId));
      }

      if (filters?.isSystemGenerated !== undefined) {
        constraints.push(
          where('isSystemGenerated', '==', filters.isSystemGenerated)
        );
      }

      // Ordenar por fecha
      constraints.push(orderBy('date', 'asc'));
      constraints.push(limit(500)); // Límite de seguridad

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      let events: CalendarEvent[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CalendarEvent[];

      // Filtros en memoria para arrays
      if (filters?.type && Array.isArray(filters.type)) {
        events = events.filter(e => filters.type!.includes(e.type));
      }

      if (filters?.sourceModule && Array.isArray(filters.sourceModule)) {
        events = events.filter(e =>
          filters.sourceModule!.includes(e.sourceModule)
        );
      }

      if (filters?.status && Array.isArray(filters.status)) {
        events = events.filter(e => filters.status!.includes(e.status));
      }

      if (filters?.priority && Array.isArray(filters.priority)) {
        events = events.filter(e => filters.priority!.includes(e.priority));
      } else if (filters?.priority && typeof filters.priority === 'string') {
        events = events.filter(e => e.priority === filters.priority);
      }

      // Filtro de búsqueda en memoria
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        events = events.filter(
          e =>
            e.title.toLowerCase().includes(searchLower) ||
            e.description?.toLowerCase().includes(searchLower) ||
            e.sourceRecordNumber?.toLowerCase().includes(searchLower)
        );
      }

      return events;
    } catch (error) {
      console.error('Error getting events by date range:', error);
      throw this.handleError(
        error,
        'Error al obtener eventos por rango de fechas',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Obtener eventos de un usuario
   */
  static async getEventsByUser(
    userId: string,
    filters?: EventFilters,
    organizationId?: string
  ): Promise<CalendarEvent[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        where('responsibleUserId', '==', userId),
      ];

      if (organizationId) {
        constraints.push(where('organizationId', '==', organizationId));
      }

      constraints.push(orderBy('date', 'asc'));
      constraints.push(limit(500));

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      let events: CalendarEvent[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CalendarEvent[];

      // Aplicar filtros adicionales en memoria
      events = this.applyInMemoryFilters(events, filters);

      return events;
    } catch (error) {
      console.error('Error getting events by user:', error);
      throw this.handleError(
        error,
        'Error al obtener eventos del usuario',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Obtener eventos por módulo
   */
  static async getEventsByModule(
    module: string,
    filters?: EventFilters,
    organizationId?: string
  ): Promise<CalendarEvent[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        where('sourceModule', '==', module),
      ];

      if (organizationId) {
        constraints.push(where('organizationId', '==', organizationId));
      }

      constraints.push(orderBy('date', 'asc'));
      constraints.push(limit(500));

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      let events: CalendarEvent[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CalendarEvent[];

      events = this.applyInMemoryFilters(events, filters);

      return events;
    } catch (error) {
      console.error('Error getting events by module:', error);
      throw this.handleError(
        error,
        'Error al obtener eventos del módulo',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Obtener eventos próximos (N días)
   */
  static async getUpcomingEvents(
    days: number,
    filters?: EventFilters,
    organizationId?: string
  ): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      return await this.getEventsByDateRange(
        now,
        futureDate,
        filters,
        organizationId
      );
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw this.handleError(
        error,
        'Error al obtener eventos próximos',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Obtener eventos vencidos
   */
  static async getOverdueEvents(
    filters?: EventFilters,
    organizationId?: string
  ): Promise<CalendarEvent[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        where('date', '<', Timestamp.now()),
        where('status', '!=', 'completed'),
      ];

      if (organizationId) {
        constraints.push(where('organizationId', '==', organizationId));
      }

      constraints.push(orderBy('status'));
      constraints.push(orderBy('date', 'desc'));
      constraints.push(limit(200));

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      let events: CalendarEvent[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CalendarEvent[];

      events = this.applyInMemoryFilters(events, filters);

      return events;
    } catch (error) {
      console.error('Error getting overdue events:', error);
      throw this.handleError(
        error,
        'Error al obtener eventos vencidos',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  // ============================================
  // AI QUERY METHODS
  // ============================================

  /**
   * Obtener carga de trabajo de un usuario
   */
  static async getUserWorkload(
    userId: string,
    period: 'week' | 'month' | 'quarter',
    startDate?: Date,
    organizationId?: string
  ): Promise<import('@/types/calendar').UserWorkload> {
    try {
      const start = startDate || new Date();
      const end = new Date(start);

      // Calcular rango según período
      switch (period) {
        case 'week':
          end.setDate(end.getDate() + 7);
          break;
        case 'month':
          end.setMonth(end.getMonth() + 1);
          break;
        case 'quarter':
          end.setMonth(end.getMonth() + 3);
          break;
      }

      // Obtener eventos del usuario en el período
      const events = await this.getEventsByDateRange(
        start,
        end,
        { responsibleUserId: userId },
        organizationId
      );

      // Calcular métricas
      const totalEvents = events.length;
      const overdueEvents = events.filter(
        e =>
          e.status === 'overdue' ||
          (e.date.toDate() < new Date() && e.status !== 'completed')
      ).length;
      const upcomingEvents = events.filter(
        e => e.date.toDate() > new Date() && e.status === 'scheduled'
      ).length;
      const completedEvents = events.filter(
        e => e.status === 'completed'
      ).length;

      // Agrupar por tipo
      const byType = events.reduce(
        (acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Agrupar por prioridad
      const byPriority = events.reduce(
        (acc, e) => {
          acc[e.priority] = (acc[e.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Agrupar por estado
      const byStatus = events.reduce(
        (acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Calcular tasa de completitud
      const completionRate =
        totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;

      // Calcular promedio de eventos por día
      const daysDiff = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const averageEventsPerDay = totalEvents / daysDiff;

      // Encontrar día pico
      const eventsByDay = events.reduce(
        (acc, e) => {
          const dateKey = e.date.toDate().toISOString().split('T')[0];
          acc[dateKey] = (acc[dateKey] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const peakDay = Object.entries(eventsByDay).reduce(
        (max, [date, count]) => {
          return count > (max?.count || 0)
            ? { date: new Date(date), count }
            : max;
        },
        null as { date: Date; count: number } | null
      );

      // Obtener nombre del usuario (del primer evento)
      const userName = events[0]?.responsibleUserName || 'Usuario';

      return {
        userId,
        userName,
        period,
        startDate: start,
        endDate: end,
        totalEvents,
        overdueEvents,
        upcomingEvents,
        completedEvents,
        byType: byType as Record<import('@/types/calendar').EventType, number>,
        byPriority: byPriority as Record<
          import('@/types/calendar').EventPriority,
          number
        >,
        byStatus: byStatus as Record<
          import('@/types/calendar').EventStatus,
          number
        >,
        completionRate,
        averageEventsPerDay,
        peakDay,
      };
    } catch (error) {
      console.error('Error getting user workload:', error);
      throw this.handleError(
        error,
        'Error al obtener carga de trabajo del usuario',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Obtener disponibilidad de un usuario
   */
  static async getUserAvailability(
    userId: string,
    startDate: Date,
    endDate: Date,
    workingHours: { start: string; end: string } = {
      start: '09:00',
      end: '18:00',
    },
    _minSlotDuration: number = 30,
    includeWeekends: boolean = false,
    organizationId?: string
  ): Promise<import('@/types/calendar').UserAvailability> {
    try {
      // Obtener eventos del usuario en el rango
      const events = await this.getEventsByDateRange(
        startDate,
        endDate,
        { responsibleUserId: userId, status: ['scheduled', 'in_progress'] },
        organizationId
      );

      // Generar slots disponibles
      const availableSlots: import('@/types/calendar').AvailabilitySlot[] = [];
      const busySlots: import('@/types/calendar').AvailabilitySlot[] = [];

      // Convertir eventos a busy slots
      events.forEach(event => {
        const eventStart = event.date.toDate();
        const eventEnd =
          event.endDate?.toDate() ||
          new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hora por defecto

        busySlots.push({
          startTime: eventStart,
          endTime: eventEnd,
          durationMinutes: Math.round(
            (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60)
          ),
          isAvailable: false,
        });
      });

      // Generar slots disponibles (simplificado)
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();

        // Saltar fines de semana si no están incluidos
        if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Crear slots para el día
        const [startHour, startMin] = workingHours.start.split(':').map(Number);
        const [endHour, endMin] = workingHours.end.split(':').map(Number);

        const dayStart = new Date(currentDate);
        dayStart.setHours(startHour, startMin, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(endHour, endMin, 0, 0);

        // Verificar si hay eventos en este día
        const dayEvents = busySlots.filter(
          slot => slot.startTime.toDateString() === currentDate.toDateString()
        );

        if (dayEvents.length === 0) {
          // Todo el día disponible
          availableSlots.push({
            startTime: dayStart,
            endTime: dayEnd,
            durationMinutes: Math.round(
              (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60)
            ),
            isAvailable: true,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calcular tasa de utilización
      const totalMinutes = availableSlots.reduce(
        (sum, slot) => sum + slot.durationMinutes,
        0
      );
      const busyMinutes = busySlots.reduce(
        (sum, slot) => sum + slot.durationMinutes,
        0
      );
      const utilizationRate =
        totalMinutes > 0
          ? (busyMinutes / (totalMinutes + busyMinutes)) * 100
          : 0;

      // Obtener nombre del usuario
      const userName = events[0]?.responsibleUserName || 'Usuario';

      return {
        userId,
        userName,
        dateRange: { startDate, endDate },
        workingHours,
        totalSlots: availableSlots.length + busySlots.length,
        availableSlots,
        busySlots,
        utilizationRate,
      };
    } catch (error) {
      console.error('Error getting user availability:', error);
      throw this.handleError(
        error,
        'Error al obtener disponibilidad del usuario',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  /**
   * Obtener contexto completo de un evento
   */
  static async getEventContext(
    eventId: string,
    includeSourceRecord: boolean = true,
    _includeRelatedRecords: boolean = true
  ): Promise<import('@/types/calendar').EventContext | null> {
    try {
      const event = await this.getEventById(eventId);
      if (!event) return null;

      const context: import('@/types/calendar').EventContext = {
        event,
        sourceRecord: null,
        relatedRecords: [],
        responsibleUser: event.responsibleUserId
          ? {
              id: event.responsibleUserId,
              name: event.responsibleUserName || 'Usuario',
              email: '', // Se puede obtener de Firestore si es necesario
            }
          : null,
        participants:
          event.participantIds?.map(id => ({
            id,
            name: 'Participante',
            email: '',
          })) || null,
        process: event.processId
          ? {
              id: event.processId,
              name: event.processName || 'Proceso',
            }
          : null,
        organization: {
          id: event.organizationId,
          name: 'Organización',
        },
      };

      // Aquí se podría obtener el registro origen desde su colección
      // Por ahora retornamos el contexto básico
      if (includeSourceRecord && event.sourceRecordId) {
        // TODO: Implementar obtención del registro origen según sourceModule
        // Ejemplo: si sourceModule === 'audits', obtener de collection 'audits'
      }

      return context;
    } catch (error) {
      console.error('Error getting event context:', error);
      throw this.handleError(
        error,
        'Error al obtener contexto del evento',
        'DATABASE_ERROR' as CalendarErrorCode
      );
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static applyInMemoryFilters(
    events: CalendarEvent[],
    filters?: EventFilters
  ): CalendarEvent[] {
    if (!filters) return events;

    let filtered = events;

    if (filters.type && Array.isArray(filters.type)) {
      filtered = filtered.filter(e => filters.type!.includes(e.type));
    } else if (filters.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }

    if (filters.sourceModule && Array.isArray(filters.sourceModule)) {
      filtered = filtered.filter(e =>
        filters.sourceModule!.includes(e.sourceModule)
      );
    } else if (filters.sourceModule) {
      filtered = filtered.filter(e => e.sourceModule === filters.sourceModule);
    }

    if (filters.status && Array.isArray(filters.status)) {
      filtered = filtered.filter(e => filters.status!.includes(e.status));
    } else if (filters.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }

    if (filters.priority && Array.isArray(filters.priority)) {
      filtered = filtered.filter(e => filters.priority!.includes(e.priority));
    } else if (filters.priority) {
      filtered = filtered.filter(e => e.priority === filters.priority);
    }

    if (filters.processId) {
      filtered = filtered.filter(e => e.processId === filters.processId);
    }

    if (filters.isSystemGenerated !== undefined) {
      filtered = filtered.filter(
        e => e.isSystemGenerated === filters.isSystemGenerated
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.title.toLowerCase().includes(searchLower) ||
          e.description?.toLowerCase().includes(searchLower) ||
          e.sourceRecordNumber?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  private static handleError(
    error: unknown,
    message: string,
    code: CalendarErrorCode
  ): Error {
    const CalendarError = class extends Error {
      constructor(
        message: string,
        public code: CalendarErrorCode,
        public details?: unknown
      ) {
        super(message);
        this.name = 'CalendarError';
      }
    };

    return new CalendarError(message, code, { originalError: error });
  }

  // ============================================
  // EXPORT OPERATIONS
  // ============================================

  /**
   * Generar archivo iCalendar (.ics) para eventos
   */
  static generateICalendar(
    events: CalendarEvent[],
    calendarName = 'Calendario'
  ): string {
    const lines: string[] = [];

    // Header del calendario
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Sistema de Gestión//Calendario//ES');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push(`X-WR-CALNAME:${calendarName}`);
    lines.push('X-WR-TIMEZONE:America/Argentina/Buenos_Aires');

    // Agregar cada evento
    for (const event of events) {
      lines.push('BEGIN:VEVENT');

      // UID único
      lines.push(`UID:${event.id}@sistema-gestion.com`);

      // Fecha de creación y última modificación
      lines.push(`DTSTAMP:${formatICalDate(event.createdAt)}`);
      lines.push(`CREATED:${formatICalDate(event.createdAt)}`);
      lines.push(`LAST-MODIFIED:${formatICalDate(event.updatedAt)}`);

      // Fechas del evento
      const eventDate =
        event.date instanceof Timestamp
          ? event.date.toDate()
          : new Date(event.date);

      if (event.endDate) {
        const endDate =
          event.endDate instanceof Timestamp
            ? event.endDate.toDate()
            : new Date(event.endDate);
        // Evento con fecha de inicio y fin
        lines.push(`DTSTART:${formatICalDate(eventDate)}`);
        lines.push(`DTEND:${formatICalDate(endDate)}`);
      } else {
        // Evento de un solo día
        lines.push(`DTSTART:${formatICalDate(eventDate)}`);
        lines.push(
          `DTEND:${formatICalDate(new Date(eventDate.getTime() + 60 * 60 * 1000))}`
        ); // +1 hora
      }

      // Título y descripción
      lines.push(`SUMMARY:${escapeICalText(event.title)}`);
      if (event.description) {
        lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
      }

      // Ubicación (si hay proceso)
      if (event.processName) {
        lines.push(`LOCATION:${escapeICalText(event.processName)}`);
      }

      // Categoría (tipo de evento)
      lines.push(`CATEGORIES:${event.type}`);

      // Prioridad (mapear a escala iCal: 1=high, 5=medium, 9=low)
      const icalPriority =
        event.priority === 'critical' || event.priority === 'high'
          ? 1
          : event.priority === 'medium'
            ? 5
            : 9;
      lines.push(`PRIORITY:${icalPriority}`);

      // Estado
      const icalStatus =
        event.status === 'completed'
          ? 'COMPLETED'
          : event.status === 'cancelled'
            ? 'CANCELLED'
            : event.status === 'in_progress'
              ? 'IN-PROCESS'
              : 'CONFIRMED';
      lines.push(`STATUS:${icalStatus}`);

      // Organizador (responsable)
      if (event.responsibleUserName) {
        lines.push(
          `ORGANIZER;CN=${escapeICalText(event.responsibleUserName)}:mailto:noreply@sistema-gestion.com`
        );
      }

      // Participantes
      if (event.participantIds && event.participantIds.length > 0) {
        for (const participantId of event.participantIds) {
          lines.push(
            `ATTENDEE;ROLE=REQ-PARTICIPANT:mailto:${participantId}@sistema-gestion.com`
          );
        }
      }

      // Alarma (recordatorio 1 día antes)
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-P1D');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Recordatorio: ${escapeICalText(event.title)}`);
      lines.push('END:VALARM');

      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  /**
   * Generar archivo CSV para eventos
   */
  static generateCSV(events: CalendarEvent[]): string {
    const headers = [
      'ID',
      'Título',
      'Descripción',
      'Fecha',
      'Fecha Fin',
      'Tipo',
      'Módulo',
      'Estado',
      'Prioridad',
      'Responsable',
      'Proceso',
      'Número de Registro',
      'Creado Por',
      'Fecha Creación',
    ];

    const rows: string[][] = [headers];

    for (const event of events) {
      const eventDate =
        event.date instanceof Timestamp
          ? event.date.toDate()
          : new Date(event.date);
      const endDate = event.endDate
        ? event.endDate instanceof Timestamp
          ? event.endDate.toDate()
          : new Date(event.endDate)
        : null;
      const createdAt =
        event.createdAt instanceof Timestamp
          ? event.createdAt.toDate()
          : new Date(event.createdAt);

      rows.push([
        event.id,
        event.title,
        event.description || '',
        formatCSVDate(eventDate),
        endDate ? formatCSVDate(endDate) : '',
        event.type,
        event.sourceModule,
        event.status,
        event.priority,
        event.responsibleUserName || '',
        event.processName || '',
        event.sourceRecordNumber || '',
        event.createdByName,
        formatCSVDate(createdAt),
      ]);
    }

    return rows
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Formatear fecha para iCalendar (formato: YYYYMMDDTHHmmssZ)
 */
function formatICalDate(date: Timestamp | Date): string {
  const d = date instanceof Timestamp ? date.toDate() : date;

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escapar texto para iCalendar
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Formatear fecha para CSV
 */
function formatCSVDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
