/**
 * KanbanService
 * Servicio para gestión del sistema Kanban de pipeline de clientes
 */

import { ESTADOS_KANBAN_DEFAULT } from '@/data/crm/scoring-config';
import { db } from '@/firebase/config';
import type {
  CreateEstadoKanbanData,
  EstadoClienteKanban,
  HistorialEstadoCliente,
} from '@/types/crm';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

export class KanbanService {
  private static readonly COLLECTION = 'kanban_estados';

  /**
   * Inicializa los estados predeterminados del Kanban
   */
  static async inicializarEstadosDefault(): Promise<EstadoClienteKanban[]> {
    try {
      const estados: EstadoClienteKanban[] = [];
      const now = new Date().toISOString();

      for (const estadoDefault of ESTADOS_KANBAN_DEFAULT) {
        const estadoData = {
          ...estadoDefault,
          created_at: now,
          updated_at: now,
        };

        const docRef = await addDoc(
          collection(db, this.COLLECTION),
          estadoData
        );

        estados.push({
          id: docRef.id,
          ...estadoData,
        });
      }

      return estados;
    } catch (error) {
      console.error('Error inicializando estados default:', error);
      throw new Error('Failed to inicializar estados default');
    }
  }

  /**
   * Obtiene todos los estados del Kanban ordenados
   */
  static async getEstados(): Promise<EstadoClienteKanban[]> {
    try {
      const q = query(collection(db, this.COLLECTION), orderBy('orden', 'asc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Si no hay estados, crear los predeterminados
        return await this.inicializarEstadosDefault();
      }

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EstadoClienteKanban[];
    } catch (error) {
      console.error('Error getting estados:', error);
      throw new Error('Failed to get estados');
    }
  }

  /**
   * Obtiene un estado por ID
   */
  static async getEstadoById(id: string): Promise<EstadoClienteKanban | null> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as EstadoClienteKanban;
    } catch (error) {
      console.error('Error getting estado:', error);
      throw new Error('Failed to get estado');
    }
  }

  /**
   * Crea un nuevo estado personalizado
   */
  static async crearEstado(
    data: CreateEstadoKanbanData,
    organizationId: string = '',
    tipo: string = 'crm'
  ): Promise<EstadoClienteKanban> {
    try {
      const now = new Date().toISOString();

      const estadoData = {
        ...data,
        organization_id: data.organization_id ?? organizationId,
        tipo: data.tipo ?? tipo,
        es_estado_final: data.es_estado_final ?? false,
        permite_edicion: true, // Estados personalizados siempre son editables
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), estadoData);

      return {
        id: docRef.id,
        ...estadoData,
      };
    } catch (error) {
      console.error('Error creating estado:', error);
      throw new Error('Failed to create estado');
    }
  }

  /**
   * Actualiza un estado existente
   */
  static async actualizarEstado(
    id: string,
    data: Partial<CreateEstadoKanbanData>
  ): Promise<void> {
    try {
      // Verificar que el estado existe y es editable
      const estado = await this.getEstadoById(id);

      if (!estado) {
        throw new Error('Estado no encontrado');
      }

      if (!estado.permite_edicion) {
        throw new Error('Este estado del sistema no puede ser editado');
      }

      const docRef = doc(db, this.COLLECTION, id);
      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating estado:', error);
      throw new Error('Failed to update estado');
    }
  }

  /**
   * Elimina un estado personalizado
   */
  static async eliminarEstado(id: string): Promise<void> {
    try {
      // Verificar que el estado existe y es editable
      const estado = await this.getEstadoById(id);

      if (!estado) {
        throw new Error('Estado no encontrado');
      }

      if (!estado.permite_edicion) {
        throw new Error('Este estado del sistema no puede ser eliminado');
      }

      // TODO: Verificar que no hay clientes en este estado
      // Esto se implementará cuando tengamos el ClienteCRMService

      const docRef = doc(db, this.COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting estado:', error);
      throw new Error('Failed to delete estado');
    }
  }

  /**
   * Crea un registro de historial de cambio de estado
   */
  static crearHistorialEstado(
    estadoAnteriorId: string,
    estadoAnteriorNombre: string,
    estadoNuevoId: string,
    estadoNuevoNombre: string,
    usuarioId: string,
    usuarioNombre?: string,
    motivo?: string
  ): HistorialEstadoCliente {
    return {
      estado_anterior_id: estadoAnteriorId,
      estado_anterior_nombre: estadoAnteriorNombre,
      estado_nuevo_id: estadoNuevoId,
      estado_nuevo_nombre: estadoNuevoNombre,
      fecha_cambio: new Date().toISOString(),
      usuario_id: usuarioId,
      usuarioNombre,
      motivo,
    };
  }

  /**
   * Valida si un movimiento de estado es permitido
   */
  static async validarMovimiento(
    estadoActualId: string,
    estadoNuevoId: string
  ): Promise<{ valido: boolean; mensaje?: string }> {
    try {
      const estadoActual = await this.getEstadoById(estadoActualId);
      const estadoNuevo = await this.getEstadoById(estadoNuevoId);

      if (!estadoActual || !estadoNuevo) {
        return {
          valido: false,
          mensaje: 'Uno de los estados no existe',
        };
      }

      // Si el estado actual es final, no se puede mover (excepto a sí mismo)
      if (estadoActual.es_estado_final && estadoActualId !== estadoNuevoId) {
        return {
          valido: false,
          mensaje: `No se puede mover desde el estado final "${estadoActual.nombre}"`,
        };
      }

      // Validaciones adicionales se pueden agregar aquí
      // Por ejemplo, validar flujos permitidos según configuración

      return { valido: true };
    } catch (error) {
      console.error('Error validando movimiento:', error);
      return {
        valido: false,
        mensaje: 'Error al validar el movimiento',
      };
    }
  }

  /**
   * Obtiene estadísticas por estado
   */
  static async getEstadisticasPorEstado(): Promise<
    Array<{
      estado_id: string;
      estado_nombre: string;
      cantidad_clientes: number;
      monto_total_estimado: number;
    }>
  > {
    // Esta función se implementará completamente cuando tengamos ClienteCRMService
    // Por ahora retornamos un array vacío
    return [];
  }
}
