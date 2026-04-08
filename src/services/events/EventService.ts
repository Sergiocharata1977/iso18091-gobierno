/**
 * EventService - Servicio centralizado para eventos unificados
 * PRINCIPIO: No duplicar datos - solo campos comunes en events
 */
import { adminDb } from '@/firebase/admin';
import { createEventEnvelopeV1 } from '@/lib/integration/contracts';
import { writeIntegrationDLQ } from '@/lib/integration/dlq';
import { FieldValue } from 'firebase-admin/firestore';

export type TipoEvento =
  | 'capacitacion'
  | 'evaluacion'
  | 'auditoria'
  | 'hallazgo'
  | 'mantenimiento'
  | 'accion_correctiva'
  | 'accion_preventiva'
  | 'reunion'
  | 'otro';

export type EstadoEvento =
  | 'programado'
  | 'en_progreso'
  | 'completado'
  | 'cancelado';

export type PrioridadEvento = 'baja' | 'media' | 'alta' | 'critica';

/**
 * Datos para crear un evento - SOLO campos comunes
 */
export interface CreateEventData {
  organization_id: string;

  // Datos comunes del evento
  titulo: string;
  descripcion?: string;
  tipo_evento: TipoEvento;

  // Fechas
  fecha_inicio: Date;
  fecha_fin?: Date;
  todo_el_dia?: boolean;

  // Responsable
  responsable_id?: string;
  responsable_nombre?: string;

  // Estado
  estado?: EstadoEvento;
  prioridad?: PrioridadEvento;

  // Referencia al documento especifico (SIN duplicar sus datos)
  source_collection: string; // 'trainings' | 'evaluations' | etc.
  source_id: string; // ID del documento en la coleccion especifica

  // Auditoria
  created_by?: string;

  // Idempotencia operativa (opcional)
  idempotency_key?: string;
}

export interface UpdateEventData {
  titulo?: string;
  descripcion?: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  estado?: EstadoEvento;
  prioridad?: PrioridadEvento;
  responsable_id?: string;
  responsable_nombre?: string;
}

const COLLECTION_NAME = 'events';
const DLQ_COLLECTION_NAME = 'event_dlq';

async function logToDLQ(params: {
  operation: 'create' | 'update' | 'delete' | 'sync';
  payload: Record<string, unknown>;
  error: unknown;
  traceId?: string;
}) {
  try {
    await adminDb.collection(DLQ_COLLECTION_NAME).add({
      operation: params.operation,
      payload: params.payload,
      error_message:
        params.error instanceof Error
          ? params.error.message
          : JSON.stringify(params.error),
      created_at: FieldValue.serverTimestamp(),
      retries: 0,
      status: 'pending',
      trace_id: params.traceId || null,
    });
    await writeIntegrationDLQ({
      source: 'events',
      operation: params.operation,
      payload: params.payload,
      error: params.error,
      traceId: params.traceId,
    });
  } catch (dlqError) {
    console.error('[EventService] Error writing DLQ entry:', dlqError);
  }
}

