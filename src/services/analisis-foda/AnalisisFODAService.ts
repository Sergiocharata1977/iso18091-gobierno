import { db } from '@/firebase/config';
import { TraceabilityService } from '@/services/shared/TraceabilityService';
import type {
  AnalisisFODA,
  CreateAnalisisFODAData,
  UpdateAnalisisFODAData,
} from '@/types/analisis-foda';
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
 * AnalisisFODAService
 *
 * Servicio para gestionar análisis FODA vinculados a procesos, departamentos o la organización.
 */
export class AnalisisFODAService {
  private static readonly COLLECTION = 'analisis_foda';

  /**
   * Obtiene todos los análisis FODA con filtros opcionales
   */
  static async getAll(filters?: {
    organization_id?: string;
    tipo_analisis?: string;
    ambito_id?: string;
    estado?: string;
    search?: string;
  }): Promise<AnalisisFODA[]> {
    try {
      const analisisRef = collection(db, this.COLLECTION);
      let q = query(analisisRef, where('isActive', '==', true));

      // Aplicar filtros
      if (filters?.organization_id) {
        q = query(q, where('organization_id', '==', filters.organization_id));
      }
      if (filters?.tipo_analisis) {
        q = query(q, where('tipo_analisis', '==', filters.tipo_analisis));
      }
      if (filters?.estado) {
        q = query(q, where('estado', '==', filters.estado));
      }

      // Ordenar por fecha de análisis descendente
      q = query(q, orderBy('fecha_analisis', 'desc'));

      const snapshot = await getDocs(q);
      let analisis = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AnalisisFODA[];

      // Filtrar por búsqueda si se proporciona
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        analisis = analisis.filter(
          item =>
            item.titulo.toLowerCase().includes(searchTerm) ||
            item.descripcion?.toLowerCase().includes(searchTerm)
        );
      }

      return analisis;
    } catch (error) {
      console.error('Error getting analisis FODA:', error);
      throw new Error('Failed to get analisis FODA');
    }
  }

  /**
   * Obtiene un análisis FODA por ID
   */
  static async getById(id: string): Promise<AnalisisFODA | null> {
    try {
      const analisisRef = doc(db, this.COLLECTION, id);
      const analisisDoc = await getDoc(analisisRef);

      if (!analisisDoc.exists()) {
        return null;
      }

      return {
        id: analisisDoc.id,
        ...analisisDoc.data(),
      } as AnalisisFODA;
    } catch (error) {
      console.error('Error getting analisis FODA:', error);
      throw new Error('Failed to get analisis FODA');
    }
  }

  /**
   * Crea un nuevo análisis FODA
   */
  static async create(
    data: CreateAnalisisFODAData,
    userId: string
  ): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear();

      // Generar código de análisis
      const codigo = await TraceabilityService.generateNumber('FODA', year);

      const dataWithOrg = data as CreateAnalisisFODAData & {
        organization_id?: string;
      };
      const analisisData: Record<string, unknown> = {
        organization_id: dataWithOrg.organization_id || 'default-org',
        codigo,
        titulo: data.titulo,
        descripcion: data.descripcion || '',
        tipo_analisis: data.tipo_analisis,
        fecha_analisis: data.fecha_analisis,
        participantes: data.participantes || [],
        fortalezas: data.fortalezas || [],
        oportunidades: data.oportunidades || [],
        debilidades: data.debilidades || [],
        amenazas: data.amenazas || [],
        estado: data.estado || 'en_proceso',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        created_by: userId,
        isActive: true,
      };

      // Solo agregar campos opcionales si tienen valor
      if (data.ambito_id) analisisData.ambito_id = data.ambito_id;
      if (data.fecha_proxima_revision)
        analisisData.fecha_proxima_revision = data.fecha_proxima_revision;
      if (data.responsable_id)
        analisisData.responsable_id = data.responsable_id;

      const docRef = await addDoc(
        collection(db, this.COLLECTION),
        analisisData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating analisis FODA:', error);
      throw new Error('Failed to create analisis FODA');
    }
  }

  /**
   * Actualiza un análisis FODA existente
   */
  static async update(
    id: string,
    data: UpdateAnalisisFODAData,
    userId: string
  ): Promise<void> {
    try {
      const analisisRef = doc(db, this.COLLECTION, id);
      const updateData: Record<string, unknown> = {
        ...data,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(analisisRef, updateData);
    } catch (error) {
      console.error('Error updating analisis FODA:', error);
      throw new Error('Failed to update analisis FODA');
    }
  }

  /**
   * Elimina un análisis FODA (soft delete)
   */
  static async delete(id: string, userId: string): Promise<void> {
    try {
      const analisisRef = doc(db, this.COLLECTION, id);
      await updateDoc(analisisRef, {
        isActive: false,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting analisis FODA:', error);
      throw new Error('Failed to delete analisis FODA');
    }
  }

  /**
   * Completa un análisis FODA
   */
  static async completar(id: string, userId: string): Promise<void> {
    try {
      const analisisRef = doc(db, this.COLLECTION, id);
      await updateDoc(analisisRef, {
        estado: 'completado',
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error completing analisis FODA:', error);
      throw new Error('Failed to complete analisis FODA');
    }
  }
}
