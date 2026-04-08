import { db } from '@/firebase/config';
import {
  Department,
  DepartmentFilters,
  PaginatedResponse,
  PaginationParams,
} from '@/types/rrhh';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'departments';

export class DepartmentService {
  static async getAll(organizationId: string): Promise<Department[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organization_id', '==', organizationId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Department[];
    } catch (error) {
      console.error('Error getting departments:', error);
      throw new Error('Error al obtener departamentos');
    }
  }

  static async getById(id: string): Promise<Department | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          created_at: docSnap.data().created_at?.toDate() || new Date(),
          updated_at: docSnap.data().updated_at?.toDate() || new Date(),
        } as Department;
      }
      return null;
    } catch (error) {
      console.error('Error getting department:', error);
      throw new Error('Error al obtener departamento');
    }
  }

  static async getPaginated(
    organizationId: string,
    filters: DepartmentFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<Department>> {
    try {
      // Basic query with organization filter only to avoid index issues with orderBy
      let q = query(
        collection(db, COLLECTION_NAME),
        where('organization_id', '==', organizationId)
      );

      // Apply other where filters (equality or range on same field as where is okay)
      if (filters.is_active !== undefined) {
        q = query(q, where('is_active', '==', filters.is_active));
      }

      // Fetch all documents matching the organization and status (usually a small set)
      const querySnapshot = await getDocs(q);

      let allData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Department[];

      // Apply search filter in memory if provided
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        allData = allData.filter(
          dept =>
            dept.nombre?.toLowerCase().includes(searchLower) ||
            dept.descripcion?.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting in memory
      const sortField = (pagination.sort || 'created_at') as keyof Department;
      const sortOrder = pagination.order === 'asc' ? 1 : -1;

      allData.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (valA === undefined) return 1;
        if (valB === undefined) return -1;

        if (valA < valB) return -1 * sortOrder;
        if (valA > valB) return 1 * sortOrder;
        return 0;
      });

      // Apply pagination in memory
      const total = allData.length;
      const offset = (pagination.page - 1) * pagination.limit;
      const data = allData.slice(offset, offset + pagination.limit);

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
      console.error('Error getting paginated departments:', error);
      throw new Error('Error al obtener departamentos paginados');
    }
  }

  static async create(
    data: Omit<
      Department,
      'id' | 'created_at' | 'updated_at' | 'organization_id'
    >,
    organizationId: string
  ): Promise<Department> {
    try {
      const now = Timestamp.now();
      const docData = {
        ...data,
        organization_id: organizationId,
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

      return {
        id: docRef.id,
        ...data,
        organization_id: organizationId,
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating department:', error);
      throw new Error('Error al crear departamento');
    }
  }

  static async update(
    id: string,
    data: Partial<Omit<Department, 'id' | 'created_at'>>
  ): Promise<Department> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        ...data,
        updated_at: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Departamento no encontrado después de actualizar');
      }

      return updated;
    } catch (error) {
      console.error('Error updating department:', error);
      throw new Error('Error al actualizar departamento');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting department:', error);
      throw new Error('Error al eliminar departamento');
    }
  }

  static async toggleActive(id: string): Promise<Department> {
    try {
      const department = await this.getById(id);
      if (!department) {
        throw new Error('Departamento no encontrado');
      }

      return await this.update(id, { is_active: !department.is_active });
    } catch (error) {
      console.error('Error toggling department active status:', error);
      throw new Error('Error al cambiar estado del departamento');
    }
  }
}
