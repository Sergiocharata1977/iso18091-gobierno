import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type { Competence, CreateCompetenceInput } from './types';
import { CreateCompetenceSchema } from './validations';

export class CompetenceService extends BaseService<Competence> {
  protected collectionName = 'competences';
  protected schema = CreateCompetenceSchema;

  async createAndReturnId(
    data: CreateCompetenceInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const competenceData: Omit<Competence, 'id'> = {
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
      .add(competenceData);
    return docRef.id;
  }

  async list(filters: any = {}, options: any = {}): Promise<Competence[]> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.level) {
        query = query.where('level', '==', filters.level);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('name', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Competence
      );
    } catch (error) {
      console.error('Error listing competences', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Competence | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Competence;
    } catch (error) {
      console.error(`Error getting competence ${id}`, error);
      throw error;
    }
  }

  async getByCategory(category: string): Promise<Competence[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('category', '==', category)
        .where('deletedAt', '==', null)
        .orderBy('name', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Competence
      );
    } catch (error) {
      console.error(`Error getting competences by category ${category}`, error);
      throw error;
    }
  }

  async getByLevel(level: string): Promise<Competence[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('level', '==', level)
        .where('deletedAt', '==', null)
        .orderBy('name', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Competence
      );
    } catch (error) {
      console.error(`Error getting competences by level ${level}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting competence ${id}`, error);
      throw error;
    }
  }
}
