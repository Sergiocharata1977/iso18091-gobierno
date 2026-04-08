import { db } from '@/firebase/config';
import {
  ProcessRecordStage,
  ProcessRecordStageFormData,
} from '@/types/processRecords';
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
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const COLLECTION_NAME = 'processRecordStages';

export class ProcessRecordStageService {
  /**
   * Create a new stage
   */
  static async create(
    processRecordId: string,
    data: ProcessRecordStageFormData
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        process_record_id: processRecordId,
        ...data,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating stage:', error);
      throw new Error('Failed to create stage');
    }
  }

  /**
   * Create multiple stages from default stages
   */
  static async createFromDefaults(
    processRecordId: string,
    defaultStages: string[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const colors = ['#6b7280', '#3b82f6', '#f59e0b', '#10b981'];

      defaultStages.forEach((stageName, index) => {
        const docRef = doc(collection(db, COLLECTION_NAME));
        batch.set(docRef, {
          process_record_id: processRecordId,
          nombre: stageName,
          color: colors[index % colors.length],
          orden: index,
          es_etapa_final: index === defaultStages.length - 1,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error creating default stages:', error);
      throw new Error('Failed to create default stages');
    }
  }

  /**
   * Get stage by ID
   */
  static async getById(id: string): Promise<ProcessRecordStage | null> {
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
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as ProcessRecordStage;
    } catch (error) {
      console.error('Error getting stage:', error);
      throw new Error('Failed to get stage');
    }
  }

  /**
   * Get all stages for a process record
   */
  static async getByProcessRecordId(
    processRecordId: string
  ): Promise<ProcessRecordStage[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('process_record_id', '==', processRecordId),
        orderBy('orden', 'asc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as ProcessRecordStage;
      });
    } catch (error) {
      console.error('Error getting stages:', error);
      throw new Error('Failed to get stages');
    }
  }

  /**
   * Update stage
   */
  static async update(
    id: string,
    data: Partial<ProcessRecordStageFormData>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating stage:', error);
      throw new Error('Failed to update stage');
    }
  }

  /**
   * Reorder stages
   */
  static async reorder(stages: { id: string; orden: number }[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      stages.forEach(({ id, orden }) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.update(docRef, {
          orden,
          updated_at: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error reordering stages:', error);
      throw new Error('Failed to reorder stages');
    }
  }

  /**
   * Delete stage
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting stage:', error);
      throw new Error('Failed to delete stage');
    }
  }

  /**
   * Check if stage has tasks
   */
  static async hasTasks(stageId: string): Promise<boolean> {
    try {
      const tasksQuery = query(
        collection(db, 'processRecordTasks'),
        where('stage_id', '==', stageId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      return !tasksSnapshot.empty;
    } catch (error) {
      console.error('Error checking stage tasks:', error);
      return false;
    }
  }
}
