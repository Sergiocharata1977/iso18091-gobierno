// ProcessRecordService using Firebase Admin SDK
import { adminDb } from '@/firebase/admin';
import { ProcessRecord, ProcessRecordFormData } from '@/types/processRecords';
import { DocumentData, Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'processRecords';

export class ProcessRecordServiceAdmin {
  /**
   * Create a new process record
   */
  static async create(
    data: ProcessRecordFormData & {
      process_definition_nombre?: string;
      organization_id?: string;
    },
    userId: string
  ): Promise<string> {
    try {
      const now = Timestamp.now();

      const docData = {
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        process_definition_id: data.process_definition_id,
        process_definition_nombre: data.process_definition_nombre || '',
        status: data.status || 'activo',
        fecha_inicio: data.fecha_inicio
          ? Timestamp.fromDate(new Date(data.fecha_inicio as unknown as string))
          : now,
        responsable_id: data.responsable_id || userId,
        responsable_nombre: data.responsable_nombre || '',
        created_by: userId,
        organization_id: data.organization_id || null,
        created_at: now,
        updated_at: now,
      };

      const docRef = await adminDb.collection(COLLECTION_NAME).add(docData);

      console.log('[ProcessRecordServiceAdmin] Created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating process record (Admin):', error);
      throw new Error('Failed to create process record');
    }
  }

  /**
   * Get all process records
   */
  static async getAll(organizationId?: string): Promise<ProcessRecord[]> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .orderBy('created_at', 'desc')
        .get();

      const records = snapshot.docs.map((doc: DocumentData) => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          process_definition_id: data.process_definition_id || '',
          process_definition_nombre: data.process_definition_nombre || '',
          organization_id: data.organization_id || null,
          status: data.status || 'activo',
          fecha_inicio: data.fecha_inicio?.toDate?.() || new Date(),
          fecha_fin: data.fecha_fin?.toDate?.() || undefined,
          responsable_id: data.responsable_id || '',
          responsable_nombre: data.responsable_nombre || '',
          created_by: data.created_by || '',
          created_at: data.created_at?.toDate?.() || new Date(),
          updated_at: data.updated_at?.toDate?.() || new Date(),
        } as ProcessRecord;
      });

      // Filtrar por organización si se proporciona
      if (organizationId) {
        return records.filter(
          (r: ProcessRecord & { organization_id?: string }) =>
            r.organization_id === organizationId
        );
      }

      return records;
    } catch (error) {
      console.error('Error getting process records (Admin):', error);
      throw new Error('Failed to get process records');
    }
  }

  /**
   * Get process record by ID
   */
  static async getById(id: string): Promise<ProcessRecord | null> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      const data = docSnap.data()!;
      return {
        id: docSnap.id,
        nombre: data.nombre || '',
        descripcion: data.descripcion || '',
        process_definition_id: data.process_definition_id || '',
        process_definition_nombre: data.process_definition_nombre || '',
        organization_id: data.organization_id || null,
        status: data.status || 'activo',
        fecha_inicio: data.fecha_inicio?.toDate?.() || new Date(),
        fecha_fin: data.fecha_fin?.toDate?.() || undefined,
        responsable_id: data.responsable_id || '',
        responsable_nombre: data.responsable_nombre || '',
        created_by: data.created_by || '',
        created_at: data.created_at?.toDate?.() || new Date(),
        updated_at: data.updated_at?.toDate?.() || new Date(),
      } as ProcessRecord;
    } catch (error) {
      console.error('Error getting process record by ID (Admin):', error);
      throw new Error('Failed to get process record');
    }
  }

  /**
   * Get process records by definition ID
   */
  static async getByDefinitionId(
    definitionId: string
  ): Promise<ProcessRecord[]> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('process_definition_id', '==', definitionId)
        .orderBy('created_at', 'desc')
        .get();

      return snapshot.docs.map((doc: DocumentData) => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          process_definition_id: data.process_definition_id || '',
          process_definition_nombre: data.process_definition_nombre || '',
          organization_id: data.organization_id || null,
          status: data.status || 'activo',
          fecha_inicio: data.fecha_inicio?.toDate?.() || new Date(),
          fecha_fin: data.fecha_fin?.toDate?.() || undefined,
          responsable_id: data.responsable_id || '',
          responsable_nombre: data.responsable_nombre || '',
          created_by: data.created_by || '',
          created_at: data.created_at?.toDate?.() || new Date(),
          updated_at: data.updated_at?.toDate?.() || new Date(),
        } as ProcessRecord;
      });
    } catch (error) {
      console.error('Error getting records by definition (Admin):', error);
      throw new Error('Failed to get process records');
    }
  }

  /**
   * Update process record
   */
  static async update(
    id: string,
    data: Partial<ProcessRecordFormData>
  ): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);

      await docRef.update({
        ...data,
        updated_at: Timestamp.now(),
      });

      console.log('[ProcessRecordServiceAdmin] Updated:', id);
    } catch (error) {
      console.error('Error updating process record (Admin):', error);
      throw new Error('Failed to update process record');
    }
  }

  /**
   * Update status
   */
  static async updateStatus(
    id: string,
    status: ProcessRecord['status']
  ): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      const now = Timestamp.now();

      const updateData: Record<string, unknown> = {
        status,
        updated_at: now,
      };

      if (status === 'completado') {
        updateData.fecha_fin = now;
      }

      await docRef.update(updateData);

      console.log('[ProcessRecordServiceAdmin] Status updated:', id, status);
    } catch (error) {
      console.error('Error updating status (Admin):', error);
      throw new Error('Failed to update status');
    }
  }

  /**
   * Delete process record
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      await docRef.delete();

      console.log('[ProcessRecordServiceAdmin] Deleted:', id);
    } catch (error) {
      console.error('Error deleting process record (Admin):', error);
      throw new Error('Failed to delete process record');
    }
  }
}
