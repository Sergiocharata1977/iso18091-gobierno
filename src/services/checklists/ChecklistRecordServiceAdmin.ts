// ChecklistRecordService using Firebase Admin SDK
import { adminDb } from '@/firebase/admin';
import {
  ChecklistAnswer,
  ChecklistRecord,
  ChecklistRecordFormData,
  ChecklistResult,
} from '@/types/checklists';
import { DocumentData, Timestamp } from 'firebase-admin/firestore';
import { ChecklistTemplateServiceAdmin } from './ChecklistTemplateServiceAdmin';

const COLLECTION_NAME = 'checklistRecords';

export class ChecklistRecordServiceAdmin {
  /**
   * Create a new checklist record from a template
   */
  static async create(
    data: ChecklistRecordFormData,
    organizationId: string,
    createdBy: string
  ): Promise<string> {
    try {
      // Get template to initialize record
      const template = await ChecklistTemplateServiceAdmin.getById(
        data.template_id
      );
      if (!template) {
        throw new Error('Template not found');
      }

      const now = Timestamp.now();

      // Initialize answers from template fields
      const respuestas: ChecklistAnswer[] = template.campos.map(campo => ({
        campo_id: campo.id,
        campo_etiqueta: campo.etiqueta,
        valor: null,
        valor_esperado: campo.valor_esperado || undefined,
        conforme: null,
        observacion: '',
      }));

      const docRef = await adminDb.collection(COLLECTION_NAME).add({
        template_id: data.template_id,
        template_nombre: template.nombre,
        process_record_id: data.process_record_id || null,
        organization_id: organizationId,
        estado: 'pendiente',
        respuestas,
        resultado: 'pendiente',
        items_conformes: 0,
        items_no_conformes: 0,
        items_totales: template.campos.length,
        porcentaje_conformidad: 0,
        observaciones_generales: data.observaciones_generales || '',
        completado_por_id: null,
        completado_por_nombre: null,
        completado_at: null,
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      });

      console.log('[ChecklistRecordServiceAdmin] Created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating checklist record:', error);
      throw new Error('Failed to create checklist record');
    }
  }

  /**
   * Get all records for an organization
   */
  static async getAll(organizationId: string): Promise<ChecklistRecord[]> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .get();

