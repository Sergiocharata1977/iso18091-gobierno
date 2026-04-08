// ProcessRecordTaskService using Firebase Admin SDK
import { adminDb } from '@/firebase/admin';
import {
  ProcessRecordTask,
  ProcessRecordTaskFormData,
} from '@/types/processRecords';
import { DocumentData, Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'processRecordTasks';

export class ProcessRecordTaskServiceAdmin {
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
      const now = Timestamp.now();
      // Get current max orden for this stage
      const maxOrden = await this.getMaxOrdenForStage(stageId);

      const docRef = await adminDb.collection(COLLECTION_NAME).add({
        process_record_id: processRecordId,
        stage_id: stageId,
        titulo: data.titulo || '',
        descripcion: data.descripcion || '',
        prioridad: data.prioridad || 'media',
        asignado_a_id: data.asignado_a_id || null,
        asignado_a_nombre: data.asignado_a_nombre || null,
        fecha_vencimiento: data.fecha_vencimiento
          ? Timestamp.fromDate(data.fecha_vencimiento)
          : null,
        etiquetas: data.etiquetas || [],
        archivos_adjuntos: [],
        comentarios_count: 0,
        orden: maxOrden + 1,
        created_by: userId,
        created_at: now,
        updated_at: now,
      });

      console.log('[ProcessRecordTaskServiceAdmin] Created:', docRef.id);
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
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('stage_id', '==', stageId)
        .get();

      if (snapshot.empty) {
        return -1;
      }

      let maxOrden = -1;
      snapshot.docs.forEach((doc: DocumentData) => {
        const orden = doc.data()?.orden || 0;
        if (orden > maxOrden) maxOrden = orden;
      });

      return maxOrden;
    } catch (error) {
      return -1;
    }
  }

  /**
   * Get task by ID
   */
  static async getById(id: string): Promise<ProcessRecordTask | null> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return this.mapDocToTask(doc);
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  }

  /**
   * Get all tasks for a process record
   */
  static async getByProcessRecordId(
    processRecordId: string
  ): Promise<ProcessRecordTask[]> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('process_record_id', '==', processRecordId)
        .get();

      const tasks = snapshot.docs.map((doc: DocumentData) =>
        this.mapDocToTask(doc)
      );

      // Sort in memory to avoid index requirement
      return tasks.sort((a, b) => a.orden - b.orden);
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  /**
   * Get tasks by stage
   */
  static async getByStageId(stageId: string): Promise<ProcessRecordTask[]> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('stage_id', '==', stageId)
        .get();

      const tasks = snapshot.docs.map((doc: DocumentData) =>
        this.mapDocToTask(doc)
      );

      // Sort in memory to avoid index requirement
      return tasks.sort((a, b) => a.orden - b.orden);
    } catch (error) {
      console.error('Error getting tasks by stage:', error);
      return [];
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
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      const updateData: Record<string, unknown> = {
        ...data,
        updated_at: Timestamp.now(),
      };

      if (data.fecha_vencimiento) {
        updateData.fecha_vencimiento = Timestamp.fromDate(
          data.fecha_vencimiento
        );
      }

      await docRef.update(updateData);
      console.log('[ProcessRecordTaskServiceAdmin] Updated:', id);
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
      const docRef = adminDb.collection(COLLECTION_NAME).doc(taskId);
      await docRef.update({
        stage_id: newStageId,
        orden: newOrden,
        updated_at: Timestamp.now(),
      });
      console.log('[ProcessRecordTaskServiceAdmin] Moved:', taskId);
    } catch (error) {
      console.error('Error moving task:', error);
      throw new Error('Failed to move task');
    }
  }

  /**
   * Delete task
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      await docRef.delete();
      console.log('[ProcessRecordTaskServiceAdmin] Deleted:', id);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  /**
   * Map Firestore document to ProcessRecordTask
   */
  private static mapDocToTask(doc: DocumentData): ProcessRecordTask {
    const data = doc.data();
    return {
      id: doc.id,
      process_record_id: data.process_record_id || '',
      stage_id: data.stage_id || '',
      titulo: data.titulo || '',
      descripcion: data.descripcion || '',
      prioridad: data.prioridad || 'media',
      asignado_a_id: data.asignado_a_id || undefined,
      asignado_a_nombre: data.asignado_a_nombre || undefined,
      fecha_vencimiento: data.fecha_vencimiento?.toDate?.() || undefined,
      etiquetas: data.etiquetas || [],
      archivos_adjuntos: data.archivos_adjuntos || [],
      comentarios_count: data.comentarios_count || 0,
      orden: data.orden || 0,
      created_by: data.created_by || '',
      created_at: data.created_at?.toDate?.() || new Date(),
      updated_at: data.updated_at?.toDate?.() || new Date(),
    };
  }
}
