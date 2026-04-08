import { db } from '@/firebase/config';
import type {
  RelacionProcesos,
  CreateRelacionProcesosData,
  UpdateRelacionProcesosData,
} from '@/types/relacion-procesos';
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
 * RelacionProcesosService
 *
 * Servicio para gestionar relaciones entre procesos (entradas/salidas, interacciones, dependencias).
 */
export class RelacionProcesosService {
  private static readonly COLLECTION = 'relaciones_procesos';

  /**
   * Obtiene todas las relaciones de procesos con filtros opcionales
   */
  static async getAll(filters?: {
    organization_id?: string;
    proceso_origen_id?: string;
    proceso_destino_id?: string;
    tipo_relacion?: string;
    estado?: string;
    search?: string;
  }): Promise<RelacionProcesos[]> {
    try {
      const relacionesRef = collection(db, this.COLLECTION);
      let q = query(relacionesRef, where('isActive', '==', true));

      // Aplicar filtros
      if (filters?.organization_id) {
        q = query(q, where('organization_id', '==', filters.organization_id));
      }
      if (filters?.tipo_relacion) {
        q = query(q, where('tipo_relacion', '==', filters.tipo_relacion));
      }
      if (filters?.estado) {
        q = query(q, where('estado', '==', filters.estado));
      }

      // Ordenar por fecha de establecimiento descendente
      q = query(q, orderBy('fecha_establecida', 'desc'));

      const snapshot = await getDocs(q);
      let relaciones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as RelacionProcesos[];

      // Filtrar por búsqueda si se proporciona
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        relaciones = relaciones.filter(
          rel =>
            rel.descripcion.toLowerCase().includes(searchTerm) ||
            rel.proceso_origen_nombre?.toLowerCase().includes(searchTerm) ||
            rel.proceso_destino_nombre?.toLowerCase().includes(searchTerm)
        );
      }

      return relaciones;
    } catch (error) {
      console.error('Error getting relaciones procesos:', error);
      throw new Error('Failed to get relaciones procesos');
    }
  }

  /**
   * Obtiene una relación por ID
   */
  static async getById(id: string): Promise<RelacionProcesos | null> {
    try {
      const relacionRef = doc(db, this.COLLECTION, id);
      const relacionDoc = await getDoc(relacionRef);

      if (!relacionDoc.exists()) {
        return null;
      }

      return {
        id: relacionDoc.id,
        ...relacionDoc.data(),
      } as RelacionProcesos;
    } catch (error) {
      console.error('Error getting relacion procesos:', error);
      throw new Error('Failed to get relacion procesos');
    }
  }

  /**
   * Crea una nueva relación entre procesos
   */
  static async create(
    data: CreateRelacionProcesosData,
    userId: string
  ): Promise<string> {
    try {
      const now = new Date();

      const relacionData: Omit<RelacionProcesos, 'id'> = {
        organization_id: '', // TODO: Obtener de contexto de usuario
        proceso_origen_id: data.proceso_origen_id,
        proceso_destino_id: data.proceso_destino_id,
        tipo_relacion: data.tipo_relacion as RelacionProcesos['tipo_relacion'],
        descripcion: data.descripcion,
        elemento_relacionado:
          data.elemento_relacionado as RelacionProcesos['elemento_relacionado'],
        frecuencia: data.frecuencia as RelacionProcesos['frecuencia'],
        importancia: data.importancia as RelacionProcesos['importancia'],
        canales_comunicacion: data.canales_comunicacion || [],
        responsable_gestion: data.responsable_gestion,
        indicadores_relacion: (data.indicadores_relacion ||
          []) as RelacionProcesos['indicadores_relacion'],
        riesgos_asociados: (data.riesgos_asociados ||
          []) as RelacionProcesos['riesgos_asociados'],
        documentos_asociados: data.documentos_asociados || [],
        estado: (data.estado as RelacionProcesos['estado']) || 'activa',
        fecha_establecida: data.fecha_establecida || now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        created_by: userId,
        isActive: true,
      };

      const docRef = await addDoc(
        collection(db, this.COLLECTION),
        relacionData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating relacion procesos:', error);
      throw new Error('Failed to create relacion procesos');
    }
  }

  /**
   * Actualiza una relación existente
   */
  static async update(
    id: string,
    data: UpdateRelacionProcesosData,
    userId: string
  ): Promise<void> {
    try {
      const relacionRef = doc(db, this.COLLECTION, id);
      const updateData: Record<string, unknown> = {
        ...data,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(relacionRef, updateData);
    } catch (error) {
      console.error('Error updating relacion procesos:', error);
      throw new Error('Failed to update relacion procesos');
    }
  }

  /**
   * Elimina una relación (soft delete)
   */
  static async delete(id: string, userId: string): Promise<void> {
    try {
      const relacionRef = doc(db, this.COLLECTION, id);
      await updateDoc(relacionRef, {
        isActive: false,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting relacion procesos:', error);
      throw new Error('Failed to delete relacion procesos');
    }
  }

  /**
   * Obtiene el grafo de relaciones para visualización
   */
  static async getGrafo(organizationId: string): Promise<{
    nodos: Array<{
      id: string;
      nombre: string;
      tipo: 'proceso';
    }>;
    conexiones: Array<{
      desde: string;
      hacia: string;
      tipo: string;
      importancia: string;
    }>;
  }> {
    try {
      const relaciones = await this.getAll({ organization_id: organizationId });
      const nodosMap = new Map<
        string,
        { id: string; nombre: string; tipo: 'proceso' }
      >();

      // Extraer nodos únicos
      for (const relacion of relaciones) {
        if (!nodosMap.has(relacion.proceso_origen_id)) {
          nodosMap.set(relacion.proceso_origen_id, {
            id: relacion.proceso_origen_id,
            nombre: relacion.proceso_origen_nombre || 'Proceso Origen',
            tipo: 'proceso',
          });
        }
        if (!nodosMap.has(relacion.proceso_destino_id)) {
          nodosMap.set(relacion.proceso_destino_id, {
            id: relacion.proceso_destino_id,
            nombre: relacion.proceso_destino_nombre || 'Proceso Destino',
            tipo: 'proceso',
          });
        }
      }

      const conexiones = relaciones.map(rel => ({
        desde: rel.proceso_origen_id,
        hacia: rel.proceso_destino_id,
        tipo: rel.tipo_relacion,
        importancia: rel.importancia,
      }));

      return {
        nodos: Array.from(nodosMap.values()),
        conexiones,
      };
    } catch (error) {
      console.error('Error getting relaciones grafo:', error);
      throw new Error('Failed to get relaciones grafo');
    }
  }

  /**
   * Obtiene la matriz de relaciones proceso x proceso
   */
  static async getMatriz(organizationId: string): Promise<{
    procesos: string[];
    matriz: Record<string, Record<string, RelacionProcesos['tipo_relacion'][]>>;
  }> {
    try {
      const relaciones = await this.getAll({ organization_id: organizationId });
      const procesosSet = new Set<string>();

      // Extraer procesos únicos
      for (const relacion of relaciones) {
        procesosSet.add(relacion.proceso_origen_id);
        procesosSet.add(relacion.proceso_destino_id);
      }

      const procesos = Array.from(procesosSet);
      const matriz: Record<
        string,
        Record<string, RelacionProcesos['tipo_relacion'][]>
      > = {};

      // Inicializar matriz
      for (const origen of procesos) {
        matriz[origen] = {};
        for (const destino of procesos) {
          matriz[origen][destino] = [];
        }
      }

      // Llenar matriz con relaciones
      for (const relacion of relaciones) {
        if (!matriz[relacion.proceso_origen_id][relacion.proceso_destino_id]) {
          matriz[relacion.proceso_origen_id][relacion.proceso_destino_id] = [];
        }
        matriz[relacion.proceso_origen_id][relacion.proceso_destino_id].push(
          relacion.tipo_relacion
        );
      }

      return { procesos, matriz };
    } catch (error) {
      console.error('Error getting relaciones matriz:', error);
      throw new Error('Failed to get relaciones matriz');
    }
  }
}
