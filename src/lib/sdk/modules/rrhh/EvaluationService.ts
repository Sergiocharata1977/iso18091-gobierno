import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Evaluation, CreateEvaluationInput } from './types';
import { CreateEvaluationSchema } from './validations';

export class EvaluationService extends BaseService<Evaluation> {
  protected collectionName = 'evaluations';
  protected schema = CreateEvaluationSchema;

  async createAndReturnId(
    data: CreateEvaluationInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);
    const evaluationDate =
      validated.evaluationDate instanceof Date
        ? validated.evaluationDate
        : new Date(validated.evaluationDate);

    const evaluationData: Omit<Evaluation, 'id'> = {
      ...validated,
      evaluationDate: Timestamp.fromDate(evaluationDate),
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(evaluationData);
    return docRef.id;
  }

  async list(filters: any = {}, options: any = {}): Promise<Evaluation[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.personnelId) {
        query = query.where('personnelId', '==', filters.personnelId);
      }

      if (filters.evaluatorId) {
        query = query.where('evaluatorId', '==', filters.evaluatorId);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query
        .orderBy('evaluationDate', 'desc')
        .limit(limit)
        .offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Evaluation
      );
    } catch (error) {
      console.error('Error listing evaluations', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Evaluation | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Evaluation;
    } catch (error) {
      console.error(`Error getting evaluation ${id}`, error);
      throw error;
    }
  }

  async getByPersonnel(personnelId: string): Promise<Evaluation[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('personnelId', '==', personnelId)
        .where('deletedAt', '==', null)
        .orderBy('evaluationDate', 'desc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Evaluation
      );
    } catch (error) {
      console.error(
        `Error getting evaluations for personnel ${personnelId}`,
        error
      );
      throw error;
    }
  }

  async getByEvaluator(evaluatorId: string): Promise<Evaluation[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('evaluatorId', '==', evaluatorId)
        .where('deletedAt', '==', null)
        .orderBy('evaluationDate', 'desc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Evaluation
      );
    } catch (error) {
      console.error(
        `Error getting evaluations by evaluator ${evaluatorId}`,
        error
      );
      throw error;
    }
  }

  async updateScore(id: string, score: number, userId: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        score,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error(`Error updating score for evaluation ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting evaluation ${id}`, error);
      throw error;
    }
  }
}
