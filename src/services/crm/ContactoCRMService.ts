// src/services/crm/ContactoCRMService.ts
// Servicio para gestión de contactos del CRM

import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  ContactoCRM,
  CreateContactoCRMData,
  UpdateContactoCRMData,
} from '@/types/crm-contacto';

export class ContactoCRMService {
  private static readonly COLLECTION = 'crm_contactos';

  /**
   * Obtiene todos los contactos de una organización
   */
  static async getByOrganization(
    organizationId: string
  ): Promise<ContactoCRM[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ContactoCRM[];
  }

  /**
   * Obtiene un contacto por ID
   */
  static async getById(id: string): Promise<ContactoCRM | null> {
    const db = getAdminFirestore();
    const doc = await db.collection(this.COLLECTION).doc(id).get();

    if (!doc.exists) return null;

    return { id: doc.id, ...doc.data() } as ContactoCRM;
  }

  /**
   * Crea un nuevo contacto
   */
  static async create(
    organizationId: string,
    data: CreateContactoCRMData
  ): Promise<ContactoCRM> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    const contactoData = {
      ...data,
      organization_id: organizationId,
      isActive: true,
      created_at: now,
      updated_at: now,
    };

    const docRef = await db.collection(this.COLLECTION).add(contactoData);

    return { id: docRef.id, ...contactoData } as ContactoCRM;
  }

  /**
   * Actualiza un contacto
   */
  static async update(id: string, data: UpdateContactoCRMData): Promise<void> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    await db
      .collection(this.COLLECTION)
      .doc(id)
      .update({
        ...data,
        updated_at: now,
      });
  }

  /**
   * Elimina (soft delete) un contacto
   */
  static async delete(id: string): Promise<void> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    await db.collection(this.COLLECTION).doc(id).update({
      isActive: false,
      updated_at: now,
    });
  }

  /**
   * Obtiene contactos de una organización CRM específica
   */
  static async getByOrganizacionCRM(
    organizationId: string,
    crmOrganizacionId: string
  ): Promise<ContactoCRM[]> {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('crm_organizacion_id', '==', crmOrganizacionId)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ContactoCRM[];
  }
}
