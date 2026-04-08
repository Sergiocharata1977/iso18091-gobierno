import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Measurement, CreateMeasurementInput } from './types';
import { CreateMeasurementSchema } from './validations';

export class MeasurementService extends BaseService<Measurement> {
  protected collectionName = 'measurements';
  protected schema = CreateMeasurementSchema;

  async createAndReturnId(
    data: CreateMeasurementInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);
    const date =
      validated.date instanceof Date
        ? validated.date
        : new Date(validated.date);

    const measurementData: Omit<Measurement, 'id'> = {
      ...validated,
      date: Timestamp.fromDate(date),
      recordedBy: userId,
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(measurementData);
    return docRef.id;
  }

  async list(filters: any = {}, options: any = {}): Promise<Measurement[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.indicatorId) {
        query = query.where('indicatorId', '==', filters.indicatorId);
      }

      if (filters.organization_id) {
        query = query.where('organization_id', '==', filters.organization_id);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('date', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Measurement
      );
    } catch (error) {
      console.error('Error listing measurements', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Measurement | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Measurement;
    } catch (error) {
      console.error(`Error getting measurement ${id}`, error);
      throw error;
    }
  }

  async getByIndicator(
    indicatorId: string,
    organizationId?: string
  ): Promise<Measurement[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('indicatorId', '==', indicatorId)
        .where('deletedAt', '==', null);

      if (organizationId) {
        query = query.where('organization_id', '==', organizationId);
      }

      const snapshot = await query.orderBy('date', 'desc').get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Measurement
      );
    } catch (error) {
      console.error(
        `Error getting measurements for indicator ${indicatorId}`,
        error
      );
      throw error;
    }
  }

  async getByDateRange(
    startDate: Date | string,
    endDate: Date | string,
    organizationId?: string
  ): Promise<Measurement[]> {
    try {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);

      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .where('date', '>=', Timestamp.fromDate(start))
        .where('date', '<=', Timestamp.fromDate(end));

      if (organizationId) {
        query = query.where('organization_id', '==', organizationId);
      }

      const snapshot = await query.orderBy('date', 'desc').get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Measurement
      );
    } catch (error) {
      console.error('Error getting measurements by date range', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting measurement ${id}`, error);
      throw error;
    }
  }
}
