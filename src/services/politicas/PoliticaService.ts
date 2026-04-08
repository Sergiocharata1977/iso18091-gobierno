import { db } from '@/firebase/config';
import { TraceabilityService } from '@/services/shared/TraceabilityService';
import type {
  CreatePoliticaData,
  Politica,
  UpdatePoliticaData,
} from '@/types/politicas';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

/**
 * PoliticaService
 *
 * Servicio para gestionar políticas organizacionales alineadas a ISO 9001.
 * Incluye versionado, aprobación y vinculación con procesos y puntos de norma.
 */
export class PoliticaService {
  private static readonly COLLECTION = 'politicas';

  /**
   * Obtiene todas las políticas con filtros opcionales
   */
  static async getAll(filters?: {
    organization_id?: string;
    estado?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Politica[]> {
    try {
      const politicasRef = collection(db, this.COLLECTION);
      let q = query(politicasRef, where('isActive', '==', true));

      // Aplicar filtros
      if (filters?.organization_id) {
        q = query(q, where('organization_id', '==', filters.organization_id));
      }
      if (filters?.estado) {
        q = query(q, where('estado', '==', filters.estado));
      }

      // Ordenar por fecha de creación descendente
      q = query(q, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      let politicas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Politica[];

      // Filtrar por búsqueda si se proporciona
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        politicas = politicas.filter(
          politica =>
            politica.titulo.toLowerCase().includes(searchTerm) ||
            politica.descripcion.toLowerCase().includes(searchTerm) ||
            politica.codigo.toLowerCase().includes(searchTerm)
        );
      }

      // Aplicar paginación
      if (filters?.page && filters?.limit) {
        const startIndex = (filters.page - 1) * filters.limit;
        politicas = politicas.slice(startIndex, startIndex + filters.limit);
      }

      return politicas;
    } catch (error) {
      console.error('Error getting politicas:', error);
      throw new Error('Failed to get politicas');
    }
  }

  /**
   * Obtiene una política por ID
   */
  static async getById(id: string): Promise<Politica | null> {
    try {
      const politicaRef = doc(db, this.COLLECTION, id);
      const politicaDoc = await getDoc(politicaRef);

      if (!politicaDoc.exists()) {
        return null;
      }

      return {
        id: politicaDoc.id,
        ...politicaDoc.data(),
      } as Politica;
    } catch (error) {
      console.error('Error getting politica:', error);
      throw new Error('Failed to get politica');
    }
  }

  /**
   * Crea una nueva política
   */
  static async create(
    data: CreatePoliticaData,
    userId: string
  ): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear();

      // Generar código de política
      const codigo = await TraceabilityService.generateNumber('POL', year);

      const politicaData: Record<string, unknown> = {
        organization_id: data.organization_id || '',
        codigo: data.codigo || codigo,
        titulo: data.titulo,
        descripcion: data.descripcion,
        version: data.version || '1.0',
        estado: data.estado as Politica['estado'],
        procesos_relacionados: data.procesos_relacionados || [],
        departamentos_aplicables: data.departamentos_aplicables || [],
        puntos_norma: data.puntos_norma || [],
        adjuntos: data.adjuntos || [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        created_by: userId,
        updated_by: userId,
        isActive: true,
      };

      // Solo agregar campos opcionales si tienen valor
      if (data.contenido) politicaData.contenido = data.contenido;
      if (data.proposito) politicaData.proposito = data.proposito;
      if (data.alcance) politicaData.alcance = data.alcance;
      if (data.fecha_aprobacion)
        politicaData.fecha_aprobacion = data.fecha_aprobacion;
      if (data.fecha_revision)
        politicaData.fecha_revision = data.fecha_revision;
      if (data.fecha_proxima_revision)
        politicaData.fecha_proxima_revision = data.fecha_proxima_revision;
      if (data.aprobador_id) politicaData.aprobador_id = data.aprobador_id;
      if (data.documento_url) politicaData.documento_url = data.documento_url;

      const docRef = await addDoc(
        collection(db, this.COLLECTION),
        politicaData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating politica:', error);
      throw new Error('Failed to create politica');
    }
  }

  /**
   * Actualiza una política existente
   */
  static async update(
    id: string,
    data: UpdatePoliticaData,
    userId: string
  ): Promise<void> {
    try {
      const politicaRef = doc(db, this.COLLECTION, id);
      const updateData: Record<string, unknown> = {
        ...data,
        updated_by: userId,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      await updateDoc(politicaRef, updateData);
    } catch (error) {
      console.error('Error updating politica:', error);
      throw new Error('Failed to update politica');
    }
  }

  /**
   * Elimina una política (soft delete)
   */
  static async delete(id: string, userId: string): Promise<void> {
    try {
      const politicaRef = doc(db, this.COLLECTION, id);
      await updateDoc(politicaRef, {
        isActive: false,
        updated_by: userId,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error deleting politica:', error);
      throw new Error('Failed to delete politica');
    }
  }

  /**
   * Aprueba una política
   */
  static async aprobar(id: string, userId: string): Promise<void> {
    try {
      const now = new Date();
      const politicaRef = doc(db, this.COLLECTION, id);
      await updateDoc(politicaRef, {
        estado: 'vigente',
        fecha_aprobacion: now.toISOString(),
        aprobador_id: userId,
        updated_by: userId,
        updatedAt: Timestamp.fromDate(now),
      });
    } catch (error) {
      console.error('Error approving politica:', error);
      throw new Error('Failed to approve politica');
    }
  }

  /**
   * Crea una nueva versión de la política
   */
  static async versionar(id: string, userId: string): Promise<string> {
    try {
      const politicaActual = await this.getById(id);
      if (!politicaActual) {
        throw new Error('Política no encontrada');
      }

      const currentVersion = parseFloat(politicaActual.version);
      const nuevaVersion = (currentVersion + 0.1).toFixed(1);
      const now = new Date();

      const nuevaPoliticaData: Omit<Politica, 'id'> = {
        ...politicaActual,
        version: nuevaVersion,
        estado: 'borrador',
        fecha_aprobacion: undefined,
        fecha_revision: now.toISOString(),
        fecha_proxima_revision: undefined,
        aprobador_id: undefined,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        created_by: userId,
        updated_by: userId,
        isActive: true,
      };

      const docRef = await addDoc(
        collection(db, this.COLLECTION),
        nuevaPoliticaData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error versioning politica:', error);
      throw new Error('Failed to version politica');
    }
  }
}
