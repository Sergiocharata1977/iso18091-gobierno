import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Process, CreateProcessInput } from './types';
import { CreateProcessSchema } from './validations';

export class ProcessService extends BaseService<Process> {
  protected collectionName = 'processes';
  protected schema = CreateProcessSchema;

  async createAndReturnId(
    data: CreateProcessInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const processData: Omit<Process, 'id'> = {
      ...validated,
      status: 'active',
      steps: validated.steps || [],
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(processData);
    return docRef.id;
  }

  async list(filters: any = {}, options: any = {}): Promise<Process[]> {
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

      query = query.orderBy('name', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Process
      );
    } catch (error) {
      console.error('Error listing processes', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Process | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Process;
    } catch (error) {
      console.error(`Error getting process ${id}`, error);
      throw error;
    }
  }

  async getByCategory(category: string): Promise<Process[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('category', '==', category)
        .where('deletedAt', '==', null)
        .orderBy('name', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Process
      );
    } catch (error) {
      console.error(`Error getting processes by category ${category}`, error);
      throw error;
    }
  }

  async getByOwner(owner: string): Promise<Process[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('owner', '==', owner)
        .where('deletedAt', '==', null)
        .orderBy('name', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Process
      );
    } catch (error) {
      console.error(`Error getting processes by owner ${owner}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting process ${id}`, error);
      throw error;
    }
  }
}