export const EventService = {
  /**
   * Crear un nuevo evento (solo datos comunes)
   */
  async create(data: CreateEventData): Promise<string> {
    try {
      if (data.idempotency_key) {
        const existingByIdempotency = await adminDb
          .collection(COLLECTION_NAME)
          .where('organization_id', '==', data.organization_id)
          .where('idempotency_key', '==', data.idempotency_key)
          .where('activo', '==', true)
          .limit(1)
          .get();

        if (!existingByIdempotency.empty) {
          return existingByIdempotency.docs[0].id;
        }
      }

      const eventData = {
        envelope_v1: createEventEnvelopeV1({
          eventType: `events.${data.source_collection}.created`,
          organizationId: data.organization_id,
          producer: '9001app-firebase:event-service',
          idempotencyKey: data.idempotency_key || null,
          payloadRef: {
            collection: data.source_collection,
            id: data.source_id,
          },
        }),
        organization_id: data.organization_id,
        titulo: data.titulo,
        descripcion: data.descripcion || null,
        tipo_evento: data.tipo_evento,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin || null,
        todo_el_dia: data.todo_el_dia || false,
        responsable_id: data.responsable_id || null,
        responsable_nombre: data.responsable_nombre || null,
        estado: data.estado || 'programado',
        prioridad: data.prioridad || 'media',
        source_collection: data.source_collection,
        source_id: data.source_id,
        idempotency_key: data.idempotency_key || null,
        activo: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        created_by: data.created_by || 'system',
      };

      const docRef = await adminDb.collection(COLLECTION_NAME).add(eventData);
      console.log(
        `[EventService] Created event: ${docRef.id} for ${data.source_collection}/${data.source_id}`
      );
      return docRef.id;
    } catch (error) {
      console.error('[EventService] Error creating event:', error);
      await logToDLQ({
        operation: 'create',
        payload: data as unknown as Record<string, unknown>,
        error,
        traceId: data.idempotency_key || undefined,
      });
      throw error;
    }
  },

  /**
   * Actualizar un evento existente
   */
  async update(eventId: string, data: UpdateEventData): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        updated_at: FieldValue.serverTimestamp(),
      };

      // Solo agregar campos que tienen valor
      if (data.titulo !== undefined) updateData.titulo = data.titulo;
      if (data.descripcion !== undefined)
        updateData.descripcion = data.descripcion;
      if (data.fecha_inicio !== undefined)
        updateData.fecha_inicio = data.fecha_inicio;
      if (data.fecha_fin !== undefined) updateData.fecha_fin = data.fecha_fin;
      if (data.estado !== undefined) updateData.estado = data.estado;
      if (data.prioridad !== undefined) updateData.prioridad = data.prioridad;
      if (data.responsable_id !== undefined)
        updateData.responsable_id = data.responsable_id;
      if (data.responsable_nombre !== undefined)
        updateData.responsable_nombre = data.responsable_nombre;

      await adminDb.collection(COLLECTION_NAME).doc(eventId).update(updateData);
      console.log(`[EventService] Updated event: ${eventId}`);
    } catch (error) {
      console.error('[EventService] Error updating event:', error);
      await logToDLQ({
        operation: 'update',
        payload: {
          eventId,
          data,
        },
        error,
        traceId: eventId,
      });
      throw error;
    }
  },

  /**
   * Eliminar evento (soft delete)
   */
  async delete(eventId: string): Promise<void> {
    try {
      await adminDb.collection(COLLECTION_NAME).doc(eventId).update({
        activo: false,
        updated_at: FieldValue.serverTimestamp(),
      });
      console.log(`[EventService] Deleted event: ${eventId}`);
    } catch (error) {
      console.error('[EventService] Error deleting event:', error);
      await logToDLQ({
        operation: 'delete',
        payload: { eventId },
        error,
        traceId: eventId,
      });
      throw error;
    }
  },

  /**
   * Obtener evento por documento origen
   */
  async getBySource(
    sourceCollection: string,
    sourceId: string
  ): Promise<{ id: string; data: any } | null> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('source_collection', '==', sourceCollection)
        .where('source_id', '==', sourceId)
        .where('activo', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, data: doc.data() };
    } catch (error) {
      console.error('[EventService] Error getting event by source:', error);
      throw error;
    }
  },

  /**
   * Crear o actualizar evento desde un ABM
   * Retorna el event_id para guardar en la coleccion especifica
   */
  async syncFromSource(data: CreateEventData): Promise<string> {
    try {
      const existing = await this.getBySource(
        data.source_collection,
        data.source_id
      );

      if (existing) {
        // Actualizar evento existente
        await this.update(existing.id, {
          titulo: data.titulo,
          descripcion: data.descripcion,
          fecha_inicio: data.fecha_inicio,
          fecha_fin: data.fecha_fin,
          estado: data.estado,
          prioridad: data.prioridad,
          responsable_id: data.responsable_id,
          responsable_nombre: data.responsable_nombre,
        });
        return existing.id;
      } else {
        // Crear nuevo evento
        return await this.create(data);
      }
    } catch (error) {
      console.error('[EventService] Error syncing from source:', error);
      await logToDLQ({
        operation: 'sync',
        payload: data as unknown as Record<string, unknown>,
        error,
        traceId: data.idempotency_key || undefined,
      });
      throw error;
    }
  },

  /**
   * Eliminar evento asociado a un documento origen
   */
  async deleteBySource(
    sourceCollection: string,
    sourceId: string
  ): Promise<void> {
    try {
      const existing = await this.getBySource(sourceCollection, sourceId);
      if (existing) {
        await this.delete(existing.id);
      }
    } catch (error) {
      console.error('[EventService] Error deleting by source:', error);
      throw error;
    }
  },
};
