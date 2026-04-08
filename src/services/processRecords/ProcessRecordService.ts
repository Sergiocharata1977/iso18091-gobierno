import { db } from '@/firebase/config';
import { ProcessRecord, ProcessRecordFormData } from '@/types/processRecords';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'processRecords';

export class ProcessRecordService {
  /**
   * Create a new process record
   */
  static async create(
    data: ProcessRecordFormData,
    userId: string
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        fecha_inicio: Timestamp.fromDate(data.fecha_inicio),
        created_by: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating process record:', error);
      throw new Error('Failed to create process record');
    }
  }

  /**
   * Get process record by ID
   */
  static async getById(id: string): Promise<ProcessRecord | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        fecha_inicio: data.fecha_inicio?.toDate() || new Date(),
        fecha_fin: data.fecha_fin?.toDate(),
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as ProcessRecord;
    } catch (error) {
      console.error('Error getting process record:', error);
      throw new Error('Failed to get process record');
    }
  }

  /**
   * Get all process records
   */
  static async getAll(): Promise<ProcessRecord[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fecha_inicio: data.fecha_inicio?.toDate() || new Date(),
          fecha_fin: data.fecha_fin?.toDate(),
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as ProcessRecord;
      });
    } catch (error) {
      console.error('Error getting process records:', error);
      throw new Error('Failed to get process records');
    }
  }

  /**
   * Get process records by definition ID
   */
  static async getByDefinitionId(
    definitionId: string
  ): Promise<ProcessRecord[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('process_definition_id', '==', definitionId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fecha_inicio: data.fecha_inicio?.toDate() || new Date(),
          fecha_fin: data.fecha_fin?.toDate(),
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as ProcessRecord;
      });
    } catch (error) {
      console.error('Error getting process records by definition:', error);
      throw new Error('Failed to get process records');
    }
  }

  /**
   * Get process records by status
   */
  static async getByStatus(
    status: ProcessRecord['status']
  ): Promise<ProcessRecord[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', status),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fecha_inicio: data.fecha_inicio?.toDate() || new Date(),
          fecha_fin: data.fecha_fin?.toDate(),
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as ProcessRecord;
      });
    } catch (error) {
      console.error('Error getting process records by status:', error);
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
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: any = {
        ...data,
        updated_at: serverTimestamp(),
      };

      if (data.fecha_inicio) {
        updateData.fecha_inicio = Timestamp.fromDate(data.fecha_inicio);
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating process record:', error);
      throw new Error('Failed to update process record');
    }
  }

  /**
   * Update process record status
   */
  static async updateStatus(
    id: string,
    status: ProcessRecord['status']
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: any = {
        status,
        updated_at: serverTimestamp(),
      };

      if (status === 'completado') {
        updateData.fecha_fin = serverTimestamp();
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating process record status:', error);
      throw new Error('Failed to update status');
    }
  }

  /**
   * Delete process record
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting process record:', error);
      throw new Error('Failed to delete process record');
    }
  }
}
