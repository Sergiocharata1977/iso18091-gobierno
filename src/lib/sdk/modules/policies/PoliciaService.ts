import { Timestamp } from 'firebase-admin/firestore';
import { BaseService } from '../../base/BaseService';
import type { CreatePolicyInput, Policy } from './types';
import { CreatePolicySchema } from './validations';

export class PoliciaService extends BaseService<Policy> {
  protected collectionName = 'policies';
  protected schema = CreatePolicySchema;

  async createAndReturnId(
    data: CreatePolicyInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const policyData: Omit<Policy, 'id'> = {
      ...validated,
      status: 'draft',
      version: 1,
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(policyData);
    return docRef.id;
  }

  async list(filters: any = {}, options: any = {}): Promise<Policy[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('title', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Policy
      );
    } catch (error) {
      console.error('Error listing policies', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Policy | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Policy;
    } catch (error) {
      console.error(`Error getting policy ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting policy ${id}`, error);
      throw error;
    }
  }
}
