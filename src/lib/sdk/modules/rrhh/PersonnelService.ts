import { Timestamp } from 'firebase-admin/firestore';
import { BaseService } from '../../base/BaseService';
import type { CreatePersonnelInput, Personnel } from './types';
import { CreatePersonnelSchema } from './validations';

export class PersonnelService extends BaseService<Personnel> {
  protected collectionName = 'personnel';
  protected schema = CreatePersonnelSchema;

  async createAndReturnId(
    data: CreatePersonnelInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);
    const hireDate =
      validated.hireDate instanceof Date
        ? validated.hireDate
        : new Date(validated.hireDate);

    const personnelData: Omit<Personnel, 'id'> = {
      ...validated,
      hireDate: Timestamp.fromDate(hireDate),
      status: 'active',
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(personnelData);
    return docRef.id;
  }

  async list(filters: any = {}, options: any = {}): Promise<Personnel[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.departmentId) {
        query = query.where('departmentId', '==', filters.departmentId);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('lastName', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Personnel
      );
    } catch (error) {
      console.error('Error listing personnel', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Personnel | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Personnel;
    } catch (error) {
      console.error(`Error getting personnel ${id}`, error);
      throw error;
    }
  }

  async getByPosition(positionId: string): Promise<Personnel[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('positionId', '==', positionId)
        .where('deletedAt', '==', null)
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Personnel
      );
    } catch (error) {
      console.error(`Error getting personnel by position ${positionId}`, error);
      throw error;
    }
  }

  async getByDepartment(departmentId: string): Promise<Personnel[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('departmentId', '==', departmentId)
        .where('deletedAt', '==', null)
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Personnel
      );
    } catch (error) {
      console.error(
        `Error getting personnel by department ${departmentId}`,
        error
      );
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting personnel ${id}`, error);
      throw error;
    }
  }
}
