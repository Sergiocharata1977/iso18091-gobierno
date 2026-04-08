// ProcessRecordStageService using Firebase Admin SDK
import { adminDb } from '@/firebase/admin';
import {
  ProcessRecordStage,
  ProcessRecordStageFormData,
} from '@/types/processRecords';
import { DocumentData, Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'processRecordStages';

export class ProcessRecordStageServiceAdmin {
  /**
   * Get all stages for a process record
   */
  static async getByProcessRecordId(
    processRecordId: string
  ): Promise<ProcessRecordStage[]> {
    try {
      // Query sin orderBy para evitar requerir índice compuesto
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('process_record_id', '==', processRecordId)
        .get();

      const stages = snapshot.docs.map((doc: DocumentData) => {
        const data = doc.data();
        return {
          id: doc.id,
          process_record_id: data.process_record_id || '',
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          color: data.color || '#6b7280',
          orden: data.orden ?? 0,
          es_etapa_final: data.es_etapa_final || false,
          created_at: data.created_at?.toDate?.() || new Date(),
          updated_at: data.updated_at?.toDate?.() || new Date(),
        } as ProcessRecordStage;
      });

      // Ordenar en memoria por 'orden'
      return stages.sort((a, b) => a.orden - b.orden);
    } catch (error) {
      console.error('Error getting stages (Admin):', error);
      // Retornar array vacío en lugar de lanzar error
      return [];
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
      const batch = adminDb.batch();
      const colors = ['#6b7280', '#3b82f6', '#f59e0b', '#10b981'];
      const now = Timestamp.now();

      defaultStages.forEach((stageName, index) => {
        const docRef = adminDb.collection(COLLECTION_NAME).doc();
        batch.set(docRef, {
          process_record_id: processRecordId,
          nombre: stageName,
          color: colors[index % colors.length],
          orden: index,
          es_etapa_final: index === defaultStages.length - 1,
          created_at: now,
          updated_at: now,
        });
      });

      await batch.commit();
      console.log(
        '[ProcessRecordStageServiceAdmin] Created default stages:',
        processRecordId
      );
    } catch (error) {
      console.error('Error creating default stages (Admin):', error);
      throw new Error('Failed to create default stages');
    }
  }

  /**
   * Create a new stage
   */
  static async create(
    processRecordId: string,
    data: ProcessRecordStageFormData
  ): Promise<string> {
    try {
      const now = Timestamp.now();
      const docRef = await adminDb.collection(COLLECTION_NAME).add({
        process_record_id: processRecordId,
        ...data,
        created_at: now,
        updated_at: now,
      });

      console.log('[ProcessRecordStageServiceAdmin] Created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating stage (Admin):', error);
      throw new Error('Failed to create stage');
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
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      await docRef.update({
        ...data,
        updated_at: Timestamp.now(),
      });

      console.log('[ProcessRecordStageServiceAdmin] Updated:', id);
    } catch (error) {
      console.error('Error updating stage (Admin):', error);
      throw new Error('Failed to update stage');
    }
  }

  /**
   * Delete stage
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      await docRef.delete();

      console.log('[ProcessRecordStageServiceAdmin] Deleted:', id);
    } catch (error) {
      console.error('Error deleting stage (Admin):', error);
      throw new Error('Failed to delete stage');
    }
  }
}
