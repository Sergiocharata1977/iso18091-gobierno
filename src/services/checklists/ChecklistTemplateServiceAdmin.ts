// ChecklistTemplateService using Firebase Admin SDK
import { adminDb } from '@/firebase/admin';
import {
  ChecklistField,
  ChecklistTemplate,
  ChecklistTemplateFormData,
} from '@/types/checklists';
import { DocumentData, Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'checklistTemplates';

export class ChecklistTemplateServiceAdmin {
  /**
   * Create a new checklist template
   */
  static async create(
    data: ChecklistTemplateFormData,
    organizationId: string,
    createdBy: string
  ): Promise<string> {
    try {
      const now = Timestamp.now();

      // Generate unique code if not provided
      const codigo =
        data.codigo || (await this.generateCode(data.categoria || 'otro'));

      const docRef = await adminDb.collection(COLLECTION_NAME).add({
        nombre: data.nombre,
        descripcion: data.descripcion,
        codigo,
        categoria: data.categoria || 'otro',
        process_definition_id: data.process_definition_id || null,
        organization_id: organizationId,
        campos: data.campos || [],
        activo: data.activo ?? true,
        version: 1,
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      });

      console.log('[ChecklistTemplateServiceAdmin] Created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating checklist template:', error);
      throw new Error('Failed to create checklist template');
    }
  }

  /**
   * Generate unique code for template
   */
  private static async generateCode(categoria: string): Promise<string> {
    const prefix =
      {
        recepcion: 'CHK-REC',
        produccion: 'CHK-PRD',
        despacho: 'CHK-DSP',
        auditoria: 'CHK-AUD',
        otro: 'CHK-OTR',
      }[categoria] || 'CHK';

    // Get count of templates in category
    const snapshot = await adminDb
      .collection(COLLECTION_NAME)
      .where('categoria', '==', categoria)
      .get();

    const count = snapshot.size + 1;
    return `${prefix}-${count.toString().padStart(3, '0')}`;
  }

  /**
   * Get all active templates for an organization
   */
  static async getAllActive(
    organizationId: string
  ): Promise<ChecklistTemplate[]> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .where('activo', '==', true)
        .get();

      return snapshot.docs.map((doc: DocumentData) => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          codigo: data.codigo || '',
          categoria: data.categoria || 'otro',
          process_definition_id: data.process_definition_id || null,
          organization_id: data.organization_id || '',
          campos: data.campos || [],
          activo: data.activo ?? true,
          version: data.version || 1,
          created_by: data.created_by || '',
          created_at: data.created_at?.toDate?.() || new Date(),
          updated_at: data.updated_at?.toDate?.() || new Date(),
        } as ChecklistTemplate;
      });
    } catch (error) {
      console.error('Error getting checklist templates:', error);
      return [];
    }
  }

  /**
   * Get all templates (including inactive) for an organization
   */
  static async getAll(organizationId: string): Promise<ChecklistTemplate[]> {
    try {
      const snapshot = await adminDb
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .get();

      return snapshot.docs.map((doc: DocumentData) => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre || '',
          descripcion: data.descripcion || '',
          codigo: data.codigo || '',
          categoria: data.categoria || 'otro',
          process_definition_id: data.process_definition_id || null,
          organization_id: data.organization_id || '',
          campos: data.campos || [],
          activo: data.activo ?? true,
          version: data.version || 1,
          created_by: data.created_by || '',
          created_at: data.created_at?.toDate?.() || new Date(),
          updated_at: data.updated_at?.toDate?.() || new Date(),
        } as ChecklistTemplate;
      });
    } catch (error) {
      console.error('Error getting all templates:', error);
      return [];
    }
  }

  /**
   * Get template by ID
   */
  static async getById(id: string): Promise<ChecklistTemplate | null> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data() as DocumentData;
      return {
        id: doc.id,
        nombre: data.nombre || '',
        descripcion: data.descripcion || '',
        codigo: data.codigo || '',
        categoria: data.categoria || 'otro',
        process_definition_id: data.process_definition_id || null,
        organization_id: data.organization_id || '',
        campos: data.campos || [],
        activo: data.activo ?? true,
        version: data.version || 1,
        created_by: data.created_by || '',
        created_at: data.created_at?.toDate?.() || new Date(),
        updated_at: data.updated_at?.toDate?.() || new Date(),
      } as ChecklistTemplate;
    } catch (error) {
      console.error('Error getting template by ID:', error);
      return null;
    }
  }

  /**
   * Update template
   */
  static async update(
    id: string,
    data: Partial<ChecklistTemplateFormData>
  ): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);

      // If campos are being updated, increment version
      const updateData: Record<string, unknown> = {
        ...data,
        updated_at: Timestamp.now(),
      };

      if (data.campos) {
        const doc = await docRef.get();
        const currentVersion = doc.data()?.version || 1;
        updateData.version = currentVersion + 1;
      }

      await docRef.update(updateData);
      console.log('[ChecklistTemplateServiceAdmin] Updated:', id);
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template');
    }
  }

  /**
   * Add field to template
   */
  static async addField(id: string, field: ChecklistField): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Template not found');
      }

      const campos = doc.data()?.campos || [];
      campos.push(field);

      await docRef.update({
        campos,
        version: (doc.data()?.version || 1) + 1,
        updated_at: Timestamp.now(),
      });

      console.log('[ChecklistTemplateServiceAdmin] Field added:', field.id);
    } catch (error) {
      console.error('Error adding field:', error);
      throw new Error('Failed to add field');
    }
  }

  /**
   * Update field in template
   */
  static async updateField(
    id: string,
    fieldId: string,
    fieldData: Partial<ChecklistField>
  ): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Template not found');
      }

      const campos = (doc.data()?.campos || []).map((campo: ChecklistField) => {
        if (campo.id === fieldId) {
          return { ...campo, ...fieldData };
        }
        return campo;
      });

      await docRef.update({
        campos,
        version: (doc.data()?.version || 1) + 1,
        updated_at: Timestamp.now(),
      });

      console.log('[ChecklistTemplateServiceAdmin] Field updated:', fieldId);
    } catch (error) {
      console.error('Error updating field:', error);
      throw new Error('Failed to update field');
    }
  }

  /**
   * Remove field from template
   */
  static async removeField(id: string, fieldId: string): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Template not found');
      }

      const campos = (doc.data()?.campos || []).filter(
        (campo: ChecklistField) => campo.id !== fieldId
      );

      await docRef.update({
        campos,
        version: (doc.data()?.version || 1) + 1,
        updated_at: Timestamp.now(),
      });

      console.log('[ChecklistTemplateServiceAdmin] Field removed:', fieldId);
    } catch (error) {
      console.error('Error removing field:', error);
      throw new Error('Failed to remove field');
    }
  }

  /**
   * Deactivate template (soft delete)
   */
  static async deactivate(id: string): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      await docRef.update({
        activo: false,
        updated_at: Timestamp.now(),
      });

      console.log('[ChecklistTemplateServiceAdmin] Deactivated:', id);
    } catch (error) {
      console.error('Error deactivating template:', error);
      throw new Error('Failed to deactivate template');
    }
  }

  /**
   * Delete template permanently
   */
  static async delete(id: string): Promise<void> {
    try {
      const docRef = adminDb.collection(COLLECTION_NAME).doc(id);
      await docRef.delete();

      console.log('[ChecklistTemplateServiceAdmin] Deleted:', id);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }
}
