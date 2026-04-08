import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { QualityIndicator, CreateQualityIndicatorInput } from './types';
import { CreateQualityIndicatorSchema } from './validations';

export class QualityIndicatorService extends BaseService<QualityIndicator> {
  protected collectionName = 'qualityIndicators';
  protected schema = CreateQualityIndicatorSchema;

  async createAndReturnId(
    data: CreateQualityIndicatorInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const indicatorData: Omit<QualityIndicator, 'id'> = {
      ...validated,
      currentValue: 0,
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(indicatorData);
    return docRef.id;
  }

  async list(
    filters: any = {},
    options: any = {}
  ): Promise<QualityIndicator[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.objectiveId) {
        query = query.where('objectiveId', '==', filters.objectiveId);
      }

      if (filters.organization_id) {
        query = query.where('organization_id', '==', filters.organization_id);
      }

      if (filters.frequency) {
        query = query.where('frequency', '==', filters.frequency);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('name', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as QualityIndicator
      );
    } catch (error) {
      console.error('Error listing quality indicators', error);
      throw error;
    }
  }

  async getById(id: string): Promise<QualityIndicator | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as QualityIndicator;
    } catch (error) {
      console.error(`Error getting quality indicator ${id}`, error);
      throw error;
    }
  }

  async calculateValue(id: string): Promise<number> {
    try {
      const indicator = await this.getById(id);
      if (!indicator) {
        throw new Error(`Indicator ${id} not found`);
      }

      return indicator.currentValue;
    } catch (error) {
      console.error(`Error calculating value for indicator ${id}`, error);
      throw error;
    }
  }

  async updateCurrentValue(
    id: string,
    value: number,
    userId: string
  ): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        currentValue: value,
        lastMeasurement: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error(`Error updating value for indicator ${id}`, error);
      throw error;
    }
  }

  async getByObjective(
    objectiveId: string,
    organizationId?: string
  ): Promise<QualityIndicator[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('objectiveId', '==', objectiveId)
        .where('deletedAt', '==', null);

      if (organizationId) {
        query = query.where('organization_id', '==', organizationId);
      }

      const snapshot = await query.orderBy('name', 'asc').get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as QualityIndicator
      );
    } catch (error) {
      console.error(
        `Error getting indicators for objective ${objectiveId}`,
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
      console.error(`Error deleting quality indicator ${id}`, error);
      throw error;
    }
  }
}
