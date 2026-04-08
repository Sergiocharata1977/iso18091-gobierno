/**
 * KanbanServiceAdmin
 * Servicio para gestión del sistema Kanban de pipeline de clientes (Versión Admin SDK)
 * Usado en API Routes para evitar problemas de permisos
 */

import { ESTADOS_KANBAN_DEFAULT } from '@/data/crm/scoring-config';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type { CreateEstadoKanbanData, EstadoClienteKanban } from '@/types/crm';

export class KanbanServiceAdmin {
  private static readonly COLLECTION = 'crm_kanban_estados';

  /**
   * Obtiene todos los estados del Kanban ordenados para una organización
   */
  static async getEstados(
    organizationId: string
  ): Promise<EstadoClienteKanban[]> {
    try {
      const db = getAdminFirestore();
      // Query sin orderBy para evitar índice compuesto
      const snapshot = await db
        .collection(this.COLLECTION)
        .where('organization_id', '==', organizationId)
        .get();

      if (snapshot.empty) {
        // Si no hay estados, crear los predeterminados para esta organización
        return await this.inicializarEstadosDefault(organizationId);
      }

      // Filtrar por tipo='crm' y ordenar en memoria
      const allEstados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as EstadoClienteKanban[];

      return allEstados
        .filter(estado => estado.tipo === 'crm')
        .sort((a, b) => a.orden - b.orden); // Ordenar en memoria
    } catch (error) {
      console.error('Error getting estados (Admin):', error);
      throw new Error('Failed to get estados');
    }
  }

  /**
   * Inicializa los estados predeterminados del Kanban para una organización
   */
  static async inicializarEstadosDefault(
    organizationId: string
  ): Promise<EstadoClienteKanban[]> {
    try {
      const db = getAdminFirestore();
      const estados: EstadoClienteKanban[] = [];
      const now = new Date().toISOString();

      const batch = db.batch();
      const collectionRef = db.collection(this.COLLECTION);

      for (const estadoDefault of ESTADOS_KANBAN_DEFAULT) {
        const estadoData = {
          ...estadoDefault,
          organization_id: organizationId,
          tipo: 'crm',
          created_at: now,
          updated_at: now,
        };

        const docRef = collectionRef.doc();
        batch.set(docRef, estadoData);

        estados.push({
          id: docRef.id,
          ...estadoData,
        });
      }

      await batch.commit();
      console.log(
        `[KanbanService] Created ${estados.length} default estados for org: ${organizationId}`
      );
      return estados;
    } catch (error) {
      console.error('Error inicializando estados default (Admin):', error);
      throw new Error('Failed to inicializar estados default');
    }
  }

  /**
   * Crea un nuevo estado personalizado
   */
  static async crearEstado(
    data: CreateEstadoKanbanData
  ): Promise<EstadoClienteKanban> {
    try {
      const db = getAdminFirestore();
      const now = new Date().toISOString();

      const estadoData = {
        ...data,
        organization_id: data.organization_id ?? '',
        tipo: data.tipo ?? 'crm',
        es_estado_final: data.es_estado_final ?? false,
        permite_edicion: true, // Estados personalizados siempre son editables
        created_at: now,
        updated_at: now,
      };

      const docRef = await db.collection(this.COLLECTION).add(estadoData);

      return {
        id: docRef.id,
        ...estadoData,
      } as EstadoClienteKanban;
    } catch (error) {
      console.error('Error creating estado (Admin):', error);
      throw new Error('Failed to create estado');
    }
  }
}