      return snapshot.docs.map((doc: DocumentData) => this.mapDocToRecord(doc));
    } catch (error) {
      console.error('Error getting checklist records:', error);
      return [];
    }
  }

  /**
   * Get records by process record ID
   */
  static async getByProcessRecord(
    processRecordId: string
  ): Promise<ChecklistRecord[]> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('process_record_id', '==', processRecordId)
        .get();

      return snapshot.docs.map((doc: DocumentData) => this.mapDocToRecord(doc));
    } catch (error) {
      console.error('Error getting records by process:', error);
      return [];
    }
  }

  /**
   * Get record by ID
   */
  static async getById(id: string): Promise<ChecklistRecord | null> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return this.mapDocToRecord(doc);
    } catch (error) {
      console.error('Error getting record by ID:', error);
      return null;
    }
  }

  /**
   * Update an answer in the checklist
   */
  static async updateAnswer(
    recordId: string,
    campoId: string,
    answer: Partial<ChecklistAnswer>
  ): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(recordId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Record not found');
      }

      const respuestas = (doc.data()?.respuestas || []).map(
        (resp: ChecklistAnswer) => {
          if (resp.campo_id === campoId) {
            return { ...resp, ...answer };
          }
          return resp;
        }
      );

      // Calculate conformity stats
      const { conformes, noConformes, resultado, porcentaje } =
        this.calculateStats(respuestas);

      await docRef.update({
        respuestas,
        estado: 'en_progreso',
        items_conformes: conformes,
        items_no_conformes: noConformes,
        resultado,
        porcentaje_conformidad: porcentaje,
        updated_at: Timestamp.now(),
      });

      console.log('[ChecklistRecordServiceAdmin] Answer updated:', campoId);
    } catch (error) {
      console.error('Error updating answer:', error);
      throw new Error('Failed to update answer');
    }
  }

  /**
   * Update all answers at once
   */
  static async updateAllAnswers(
    recordId: string,
    respuestas: ChecklistAnswer[]
  ): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(recordId);

      const { conformes, noConformes, resultado, porcentaje } =
        this.calculateStats(respuestas);

      await docRef.update({
        respuestas,
        estado: 'en_progreso',
        items_conformes: conformes,
        items_no_conformes: noConformes,
        resultado,
        porcentaje_conformidad: porcentaje,
        updated_at: Timestamp.now(),
      });

      console.log('[ChecklistRecordServiceAdmin] All answers updated');
    } catch (error) {
      console.error('Error updating all answers:', error);
      throw new Error('Failed to update answers');
    }
  }

  /**
   * Complete the checklist
   */
  static async complete(
    recordId: string,
    completadoPorId: string,
    completadoPorNombre: string,
    observaciones?: string
  ): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(recordId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Record not found');
      }

      const respuestas = doc.data()?.respuestas || [];
      const { conformes, noConformes, resultado, porcentaje } =
        this.calculateStats(respuestas);

      await docRef.update({
        estado: 'completado',
        resultado,
        items_conformes: conformes,
        items_no_conformes: noConformes,
        porcentaje_conformidad: porcentaje,
        completado_por_id: completadoPorId,
        completado_por_nombre: completadoPorNombre,
        completado_at: Timestamp.now(),
        observaciones_generales:
          observaciones || doc.data()?.observaciones_generales,
        updated_at: Timestamp.now(),
      });

      console.log('[ChecklistRecordServiceAdmin] Completed:', recordId);
    } catch (error) {
      console.error('Error completing checklist:', error);
      throw new Error('Failed to complete checklist');
    }
  }

  /**
   * Cancel a checklist record
   */
  static async cancel(recordId: string): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(recordId);
      await docRef.update({
        estado: 'cancelado',
        updated_at: Timestamp.now(),
      });

      console.log('[ChecklistRecordServiceAdmin] Cancelled:', recordId);
    } catch (error) {
      console.error('Error cancelling checklist:', error);
      throw new Error('Failed to cancel checklist');
    }
  }

  /**
   * Delete a checklist record
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      await docRef.delete();

      console.log('[ChecklistRecordServiceAdmin] Deleted:', id);
    } catch (error) {
      console.error('Error deleting checklist record:', error);
      throw new Error('Failed to delete checklist record');
    }
  }

  /**
   * Calculate conformity statistics
   */
  private static calculateStats(respuestas: ChecklistAnswer[]): {
    conformes: number;
    noConformes: number;
    resultado: ChecklistResult;
    porcentaje: number;
  } {
    const evaluated = respuestas.filter(r => r.conforme !== null);
    const conformes = respuestas.filter(r => r.conforme === true).length;
    const noConformes = respuestas.filter(r => r.conforme === false).length;

    let resultado: ChecklistResult = 'pendiente';
    let porcentaje = 0;

    if (evaluated.length > 0) {
      porcentaje = Math.round((conformes / evaluated.length) * 100);
      resultado = noConformes > 0 ? 'no_conforme' : 'conforme';
    }

    return { conformes, noConformes, resultado, porcentaje };
  }

  /**
   * Map Firestore document to ChecklistRecord
   */
  private static mapDocToRecord(doc: DocumentData): ChecklistRecord {
    const data = doc.data();
    return {
      id: doc.id,
      template_id: data.template_id || '',
      template_nombre: data.template_nombre || '',
      process_record_id: data.process_record_id || null,
      organization_id: data.organization_id || '',
      estado: data.estado || 'pendiente',
      respuestas: data.respuestas || [],
      resultado: data.resultado || 'pendiente',
      items_conformes: data.items_conformes || 0,
      items_no_conformes: data.items_no_conformes || 0,
      items_totales: data.items_totales || 0,
      porcentaje_conformidad: data.porcentaje_conformidad || 0,
      observaciones_generales: data.observaciones_generales || '',
      completado_por_id: data.completado_por_id || null,
      completado_por_nombre: data.completado_por_nombre || null,
      completado_at: data.completado_at?.toDate?.() || null,
      created_by: data.created_by || '',
      created_at: data.created_at?.toDate?.() || new Date(),
      updated_at: data.updated_at?.toDate?.() || new Date(),
    } as ChecklistRecord;
  }
}
