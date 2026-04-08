import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { QualityObjective, CreateQualityObjectiveInput } from './types';
import { CreateQualityObjectiveSchema } from './validations';

export class QualityObjectiveService extends BaseService<QualityObjective> {
  protected collectionName = 'qualityObjectives';
  protected schema = CreateQualityObjectiveSchema;

  async createAndReturnId(
    data: CreateQualityObjectiveInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);
    const startDate =
      validated.startDate instanceof Date
        ? validated.startDate
        : new Date(validated.startDate);
    const endDate =
      validated.endDate instanceof Date
        ? validated.endDate
        : new Date(validated.endDate);

    const objectiveData: Omit<QualityObjective, 'id'> = {
      ...validated,
      currentValue: 0,
      status: 'active',
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(objectiveData);
    return docRef.id;
  }

  async list(
    filters: any = {},
    options: any = {}
  ): Promise<QualityObjective[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.organization_id) {
        query = query.where('organization_id', '==', filters.organization_id);
      }

      if (filters.owner) {
        query = query.where('owner', '==', filters.owner);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('startDate', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as QualityObjective
      );
    } catch (error) {
      console.error('Error listing quality objectives', error);
      throw error;
    }
  }

  async getById(id: string): Promise<QualityObjective | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as QualityObjective;
    } catch (error) {
      console.error(`Error getting quality objective ${id}`, error);
      throw error;
    }
  }

  async updateProgress(
    id: string,
    progress: number,
    userId: string
  ): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        currentValue: progress,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error(`Error updating progress for objective ${id}`, error);
      throw error;
    }
  }

  async getByStatus(
    status: string,
    organizationId?: string
  ): Promise<QualityObjective[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('status', '==', status)
        .where('deletedAt', '==', null);

      if (organizationId) {
        query = query.where('organization_id', '==', organizationId);
      }

      const snapshot = await query.orderBy('startDate', 'desc').get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as QualityObjective
      );
    } catch (error) {
      console.error(`Error getting objectives by status ${status}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting quality objective ${id}`, error);
      throw error;
    }
  }
}
