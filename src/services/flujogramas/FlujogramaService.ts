import { db } from '@/firebase/config';
import { TraceabilityService } from '@/services/shared/TraceabilityService';
import type {
  CreateFlujogramaData,
  Flujograma,
  UpdateFlujogramaData,
} from '@/types/flujogramas';
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
 * FlujogramaService
 *
 * Servicio para gestionar flujogramas de procesos con elementos visuales.
 */
export class FlujogramaService {
  private static readonly COLLECTION = 'flujogramas';

  /**
   * Obtiene todos los flujogramas con filtros opcionales
   */
  static async getAll(filters?: {
    organization_id?: string;
    proceso_id?: string;
    estado?: string;
    search?: string;
  }): Promise<Flujograma[]> {
    try {
      const flujogramasRef = collection(db, this.COLLECTION);
      let q = query(flujogramasRef, where('isActive', '==', true));

      // Aplicar filtros
      if (filters?.organization_id) {
        q = query(q, where('organization_id', '==', filters.organization_id));
      }
      if (filters?.estado) {
        q = query(q, where('estado', '==', filters.estado));
      }

      // Ordenar por fecha de última actualización descendente
      q = query(q, orderBy('fecha_ultima_actualizacion', 'desc'));

      const snapshot = await getDocs(q);
      let flujogramas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Flujograma[];

      // Filtrar por búsqueda si se proporciona
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        flujogramas = flujogramas.filter(
          flujo =>
            flujo.nombre.toLowerCase().includes(searchTerm) ||
            flujo.descripcion?.toLowerCase().includes(searchTerm)
        );
      }

      return flujogramas;
    } catch (error) {
      console.error('Error getting flujogramas:', error);
      throw new Error('Failed to get flujogramas');
    }
  }

  /**
   * Obtiene un flujograma por ID
   */
  static async getById(id: string): Promise<Flujograma | null> {
    try {
      const flujogramaRef = doc(db, this.COLLECTION, id);
      const flujogramaDoc = await getDoc(flujogramaRef);

      if (!flujogramaDoc.exists()) {
        return null;
      }

      return {
        id: flujogramaDoc.id,
        ...flujogramaDoc.data(),
      } as Flujograma;
    } catch (error) {
      console.error('Error getting flujograma:', error);
      throw new Error('Failed to get flujograma');
    }
  }

  /**
   * Crea un nuevo flujograma
   */
  static async create(
    data: CreateFlujogramaData,
    userId: string
  ): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear();

      // Generar código de flujograma
      const codigo = await TraceabilityService.generateNumber('FL', year);

      const flujogramaData: Omit<Flujograma, 'id'> = {
        organization_id: '', // TODO: Obtener de contexto de usuario
        codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        proceso_id: data.proceso_id,
        version: data.version || 1,
        fecha_creacion: now.toISOString(),
        fecha_ultima_actualizacion: now.toISOString(),
        estado: (data.estado as Flujograma['estado']) || 'borrador',
        elementos: (data.elementos || []) as Flujograma['elementos'],
        conexiones: (data.conexiones || []) as Flujograma['conexiones'],
        configuracion_visual:
          data.configuracion_visual as Flujograma['configuracion_visual'],
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
        flujogramaData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating flujograma:', error);
      throw new Error('Failed to create flujograma');
    }
  }

  /**
   * Actualiza un flujograma existente
   */
  static async update(
    id: string,
    data: UpdateFlujogramaData,
    userId: string
  ): Promise<void> {
    try {
      const flujogramaRef = doc(db, this.COLLECTION, id);
      const updateData: Record<string, unknown> = {
        ...data,
        fecha_ultima_actualizacion: new Date().toISOString(),
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(flujogramaRef, updateData);
    } catch (error) {
      console.error('Error updating flujograma:', error);
      throw new Error('Failed to update flujograma');
    }
  }

  /**
   * Elimina un flujograma (soft delete)
   */
  static async delete(id: string, userId: string): Promise<void> {
    try {
      const flujogramaRef = doc(db, this.COLLECTION, id);
      await updateDoc(flujogramaRef, {
        isActive: false,
        updated_by: userId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting flujograma:', error);
      throw new Error('Failed to delete flujograma');
    }
  }

  /**
   * Valida la estructura de un flujograma
   */
  static async validar(id: string): Promise<{
    valido: boolean;
    errores: string[];
    warnings: string[];
  }> {
    try {
      const flujograma = await this.getById(id);
      if (!flujograma) {
        return {
          valido: false,
          errores: ['Flujograma no encontrado'],
          warnings: [],
        };
      }

      const errores: string[] = [];
      const warnings: string[] = [];

      // Validar que tenga elementos
      if (!flujograma.elementos || flujograma.elementos.length === 0) {
        errores.push('El flujograma debe tener al menos un elemento');
      }

      // Validar que tenga inicio y fin
      const tieneInicio = flujograma.elementos.some(e => e.tipo === 'inicio');
      const tieneFin = flujograma.elementos.some(e => e.tipo === 'fin');

      if (!tieneInicio) {
        errores.push('El flujograma debe tener un elemento de tipo "inicio"');
      }
      if (!tieneFin) {
        errores.push('El flujograma debe tener un elemento de tipo "fin"');
      }

      // Validar conexiones
      if (flujograma.conexiones) {
        for (const conexion of flujograma.conexiones) {
          const elementoOrigen = flujograma.elementos.find(
            e => e.elemento_id === conexion.desde_id
          );
          const elementoDestino = flujograma.elementos.find(
            e => e.elemento_id === conexion.hacia_id
          );

          if (!elementoOrigen) {
            errores.push(
              `Conexión inválida: elemento origen ${conexion.desde_id} no existe`
            );
          }
          if (!elementoDestino) {
            errores.push(
              `Conexión inválida: elemento destino ${conexion.hacia_id} no existe`
            );
          }
        }
      }

      // Validar decisiones con salidas
      const decisiones = flujograma.elementos.filter(
        e => e.tipo === 'decisión'
      );
      for (const decision of decisiones) {
        const conexionesSalida =
          flujograma.conexiones?.filter(
            c => c.desde_id === decision.elemento_id
          ) || [];
        if (conexionesSalida.length < 2) {
          warnings.push(
            `La decisión "${decision.etiqueta}" debería tener al menos 2 salidas`
          );
        }
      }

      return {
        valido: errores.length === 0,
        errores,
        warnings,
      };
    } catch (error) {
      console.error('Error validating flujograma:', error);
      return {
        valido: false,
        errores: ['Error al validar el flujograma'],
        warnings: [],
      };
    }
  }

  /**
   * Exporta flujograma en diferentes formatos
   */
  static async exportar(
    id: string,
    formato: 'png' | 'pdf' | 'svg' | 'json'
  ): Promise<string> {
    try {
      if (formato === 'json') {
        const flujograma = await this.getById(id);
        return JSON.stringify(flujograma);
      }

      // TODO: Implementar exportación visual
      return `https://example.com/flujogramas/${id}/export.${formato}`;
    } catch (error) {
      console.error('Error exporting flujograma:', error);
      throw new Error('Failed to export flujograma');
    }
  }
}
