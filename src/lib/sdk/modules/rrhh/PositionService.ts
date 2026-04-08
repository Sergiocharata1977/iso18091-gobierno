import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Position, CreatePositionInput } from './types';
import { CreatePositionSchema } from './validations';

export class PositionService extends BaseService<Position> {
  protected collectionName = 'positions';
  protected schema = CreatePositionSchema;

  async createAndReturnId(
    data: CreatePositionInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const positionData: Omit<Position, 'id'> = {
      ...validated,
      requiredCompetencies: validated.requiredCompetencies || [],
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(positionData);
    return docRef.id;
  }

  async list(filters: any = {}, options: any = {}): Promise<Position[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.departmentId) {
        query = query.where('departmentId', '==', filters.departmentId);
      }

      if (filters.level) {
        query = query.where('level', '==', filters.level);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('title', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Position
      );
    } catch (error) {
      console.error('Error listing positions', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Position | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Position;
    } catch (error) {
      console.error(`Error getting position ${id}`, error);
      throw error;
    }
  }

  async getByDepartment(departmentId: string): Promise<Position[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('departmentId', '==', departmentId)
        .where('deletedAt', '==', null)
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Position
      );
    } catch (error) {
      console.error(
        `Error getting positions by department ${departmentId}`,
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
      console.error(`Error deleting position ${id}`, error);
      throw error;
    }
  }
}
