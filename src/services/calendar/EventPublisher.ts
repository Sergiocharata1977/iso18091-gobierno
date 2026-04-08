import { db } from '@/firebase/config';
import { CalendarService } from '@/services/calendar/CalendarService';
import type {
  CalendarErrorCode,
  PublishEventData,
  SourceModule,
  SyncResult,
} from '@/types/calendar';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

const MODULE_INTEGRATIONS_COLLECTION = 'module_integrations';

export class EventPublisher {
  // ============================================
  // PUBLICACIÓN DE EVENTOS
  // ============================================

  /**
   * Publicar evento desde un módulo ABM
   */
  static async publishEvent(
    module: SourceModule,
    eventData: PublishEventData
  ): Promise<string> {
    try {
      // Validar que el módulo esté integrado y habilitado
      const isValid = await this.validateModuleIntegration(module);
      if (!isValid) {
        throw this.createError(
          `Módulo ${module} no está integrado o está deshabilitado`,
          'MODULE_NOT_INTEGRATED' as CalendarErrorCode
        );
      }

      // Obtener organizationId del contexto (por ahora hardcoded, luego desde auth)
      // TODO: Obtener de Firebase Auth context
      const organizationId = 'default-org';

      // Crear evento en el calendario
      const eventId = await CalendarService.createEvent({
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        endDate: eventData.endDate || null,
        type: eventData.type,
        sourceModule: module,
        priority: eventData.priority,
        sourceRecordId: eventData.sourceRecordId,
        sourceRecordType: eventData.sourceRecordType,
        sourceRecordNumber: eventData.sourceRecordNumber || null,
        responsibleUserId: eventData.responsibleUserId || null,
        responsibleUserName: eventData.responsibleUserName || null,
        participantIds: eventData.participantIds || null,
        organizationId,
        processId: eventData.processId || null,
        processName: eventData.processName || null,
        metadata: eventData.metadata || null,
        notificationSchedule: {
          sevenDaysBefore: true,
          oneDayBefore: true,
          onEventDay: true,
          customDays: null,
        },
        isRecurring: false,
        recurrenceRule: null,
        createdBy: 'system',
        createdByName: `Sistema ${module}`,
        isSystemGenerated: true,
      });

      // Actualizar estadísticas del módulo
      await this.updateModuleStats(module, 'created');

      return eventId;
    } catch (error) {
      console.error(`Error publishing event from ${module}:`, error);
      throw error;
    }
  }

  /**
   * Actualizar evento publicado
   */
  static async updatePublishedEvent(
    module: SourceModule,
    sourceRecordId: string,
    updates: Partial<PublishEventData>
  ): Promise<void> {
    try {
      // Validar módulo
      const isValid = await this.validateModuleIntegration(module);
      if (!isValid) {
        throw this.createError(
          `Módulo ${module} no está integrado o está deshabilitado`,
          'MODULE_NOT_INTEGRATED' as CalendarErrorCode
        );
      }

      // Buscar evento por sourceModule y sourceRecordId
      const event = await this.findEventBySource(module, sourceRecordId);
      if (!event) {
        console.warn(`No se encontró evento para ${module}:${sourceRecordId}`);
        return;
      }

      // Actualizar evento
      await CalendarService.updateEvent(event.id, {
        title: updates.title,
        description: updates.description,
        date: updates.date,
        endDate: updates.endDate,
        priority: updates.priority,
        responsibleUserId: updates.responsibleUserId,
        responsibleUserName: updates.responsibleUserName,
        participantIds: updates.participantIds,
        processId: updates.processId,
        processName: updates.processName,
        metadata: updates.metadata,
      });

      await this.updateModuleStats(module, 'updated');
    } catch (error) {
      console.error(`Error updating published event from ${module}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar evento publicado
   */
  static async deletePublishedEvent(
    module: SourceModule,
    sourceRecordId: string
  ): Promise<void> {
    try {
      // Validar módulo
      const isValid = await this.validateModuleIntegration(module);
      if (!isValid) {
        console.warn(
          `Módulo ${module} no está integrado, omitiendo eliminación de evento`
        );
        return;
      }

      // Buscar evento
      const event = await this.findEventBySource(module, sourceRecordId);
      if (!event) {
        console.warn(`No se encontró evento para ${module}:${sourceRecordId}`);
        return;
      }

      // Eliminar evento
      await CalendarService.deleteEvent(event.id);

      await this.updateModuleStats(module, 'deleted');
    } catch (error) {
      console.error(`Error deleting published event from ${module}:`, error);
      throw error;
    }
  }

  // ============================================
  // VALIDACIÓN Y HELPERS
  // ============================================

  /**
   * Validar que el módulo esté integrado y habilitado
   */
  static async validateModuleIntegration(
    module: SourceModule
  ): Promise<boolean> {
    try {
      // Si el módulo es 'custom', siempre está habilitado
      if (module === 'custom') {
        return true;
      }

      const docRef = doc(db, MODULE_INTEGRATIONS_COLLECTION, module);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Si no existe el registro, crear uno por defecto habilitado
        // Esto permite que los módulos funcionen sin configuración previa
        console.warn(
          `Módulo ${module} no tiene registro de integración, asumiendo habilitado`
        );
        return true;
      }

      const integration = docSnap.data();
      return integration.isEnabled === true;
    } catch (error) {
      console.error(
        `Error validating module integration for ${module}:`,
        error
      );
      // En caso de error, permitir la operación para no bloquear funcionalidad
      return true;
    }
  }

  /**
   * Buscar evento por módulo y sourceRecordId
   */
  private static async findEventBySource(
    module: SourceModule,
    sourceRecordId: string
  ): Promise<{ id: string } | null> {
    try {
      const q = query(
        collection(db, 'calendar_events'),
        where('sourceModule', '==', module),
        where('sourceRecordId', '==', sourceRecordId),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      // Retornar el primer evento encontrado
      return { id: querySnapshot.docs[0].id };
    } catch (error) {
      console.error('Error finding event by source:', error);
      return null;
    }
  }

  /**
   * Actualizar estadísticas del módulo
   */
  private static async updateModuleStats(
    module: SourceModule,
    operation: 'created' | 'updated' | 'deleted'
  ): Promise<void> {
    try {
      // Por ahora solo logging, implementación completa en fase posterior
      console.log(`Module ${module} stats: ${operation}`);
    } catch (error) {
      console.error('Error updating module stats:', error);
      // No lanzar error para no bloquear operación principal
    }
  }

  // ============================================
  // SINCRONIZACIÓN MASIVA
  // ============================================

  /**
   * Sincronizar eventos de un módulo completo
   * Útil para migración inicial o resincronización
   */
  static async syncModuleEvents(module: SourceModule): Promise<SyncResult> {
    const result: SyncResult = {
      module,
      success: false,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Validar módulo
      const isValid = await this.validateModuleIntegration(module);
      if (!isValid) {
        result.errors.push('Módulo no está habilitado');
        return result;
      }

      // TODO: Implementar lógica de sincronización específica por módulo
      // Por ahora solo retornar resultado vacío
      result.success = true;

      return result;
    } catch (error) {
      console.error(`Error syncing module ${module}:`, error);
      result.errors.push(
        error instanceof Error ? error.message : 'Error desconocido'
      );
      return result;
    }
  }

  // ============================================
  // ERROR HANDLING
  // ============================================

  private static createError(message: string, code: CalendarErrorCode): Error {
    const CalendarError = class extends Error {
      constructor(
        message: string,
        public code: CalendarErrorCode
      ) {
        super(message);
        this.name = 'CalendarError';
      }
    };

    return new CalendarError(message, code);
  }
}
