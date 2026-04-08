import { db } from '@/firebase/config';
import { TraceabilityService } from '@/services/shared/TraceabilityService';
import type {
  Organigrama,
  CreateOrganigramaData,
  UpdateOrganigramaData,
} from '@/types/organigramas';
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
 * OrganigramaService
 *
 * Servicio para gestionar organigramas organizacionales con estructura jerárquica.
 */
export class OrganigramaService {
  private static readonly COLLECTION = 'organigramas';

  /**
   * Obtiene todos los organigramas con filtros opcionales
   */
  static async getAll(filters?: {
    organization_id?: string;
    estado?: string;
    fecha_vigencia?: string;
    search?: string;
  }): Promise<Organigrama[]> {
    try {
      const organigramasRef = collection(db, this.COLLECTION);
      let q = query(organigramasRef, where('isActive', '==', true));

      // Aplicar filtros
      if (filters?.organization_id) {
        q = query(q, where('organization_id', '==', filters.organization_id));
      }
      if (filters?.estado) {
        q = query(q, where('estado', '==', filters.estado));
      }

      // Ordenar por fecha de vigencia descendente
      q = query(q, orderBy('fecha_vigencia_desde', 'desc'));

      const snapshot = await getDocs(q);
      let organigramas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Organigrama[];

      // Filtrar por búsqueda si se proporciona
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        organigramas = organigramas.filter(
          org =>
            org.nombre.toLowerCase().includes(searchTerm) ||
            org.descripcion?.toLowerCase().includes(searchTerm)
        );
      }

      return organigramas;
    } catch (error) {
      console.error('Error getting organigramas:', error);
      throw new Error('Failed to get organigramas');
    }
  }

  /**
   * Obtiene un organigrama por ID
   */
  static async getById(id: string): Promise<Organigrama | null> {
    try {
      const organigramaRef = doc(db, this.COLLECTION, id);
      const organigramaDoc = await getDoc(organigramaRef);

      if (!organigramaDoc.exists()) {
        return null;
      }

      return {
        id: organigramaDoc.id,
        ...organigramaDoc.data(),
      } as Organigrama;
    } catch (error) {
      console.error('Error getting organigrama:', error);
      throw new Error('Failed to get organigrama');
    }
  }

  /**
   * Crea un nuevo organigrama
   */
  static async create(
    data: CreateOrganigramaData,
    userId: string
  ): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear();

      // Generar código de organigrama
      const codigo = await TraceabilityService.generateNumber('ORG', year);

      const organigramaData: Omit<Organigrama, 'id'> = {
        organization_id: '', // TODO: Obtener de contexto de usuario
        codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        version: data.version || 1,
        fecha_vigencia_desde: data.fecha_vigencia_desde,
        fecha_vigencia_hasta: data.fecha_vigencia_hasta,
        estado: (data.estado as Organigrama['estado']) || 'borrador',
        estructura: (data.estructura || []) as Organigrama['estructura'],
        configuracion_visual:
          data.configuracion_visual as Organigrama['configuracion_visual'],
        aprobador_id: data.aprobador_id,
        fecha_aprobacion: data.fecha_aprobacion,
        documento_url: data.documento_url,
        adjuntos: data.adjuntos || [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        created_by: userId,
        isActive: true,
      };

      const docRef = await addDoc(
        collection(db, this.COLLECTION),
        organigramaData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating organigrama:', error);
      throw new Error('Failed to create organigrama');
    }
  }

  /**
   * Actualiza un organigrama existente
   */
  static async update(
    id: string,
    data: UpdateOrganigramaData,
    userId: string
  ): Promise<void> {
    try {
      const organigramaRef = doc(db, this.COLLECTION, id);
      const updateData: Record<string, unknown> = {
        ...data,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(organigramaRef, updateData);
    } catch (error) {
      console.error('Error updating organigrama:', error);
      throw new Error('Failed to update organigrama');
    }
  }

  /**
   * Elimina un organigrama (soft delete)
   */
  static async delete(id: string, userId: string): Promise<void> {
    try {
      const organigramaRef = doc(db, this.COLLECTION, id);
      await updateDoc(organigramaRef, {
        isActive: false,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting organigrama:', error);
      throw new Error('Failed to delete organigrama');
    }
  }

  /**
   * Genera organigrama desde estructura existente
   */
  static async generarDesdeEstructura(
    organizationId: string,
    opciones: {
      incluir_departamentos?: boolean;
      incluir_puestos?: boolean;
      incluir_personas?: boolean;
    },
    userId: string
  ): Promise<string> {
    try {
      // TODO: Implementar lógica para generar estructura desde departamentos/puestos/personas
      // Por ahora, crear un organigrama básico
      const estructuraBasica = [
        {
          nodo_id: 'root',
          tipo: 'departamento' as const,
          referencia_id: undefined,
          padre_id: undefined,
          nivel: 0,
          orden: 0,
        },
      ];

      const data: CreateOrganigramaData = {
        nombre: 'Organigrama Generado Automáticamente',
        descripcion: 'Generado desde la estructura organizacional existente',
        fecha_vigencia_desde: new Date().toISOString().split('T')[0],
        estructura: estructuraBasica,
        codigo: 'ORG-AUTO-' + Date.now(),
      };

      return await this.create(data, userId);
    } catch (error) {
      console.error('Error generating organigrama from structure:', error);
      throw new Error('Failed to generate organigrama from structure');
    }
  }

  /**
   * Exporta organigrama en diferentes formatos
   */
  static async exportar(
    id: string,
    formato: 'png' | 'pdf' | 'svg'
  ): Promise<string> {
    try {
      // TODO: Implementar lógica de exportación
      // Por ahora, devolver URL placeholder
      return `https://example.com/organigramas/${id}/export.${formato}`;
    } catch (error) {
      console.error('Error exporting organigrama:', error);
      throw new Error('Failed to export organigrama');
    }
  }
}
