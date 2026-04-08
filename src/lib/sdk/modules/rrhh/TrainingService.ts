import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Training, CreateTrainingInput } from './types';
import { CreateTrainingSchema } from './validations';

export class TrainingService extends BaseService<Training> {
  protected collectionName = 'trainings';
  protected schema = CreateTrainingSchema;

  async createAndReturnId(
    data: CreateTrainingInput,
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

    const trainingData: Omit<Training, 'id'> = {
      ...validated,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      status: 'planned',
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(trainingData);
    return docRef.id;
  }

  async list(filters: any = {}, options: any = {}): Promise<Training[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.personnelId) {
        query = query.where('personnelId', '==', filters.personnelId);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('startDate', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Training
      );
    } catch (error) {
      console.error('Error listing trainings', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Training | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Training;
    } catch (error) {
      console.error(`Error getting training ${id}`, error);
      throw error;
    }
  }

  async getByPersonnel(personnelId: string): Promise<Training[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('personnelId', '==', personnelId)
        .where('deletedAt', '==', null)
        .orderBy('startDate', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Training
      );
    } catch (error) {
      console.error(
        `Error getting trainings for personnel ${personnelId}`,
        error
      );
      throw error;
    }
  }

  async getByCompetence(competencyId: string): Promise<Training[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('competencyId', '==', competencyId)
        .where('deletedAt', '==', null)
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Training
      );
    } catch (error) {
      console.error(
        `Error getting trainings for competency ${competencyId}`,
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
      console.error(`Error deleting training ${id}`, error);
      throw error;
    }
  }
}
