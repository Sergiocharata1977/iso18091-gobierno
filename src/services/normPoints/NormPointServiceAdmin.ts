/**
 * NormPointServiceAdmin
 * Servicio para gestión de puntos de norma ISO (Versión Admin SDK)
 * Usado en API Routes para evitar problemas de permisos
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  NormPoint,
  NormPointFilters,
  PaginatedResponse,
  PaginationParams,
} from '@/types/normPoints';

const COLLECTION_NAME = 'normPoints';

export class NormPointServiceAdmin {
  /**
   * Obtiene todos los puntos de norma
   */
  static async getAll(): Promise<NormPoint[]> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db.collection(COLLECTION_NAME).get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting norm points (Admin):', error);
      throw new Error('Error al obtener puntos de norma');
    }
  }

  /**
   * Obtiene puntos de norma con paginación
   */
  static async getPaginated(
    filters: NormPointFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<NormPoint>> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db.collection(COLLECTION_NAME).get();

      let allDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];

      // Filtrar en memoria
      allDocs = allDocs.filter(doc => {
        if (filters.tipo_norma && doc.tipo_norma !== filters.tipo_norma)
          return false;
        if (filters.chapter && doc.chapter !== filters.chapter) return false;
        if (filters.category && doc.category !== filters.category) return false;
        if (filters.priority && doc.priority !== filters.priority) return false;
        if (
          filters.is_mandatory !== undefined &&
          doc.is_mandatory !== filters.is_mandatory
        )
          return false;
        return true;
      });

      // Ordenar
      const sortField = pagination.sort || 'created_at';
      const sortOrder = pagination.order === 'asc' ? 'asc' : 'desc';

      allDocs.sort((a, b) => {
        const aVal = (a as any)[sortField];
        const bVal = (b as any)[sortField];

        if (aVal instanceof Date && bVal instanceof Date) {
          return sortOrder === 'asc'
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return 0;
      });

      const total = allDocs.length;
      const offset = (pagination.page - 1) * pagination.limit;
      const data = allDocs.slice(offset, offset + pagination.limit);

      return {
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
          hasNext: offset + pagination.limit < total,
          hasPrev: pagination.page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting paginated norm points (Admin):', error);
      throw new Error('Error al obtener puntos de norma paginados');
    }
  }

  /**
   * Obtiene puntos de norma por organizaciÃ³n y cÃ³digos de clÃ¡usula
   */
  static async getByOrganizationAndCodes(
    organizationId: string,
    codes: string[],
    tipoNorma: NormPoint['tipo_norma'] = 'iso_9001'
  ): Promise<NormPoint[]> {
    try {
      if (!organizationId) return [];

      const normalizedCodes = [
        ...new Set(codes.map(code => code.trim())),
      ].filter(Boolean);
      if (normalizedCodes.length === 0) return [];

      const db = getAdminFirestore();
      const snapshot = await db.collection(COLLECTION_NAME).get();
      const wantedCodes = new Set(normalizedCodes);

      const allDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];

      return allDocs
        .map(doc => ({
          ...doc,
          code: (doc.code || '').trim(),
        }))
        .filter(
          point =>
            point.organization_id === organizationId &&
            point.tipo_norma === tipoNorma &&
            wantedCodes.has(point.code)
        );
    } catch (error) {
      console.error(
        'Error getting norm points by organization and codes (Admin):',
        error
      );
      throw new Error(
        'Error al obtener puntos de norma por organizaciÃ³n y cÃ³digo'
      );
    }
  }
}
