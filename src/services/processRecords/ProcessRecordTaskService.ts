import { db } from '@/firebase/config';
import {
  ProcessRecordTask,
  ProcessRecordTaskFormData,
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
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'processRecordTasks';

export class ProcessRecordTaskService {
  /**
   * Create a new task
   */
  static async create(
    processRecordId: string,
    stageId: string,
    data: ProcessRecordTaskFormData,
    userId: string
  ): Promise<string> {
    try {
      // Get current max orden for this stage
      const maxOrden = await this.getMaxOrdenForStage(stageId);

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        process_record_id: processRecordId,
        stage_id: stageId,
        ...data,
        fecha_vencimiento: data.fecha_vencimiento
          ? Timestamp.fromDate(data.fecha_vencimiento)
          : null,
        archivos_adjuntos: [],
        comentarios_count: 0,
        orden: maxOrden + 1,
        created_by: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }

  /**
   * Get max orden for a stage
   */
  private static async getMaxOrdenForStage(stageId: string): Promise<number> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('stage_id', '==', stageId),
        orderBy('orden', 'desc')
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return -1;
      }

      const firstDoc = querySnapshot.docs[0];
      return firstDoc.data().orden || 0;
    } catch (error) {
      return -1;
    }
  }

  /**
   * Get task by ID
   */
  static async getById(id: string): Promise<ProcessRecordTask | null> {
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
        fecha_vencimiento: data.fecha_vencimiento?.toDate(),
        created_at: data.created_at?.toDate() || new Date(),
        updated_at: data.updated_at?.toDate() || new Date(),
      } as ProcessRecordTask;
    } catch (error) {
      console.error('Error getting task:', error);
      throw new Error('Failed to get task');
    }
  }

  /**
   * Get all tasks for a process record
   */
  static async getByProcessRecordId(
    processRecordId: string
  ): Promise<ProcessRecordTask[]> {
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
          fecha_vencimiento: data.fecha_vencimiento?.toDate(),
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as ProcessRecordTask;
      });
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw new Error('Failed to get tasks');
    }
  }

  /**
   * Get tasks by stage
   */
  static async getByStageId(stageId: string): Promise<ProcessRecordTask[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('stage_id', '==', stageId),
        orderBy('orden', 'asc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fecha_vencimiento: data.fecha_vencimiento?.toDate(),
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as ProcessRecordTask;
      });
    } catch (error) {
      console.error('Error getting tasks by stage:', error);
      throw new Error('Failed to get tasks');
    }
  }

  /**
   * Update task
   */
  static async update(
    id: string,
    data: Partial<ProcessRecordTaskFormData>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: any = {
        ...data,
        updated_at: serverTimestamp(),
      };

      if (data.fecha_vencimiento) {
        updateData.fecha_vencimiento = Timestamp.fromDate(
          data.fecha_vencimiento
        );
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  /**
   * Move task to different stage
   */
  static async moveToStage(
    taskId: string,
    newStageId: string,
    newOrden: number
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, taskId);
      await updateDoc(docRef, {
        stage_id: newStageId,
        orden: newOrden,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error moving task:', error);
      throw new Error('Failed to move task');
    }
  }

  /**
   * Reorder tasks within a stage
   */
  static async reorderInStage(
    tasks: { id: string; orden: number }[]
  ): Promise<void> {
    try {
      const updates = tasks.map(async ({ id, orden }) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
          orden,
          updated_at: serverTimestamp(),
        });
      });

      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering tasks:', error);
      throw new Error('Failed to reorder tasks');
    }
  }

  /**
   * Delete task
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  /**
   * Increment comments count
   */
  static async incrementCommentsCount(taskId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, taskId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const currentCount = docSnap.data().comentarios_count || 0;
        await updateDoc(docRef, {
          comentarios_count: currentCount + 1,
          updated_at: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error incrementing comments count:', error);
      throw new Error('Failed to increment comments count');
    }
  }
}
