import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Department, CreateDepartmentInput } from './types';
import { CreateDepartmentSchema } from './validations';

export class DepartmentService extends BaseService<Department> {
  protected collectionName = 'departments';
  protected schema = CreateDepartmentSchema;

  async createAndReturnId(
    data: CreateDepartmentInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const departmentData: Omit<Department, 'id'> = {
      ...validated,
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(departmentData);
    return docRef.id;
  }

  async list(filters: any = {}, options: any = {}): Promise<Department[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('name', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Department
      );
    } catch (error) {
      console.error('Error listing departments', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Department | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Department;
    } catch (error) {
      console.error(`Error getting department ${id}`, error);
      throw error;
    }
  }

  async getByManager(managerId: string): Promise<Department[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('managerId', '==', managerId)
        .where('deletedAt', '==', null)
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Department
      );
    } catch (error) {
      console.error(`Error getting departments by manager ${managerId}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting department ${id}`, error);
      throw error;
    }
  }
}
