/**
 * ClienteCRMServiceAdmin
 * Versión Admin SDK para uso en API Routes
 * Bypass de reglas de seguridad de Firestore
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import type { ClienteCRM, UpdateClienteCRMData } from '@/types/crm';

export class ClienteCRMServiceAdmin {
  private static readonly COLLECTION = 'crm_organizaciones';

  /**
   * Obtiene un cliente por ID
   */
  static async getById(id: string): Promise<ClienteCRM | null> {
    try {
      const db = getAdminFirestore();
      const docSnap = await db.collection(this.COLLECTION).doc(id).get();

      if (!docSnap.exists) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as ClienteCRM;
    } catch (error) {
      console.error('Error getting cliente (Admin):', error);
      throw new Error('Failed to get cliente');
    }
  }

  /**
   * Obtiene todos los clientes de una organización
   */
  static async getAllByOrganization(
    organizationId: string
  ): Promise<ClienteCRM[]> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db
        .collection(this.COLLECTION)
        .where('organization_id', '==', organizationId)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ClienteCRM[];
    } catch (error) {
      console.error('Error getting clientes (Admin):', error);
      throw new Error('Failed to get clientes');
    }
  }

  /**
   * Actualiza un cliente
   */
  static async update(
    id: string,
    data: UpdateClienteCRMData,
    userId: string
  ): Promise<void> {
    try {
      const db = getAdminFirestore();
      const now = new Date().toISOString();

      await db
        .collection(this.COLLECTION)
        .doc(id)
        .update({
          ...data,
          updated_at: now,
          updated_by: userId,
        });
    } catch (error) {
      console.error('Error updating cliente (Admin):', error);
      throw new Error('Failed to update cliente');
    }
  }

  /**
   * Elimina (soft delete) un cliente
   */
  static async delete(id: string, userId: string): Promise<void> {
    try {
      const db = getAdminFirestore();
      const now = new Date().toISOString();

      await db.collection(this.COLLECTION).doc(id).update({
        isActive: false,
        updated_at: now,
        updated_by: userId,
        deleted_at: now,
        deleted_by: userId,
      });
    } catch (error) {
      console.error('Error deleting cliente (Admin):', error);
      throw new Error('Failed to delete cliente');
    }
  }

  /**
   * Mueve un cliente a otro estado Kanban
   */
  static async moverEstado(
    clienteId: string,
    nuevoEstadoId: string,
    nuevoEstadoNombre: string,
    userId: string
  ): Promise<void> {
    try {
      const db = getAdminFirestore();
      const now = new Date().toISOString();

      // Obtener cliente actual para historial
      const cliente = await this.getById(clienteId);
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      const historialEstados = cliente.historial_estados || [];
      historialEstados.push({
        estado_anterior_id: cliente.estado_kanban_id,
        estado_anterior_nombre: cliente.estado_kanban_nombre,
        estado_nuevo_id: nuevoEstadoId,
        estado_nuevo_nombre: nuevoEstadoNombre,
        fecha_cambio: now,
        usuario_id: userId,
      });

      await db.collection(this.COLLECTION).doc(clienteId).update({
        estado_kanban_id: nuevoEstadoId,
        estado_kanban_nombre: nuevoEstadoNombre,
        historial_estados: historialEstados,
        updated_at: now,
        updated_by: userId,
      });
    } catch (error) {
      console.error('Error moving cliente estado (Admin):', error);
      throw new Error('Failed to move cliente estado');
    }
  }
}
