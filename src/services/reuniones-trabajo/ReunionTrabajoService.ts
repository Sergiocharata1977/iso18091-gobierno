import { db } from '@/firebase/config';
import { EventPublisher } from '@/services/calendar/EventPublisher';
import type {
  CreateReunionData,
  ReunionTrabajo,
  UpdateReunionData,
} from '@/types/reuniones-trabajo';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

/**
 * ReunionTrabajoService
 *
 * Servicio para gestionar reuniones de trabajo (management review, reuniones de proceso, etc.)
 * con actas, acuerdos y acciones derivadas.
 */
export class ReunionTrabajoService {
  private static readonly COLLECTION = 'reuniones_trabajo';

  /**
   * Obtiene todas las reuniones con filtros opcionales
   */
  static async getAll(filters?: {
    organization_id?: string;
    tipo?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    estado?: string;
    search?: string;
  }): Promise<ReunionTrabajo[]> {
    try {
      const reunionesRef = collection(db, this.COLLECTION);
      let q = query(reunionesRef, where('isActive', '==', true));

      // Aplicar filtros
      if (filters?.organization_id) {
        q = query(q, where('organization_id', '==', filters.organization_id));
      }
      if (filters?.tipo) {
        q = query(q, where('tipo', '==', filters.tipo));
      }
      if (filters?.estado) {
        q = query(q, where('estado', '==', filters.estado));
      }

      // Ordenar por fecha descendente
      q = query(q, orderBy('fecha', 'desc'));

      const snapshot = await getDocs(q);
      let reuniones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ReunionTrabajo[];

      // Filtrar por búsqueda si se proporciona
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        reuniones = reuniones.filter(
          reunion =>
            reunion.titulo.toLowerCase().includes(searchTerm) ||
            reunion.organizador_nombre?.toLowerCase().includes(searchTerm)
        );
      }

      // Filtrar por rango de fechas
      if (filters?.fecha_desde || filters?.fecha_hasta) {
        reuniones = reuniones.filter(reunion => {
          const fechaReunion = new Date(reunion.fecha);
          if (
            filters.fecha_desde &&
            fechaReunion < new Date(filters.fecha_desde)
          )
            return false;
          if (
            filters.fecha_hasta &&
            fechaReunion > new Date(filters.fecha_hasta)
          )
            return false;
          return true;
        });
      }

      return reuniones;
    } catch (error) {
      console.error('Error getting reuniones:', error);
      throw new Error('Failed to get reuniones');
    }
  }

  /**
   * Obtiene una reunión por ID
   */
  static async getById(id: string): Promise<ReunionTrabajo | null> {
    try {
      const reunionRef = doc(db, this.COLLECTION, id);
      const reunionDoc = await getDoc(reunionRef);

      if (!reunionDoc.exists()) {
        return null;
      }

      return {
        id: reunionDoc.id,
        ...reunionDoc.data(),
      } as ReunionTrabajo;
    } catch (error) {
      console.error('Error getting reunion:', error);
      throw new Error('Failed to get reunion');
    }
  }

  /**
   * Crea una nueva reunión
   */
  static async create(
    data: CreateReunionData,
    userId: string
  ): Promise<string> {
    try {
      const now = new Date();

      const reunionData: Omit<ReunionTrabajo, 'id'> = {
        organization_id: '', // TODO: Obtener de contexto de usuario
        tipo: data.tipo as ReunionTrabajo['tipo'],
        titulo: data.titulo,
        fecha: data.fecha,
        duracion_minutos: data.duracion_minutos,
        lugar: data.lugar,
        modalidad: data.modalidad as ReunionTrabajo['modalidad'],
        organizador_id: data.organizador_id,
        facilitador_id: data.facilitador_id,
        participantes: data.participantes.map(p => ({
          usuario_id: p.usuario_id,
          usuario_nombre: '',
          rol: p.rol as ReunionTrabajo['participantes'][0]['rol'],
          asistio: false,
        })),
        agenda:
          data.agenda?.map(a => ({
            orden: a.orden,
            tema: a.tema,
            tiempo_estimado: a.tiempo_estimado,
            estado: 'planificado' as const,
          })) || [],
        puntos_tratados: [],
        acuerdos: [],
        estado: 'planificada',
        relacionada_proceso_id: data.relacionada_proceso_id,
        relacionada_auditoria_id: data.relacionada_auditoria_id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        created_by: userId,
        isActive: true,
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), reunionData);
      const reunionId = docRef.id;

      // Publicar evento en el calendario
      try {
        await EventPublisher.publishEvent('meetings', {
          title: `Reunión: ${data.titulo}`,
          description: `${data.tipo} - ${data.lugar}`,
          date: new Date(data.fecha),
          type: 'meeting',
          sourceRecordId: reunionId,
          sourceRecordType: 'meeting',
          priority: data.tipo === 'revision_direccion' ? 'high' : 'medium',
          participantIds: data.participantes.map(p => p.usuario_id),
          metadata: {
            reunionId,
            tipo: data.tipo,
            modalidad: data.modalidad,
            duracion_minutos: data.duracion_minutos,
          },
        });
      } catch (error) {
        console.error('Error publishing meeting event:', error);
      }

      return reunionId;
    } catch (error) {
      console.error('Error creating reunion:', error);
      throw new Error('Failed to create reunion');
    }
  }

  /**
   * Actualiza una reunión existente
   */
  static async update(
    id: string,
    data: UpdateReunionData,
    userId: string
  ): Promise<void> {
    try {
      const reunionRef = doc(db, this.COLLECTION, id);
      const updateData: Record<string, unknown> = {
        ...data,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(reunionRef, updateData);
    } catch (error) {
      console.error('Error updating reunion:', error);
      throw new Error('Failed to update reunion');
    }
  }

  /**
   * Elimina una reunión (soft delete)
   */
  static async delete(id: string, userId: string): Promise<void> {
    try {
      const reunionRef = doc(db, this.COLLECTION, id);
      await updateDoc(reunionRef, {
        isActive: false,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      });

      // Eliminar evento del calendario
      try {
        await EventPublisher.deletePublishedEvent('meetings', id);
      } catch (error) {
        console.error('Error deleting meeting event:', error);
      }
    } catch (error) {
      console.error('Error deleting reunion:', error);
      throw new Error('Failed to delete reunion');
    }
  }

  /**
   * Registra el acta de una reunión
   */
  static async registrarActa(
    id: string,
    puntosTratados: ReunionTrabajo['puntos_tratados'],
    acuerdos: ReunionTrabajo['acuerdos'],
    userId: string
  ): Promise<void> {
    try {
      const reunionRef = doc(db, this.COLLECTION, id);
      await updateDoc(reunionRef, {
        puntos_tratados: puntosTratados,
        acuerdos: acuerdos,
        estado: 'realizada',
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error registering acta:', error);
      throw new Error('Failed to register acta');
    }
  }

  /**
   * Actualiza el estado de un acuerdo
   */
  static async actualizarEstadoAcuerdo(
    reunionId: string,
    acuerdoId: string,
    estado: ReunionTrabajo['acuerdos'][0]['estado'],
    userId: string
  ): Promise<void> {
    try {
      const reunion = await this.getById(reunionId);
      if (!reunion) {
        throw new Error('Reunión no encontrada');
      }

      const acuerdosActualizados = reunion.acuerdos.map(acuerdo =>
        acuerdo.descripcion === acuerdoId // TODO: Cambiar por ID único
          ? { ...acuerdo, estado }
          : acuerdo
      );

      const reunionRef = doc(db, this.COLLECTION, reunionId);
      await updateDoc(reunionRef, {
        acuerdos: acuerdosActualizados,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating acuerdo status:', error);
      throw new Error('Failed to update acuerdo status');
    }
  }
}
