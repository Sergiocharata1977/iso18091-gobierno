import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import {
  NormPoint,
  NormPointFilters,
  PaginationParams,
  PaginatedResponse,
  NormPointFormData,
  NormType,
  NormCategory,
} from '@/types/normPoints';

const COLLECTION_NAME = 'normPoints';

export class NormPointService {
  // ============================================
  // CRUD OPERATIONS
  // ============================================

  static async getAll(): Promise<NormPoint[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting norm points:', error);
      throw new Error('Error al obtener puntos de norma');
    }
  }

  static async getById(id: string): Promise<NormPoint | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          created_at: docSnap.data().created_at?.toDate() || new Date(),
          updated_at: docSnap.data().updated_at?.toDate() || new Date(),
        } as NormPoint;
      }
      return null;
    } catch (error) {
      console.error('Error getting norm point:', error);
      throw new Error('Error al obtener punto de norma');
    }
  }

  static async getPaginated(
    filters: NormPointFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<NormPoint>> {
    try {
      let q = query(collection(db, COLLECTION_NAME));

      // Apply filters
      if (filters.tipo_norma) {
        q = query(q, where('tipo_norma', '==', filters.tipo_norma));
      }

      if (filters.chapter !== undefined) {
        q = query(q, where('chapter', '==', filters.chapter));
      }

      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }

      if (filters.priority) {
        q = query(q, where('priority', '==', filters.priority));
      }

      if (filters.is_mandatory !== undefined) {
        q = query(q, where('is_mandatory', '==', filters.is_mandatory));
      }

      if (filters.process_id) {
        q = query(
          q,
          where('related_process_ids', 'array-contains', filters.process_id)
        );
      }

      // Apply sorting
      const sortField = pagination.sort || 'created_at';
      const sortOrder = pagination.order === 'asc' ? 'asc' : 'desc';
      q = query(q, orderBy(sortField, sortOrder));

      // Get all docs for pagination
      const querySnapshot = await getDocs(q);
      const total = querySnapshot.size;

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit;
      const docs = querySnapshot.docs.slice(offset, offset + pagination.limit);

      const data = docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];

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
      console.error('Error getting paginated norm points:', error);
      throw new Error('Error al obtener puntos de norma paginados');
    }
  }

  static async create(data: NormPointFormData): Promise<NormPoint> {
    try {
      const now = Timestamp.now();

      const docData = {
        ...data,
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

      return {
        id: docRef.id,
        ...data,
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating norm point:', error);
      throw new Error('Error al crear punto de norma');
    }
  }

  static async update(
    id: string,
    data: Partial<NormPointFormData>
  ): Promise<NormPoint> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      const updateData: Record<
        string,
        Timestamp | string | number | boolean | string[] | null
      > = {
        updated_at: Timestamp.now(),
      };

      // Copy fields
      Object.keys(data).forEach(key => {
        const value = (data as Record<string, unknown>)[key];
        if (value !== undefined) {
          updateData[key] = value as
            | string
            | number
            | boolean
            | string[]
            | null;
        }
      });

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Punto de norma no encontrado después de actualizar');
      }

      return updated;
    } catch (error) {
      console.error('Error updating norm point:', error);
      throw new Error('Error al actualizar punto de norma');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting norm point:', error);
      throw new Error('Error al eliminar punto de norma');
    }
  }

  // ============================================
  // SEARCH AND FILTER
  // ============================================

  static async search(searchTerm: string): Promise<NormPoint[]> {
    try {
      const allPoints = await this.getAll();
      const term = searchTerm.toLowerCase();

      return allPoints.filter(
        point =>
          point.title.toLowerCase().includes(term) ||
          point.description.toLowerCase().includes(term) ||
          point.code.toLowerCase().includes(term) ||
          point.requirement.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching norm points:', error);
      throw new Error('Error al buscar puntos de norma');
    }
  }

  static async getByChapter(chapter: number): Promise<NormPoint[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('chapter', '==', chapter)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting norm points by chapter:', error);
      throw new Error('Error al obtener puntos de norma por capítulo');
    }
  }

  static async getByCategory(category: NormCategory): Promise<NormPoint[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('category', '==', category)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting norm points by category:', error);
      throw new Error('Error al obtener puntos de norma por categoría');
    }
  }

  static async getByType(tipo: NormType): Promise<NormPoint[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('tipo_norma', '==', tipo)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting norm points by type:', error);
      throw new Error('Error al obtener puntos de norma por tipo');
    }
  }

  static async getMandatory(): Promise<NormPoint[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('is_mandatory', '==', true)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting mandatory norm points:', error);
      throw new Error('Error al obtener puntos de norma obligatorios');
    }
  }

  static async getByPriority(
    priority: 'alta' | 'media' | 'baja'
  ): Promise<NormPoint[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('priority', '==', priority)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting norm points by priority:', error);
      throw new Error('Error al obtener puntos de norma por prioridad');
    }
  }

  // ============================================
  // RELATIONS
  // ============================================

  static async getByProcess(processId: string): Promise<NormPoint[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('related_process_ids', 'array-contains', processId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting norm points by process:', error);
      throw new Error('Error al obtener puntos de norma por proceso');
    }
  }

  static async getByDocument(documentId: string): Promise<NormPoint[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('related_document_ids', 'array-contains', documentId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting norm points by document:', error);
      throw new Error('Error al obtener puntos de norma por documento');
    }
  }

  static async getByObjective(objectiveId: string): Promise<NormPoint[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('related_objective_ids', 'array-contains', objectiveId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPoint[];
    } catch (error) {
      console.error('Error getting norm points by objective:', error);
      throw new Error('Error al obtener puntos de norma por objetivo');
    }
  }
}
