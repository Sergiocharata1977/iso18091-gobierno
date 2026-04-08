import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  PaginatedResponse,
  PaginationParams,
  Personnel,
  PersonnelFilters,
} from '@/types/rrhh';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'personnel';

// Get Firestore instance from Admin SDK
const getDb = () => getAdminFirestore();

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: any): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

// Helper to convert Date to Firestore Timestamp
const toTimestamp = (date: Date | string | undefined): Timestamp | null => {
  if (!date) return null;
  if (date instanceof Date) return Timestamp.fromDate(date);
  return Timestamp.fromDate(new Date(date));
};

export class PersonnelService {
  static async getAll(organizationId: string): Promise<Personnel[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_nacimiento: toDate(doc.data().fecha_nacimiento),
        fecha_contratacion: toDate(doc.data().fecha_contratacion),
        fecha_inicio_ventas: toDate(doc.data().fecha_inicio_ventas),
        created_at: toDate(doc.data().created_at) || new Date(),
        updated_at: toDate(doc.data().updated_at) || new Date(),
      })) as Personnel[];
    } catch (error) {
      console.error('Error getting personnel:', error);
      throw new Error('Error al obtener personal');
    }
  }

  static async getById(id: string): Promise<Personnel | null> {
    try {
      const db = getDb();
      const docSnap = await db.collection(COLLECTION_NAME).doc(id).get();

      if (docSnap.exists) {
        const data = docSnap.data()!;
        return {
          id: docSnap.id,
          ...data,
          fecha_nacimiento: toDate(data.fecha_nacimiento),
          fecha_contratacion: toDate(data.fecha_contratacion),
          fecha_inicio_ventas: toDate(data.fecha_inicio_ventas),
          created_at: toDate(data.created_at) || new Date(),
          updated_at: toDate(data.updated_at) || new Date(),
        } as Personnel;
      }
      return null;
    } catch (error) {
      console.error('Error getting personnel:', error);
      throw new Error('Error al obtener personal');
    }
  }

  static async getPaginated(
    organizationId: string,
    filters: PersonnelFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<Personnel>> {
    try {
      const db = getDb();

      // Get all and filter in memory (simpler, no composite index needed)
      // Filter by organization_id at DB level
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .get();

      let personnel = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_nacimiento: toDate(doc.data().fecha_nacimiento),
        fecha_contratacion: toDate(doc.data().fecha_contratacion),
        fecha_inicio_ventas: toDate(doc.data().fecha_inicio_ventas),
        created_at: toDate(doc.data().created_at) || new Date(),
        updated_at: toDate(doc.data().updated_at) || new Date(),
      })) as Personnel[];

      // Apply filters in memory
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        personnel = personnel.filter(
          p =>
            p.nombres?.toLowerCase().includes(searchLower) ||
            p.apellidos?.toLowerCase().includes(searchLower) ||
            p.email?.toLowerCase().includes(searchLower)
        );
      }
      if (filters.estado) {
        personnel = personnel.filter(p => p.estado === filters.estado);
      }
      if (filters.tipo_personal) {
        personnel = personnel.filter(
          p => p.tipo_personal === filters.tipo_personal
        );
      }
      if (filters.supervisor_id) {
        personnel = personnel.filter(
          p => p.supervisor_id === filters.supervisor_id
        );
      }

      // Sort
      const sortField = pagination.sort || 'created_at';
      const sortOrder = pagination.order === 'asc' ? 1 : -1;
      personnel.sort((a, b) => {
        const aVal = (a as any)[sortField] || '';
        const bVal = (b as any)[sortField] || '';
        if (aVal < bVal) return -sortOrder;
        if (aVal > bVal) return sortOrder;
        return 0;
      });

      // Paginate
      const total = personnel.length;
      const offset = (pagination.page - 1) * pagination.limit;
      const data = personnel.slice(offset, offset + pagination.limit);

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
      console.error('Error getting paginated personnel:', error);
      throw new Error('Error al obtener personal paginado');
    }
  }

  static async create(
    data: Omit<
      Personnel,
      'id' | 'created_at' | 'updated_at' | 'organization_id'
    >,
    organizationId: string
  ): Promise<Personnel> {
    try {
      const db = getDb();
      const now = Timestamp.now();
      const docData = {
        ...data,
        organization_id: organizationId,
        fecha_nacimiento: toTimestamp(data.fecha_nacimiento),
        fecha_contratacion: toTimestamp(data.fecha_contratacion),
        fecha_inicio_ventas: toTimestamp(data.fecha_inicio_ventas),
        created_at: now,
        updated_at: now,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(docData);

      return {
        id: docRef.id,
        ...data,
        organization_id: organizationId,
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating personnel:', error);
      throw new Error('Error al crear personal');
    }
  }

  static async update(
    id: string,
    data: Partial<Omit<Personnel, 'id' | 'created_at'>>
  ): Promise<Personnel> {
    try {
      const db = getDb();
      const updateData: Record<string, any> = {
        ...data,
        updated_at: Timestamp.now(),
      };

      // Convert dates
      if (data.fecha_nacimiento !== undefined) {
        updateData.fecha_nacimiento = toTimestamp(data.fecha_nacimiento);
      }
      if (data.fecha_contratacion !== undefined) {
        updateData.fecha_contratacion = toTimestamp(data.fecha_contratacion);
      }
      if (data.fecha_inicio_ventas !== undefined) {
        updateData.fecha_inicio_ventas = toTimestamp(data.fecha_inicio_ventas);
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await db.collection(COLLECTION_NAME).doc(id).update(updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Personal no encontrado después de actualizar');
      }

      return updated;
    } catch (error) {
      console.error('Error updating personnel:', error);
      throw new Error('Error al actualizar personal');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const db = getDb();
      await db.collection(COLLECTION_NAME).doc(id).delete();
    } catch (error) {
      console.error('Error deleting personnel:', error);
      throw new Error('Error al eliminar personal');
    }
  }

  static async toggleStatus(id: string): Promise<Personnel> {
    try {
      const personnel = await this.getById(id);
      if (!personnel) {
        throw new Error('Personal no encontrado');
      }

      const newStatus = personnel.estado === 'Activo' ? 'Inactivo' : 'Activo';
      return await this.update(id, { estado: newStatus });
    } catch (error) {
      console.error('Error toggling personnel status:', error);
      throw new Error('Error al cambiar estado del personal');
    }
  }

  static async getBySupervisor(supervisorId: string): Promise<Personnel[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('supervisor_id', '==', supervisorId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_nacimiento: toDate(doc.data().fecha_nacimiento),
        fecha_contratacion: toDate(doc.data().fecha_contratacion),
        fecha_inicio_ventas: toDate(doc.data().fecha_inicio_ventas),
        created_at: toDate(doc.data().created_at) || new Date(),
        updated_at: toDate(doc.data().updated_at) || new Date(),
      })) as Personnel[];
    } catch (error) {
      console.error('Error getting personnel by supervisor:', error);
      throw new Error('Error al obtener personal por supervisor');
    }
  }

  static async getActive(organizationId: string): Promise<Personnel[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .where('estado', '==', 'Activo')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_nacimiento: toDate(doc.data().fecha_nacimiento),
        fecha_contratacion: toDate(doc.data().fecha_contratacion),
        fecha_inicio_ventas: toDate(doc.data().fecha_inicio_ventas),
        created_at: toDate(doc.data().created_at) || new Date(),
        updated_at: toDate(doc.data().updated_at) || new Date(),
      })) as Personnel[];
    } catch (error) {
      console.error('Error getting active personnel:', error);
      throw new Error('Error al obtener personal activo');
    }
  }

  // Context assignments
  static async assignProcesses(
    personnelId: string,
    processIds: string[]
  ): Promise<void> {
    try {
      const db = getDb();
      await db.collection(COLLECTION_NAME).doc(personnelId).update({
        procesos_asignados: processIds,
        updated_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error assigning processes:', error);
      throw new Error('Error al asignar procesos');
    }
  }

  static async assignObjectives(
    personnelId: string,
    objectiveIds: string[]
  ): Promise<void> {
    try {
      const db = getDb();
      await db.collection(COLLECTION_NAME).doc(personnelId).update({
        objetivos_asignados: objectiveIds,
        updated_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error assigning objectives:', error);
      throw new Error('Error al asignar objetivos');
    }
  }

  static async assignIndicators(
    personnelId: string,
    indicatorIds: string[]
  ): Promise<void> {
    try {
      const db = getDb();
      await db.collection(COLLECTION_NAME).doc(personnelId).update({
        indicadores_asignados: indicatorIds,
        updated_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error assigning indicators:', error);
      throw new Error('Error al asignar indicadores');
    }
  }

  static async getWithAssignments(
    personnelId: string
  ): Promise<Personnel | null> {
    return await this.getById(personnelId);
  }

  static async removeAssignmentFromAll(
    type: 'proceso' | 'objetivo' | 'indicador',
    id: string
  ): Promise<void> {
    try {
      const db = getDb();
      const fieldMap = {
        proceso: 'procesos_asignados',
        objetivo: 'objetivos_asignados',
        indicador: 'indicadores_asignados',
      };

      const field = fieldMap[type];
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where(field, 'array-contains', id)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const currentArray = data[field] || [];
        const newArray = currentArray.filter((item: string) => item !== id);
        batch.update(doc.ref, {
          [field]: newArray,
          updated_at: Timestamp.now(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error removing assignment from all personnel:', error);
      throw new Error('Error al remover asignación de todo el personal');
    }
  }

  static async assignPosition(
    personnelId: string,
    positionId: string,
    copyAssignments: boolean = true
  ): Promise<void> {
    try {
      const db = getDb();
      const docRef = db.collection(COLLECTION_NAME).doc(personnelId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new Error('El personal no existe');
      }

      const positionRef = db.collection('positions').doc(positionId);
      const positionSnap = await positionRef.get();

      if (!positionSnap.exists) {
        throw new Error('El puesto no existe');
      }

      const updateData: Record<string, any> = {
        puesto: positionId,
        updated_at: Timestamp.now(),
      };

      if (copyAssignments) {
        const positionData = positionSnap.data()!;
        updateData.procesos_asignados = positionData.procesos_asignados || [];
        updateData.objetivos_asignados = positionData.objetivos_asignados || [];
        updateData.indicadores_asignados =
          positionData.indicadores_asignados || [];
      }

      await docRef.update(updateData);
    } catch (error) {
      console.error('Error assigning position:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al asignar puesto');
    }
  }

  static async changePosition(
    personnelId: string,
    newPositionId: string,
    replaceAssignments: boolean
  ): Promise<void> {
    try {
      const db = getDb();
      const docRef = db.collection(COLLECTION_NAME).doc(personnelId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new Error('El personal no existe');
      }

      const positionRef = db.collection('positions').doc(newPositionId);
      const positionSnap = await positionRef.get();

      if (!positionSnap.exists) {
        throw new Error('El puesto no existe');
      }

      const updateData: Record<string, any> = {
        puesto: newPositionId,
        updated_at: Timestamp.now(),
      };

      if (replaceAssignments) {
        const positionData = positionSnap.data()!;
        updateData.procesos_asignados = positionData.procesos_asignados || [];
        updateData.objetivos_asignados = positionData.objetivos_asignados || [];
        updateData.indicadores_asignados =
          positionData.indicadores_asignados || [];
      }

      await docRef.update(updateData);
    } catch (error) {
      console.error('Error changing position:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al cambiar puesto');
    }
  }

  static async updateAssignments(
    personnelId: string,
    assignments: {
      procesos_asignados?: string[];
      objetivos_asignados?: string[];
      indicadores_asignados?: string[];
    }
  ): Promise<void> {
    try {
      const db = getDb();
      const docRef = db.collection(COLLECTION_NAME).doc(personnelId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        throw new Error('El personal no existe');
      }

      const updateData: Record<string, any> = {
        updated_at: Timestamp.now(),
      };

      if (assignments.procesos_asignados !== undefined) {
        updateData.procesos_asignados = assignments.procesos_asignados;
      }
      if (assignments.objetivos_asignados !== undefined) {
        updateData.objetivos_asignados = assignments.objetivos_asignados;
      }
      if (assignments.indicadores_asignados !== undefined) {
        updateData.indicadores_asignados = assignments.indicadores_asignados;
      }

      await docRef.update(updateData);
    } catch (error) {
      console.error('Error updating personnel assignments:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al actualizar asignaciones');
    }
  }
}
