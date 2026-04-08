import { z } from 'zod';
import { BaseService } from '../../base/BaseService';
import type { NormPoint, NormPointFilters } from './types';
import { NormPointFiltersSchema } from './validations';

export class NormPointService extends BaseService<NormPoint> {
  protected collectionName = 'normPoints';
  protected schema = z.any(); // Schema básico, se puede mejorar después

  async list(
    filters: NormPointFilters = {},
    options: any = {}
  ): Promise<NormPoint[]> {
    try {
      NormPointFiltersSchema.parse(filters);

      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.chapter) {
        query = query.where('chapter', '==', filters.chapter);
      }

      if (filters.tipoNorma) {
        query = query.where('tipo_norma', '==', filters.tipoNorma);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.isMandatory !== undefined) {
        query = query.where('isMandatory', '==', filters.isMandatory);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('chapter', 'asc').limit(limit).offset(offset);

      const snapshot = await query.get();
      let normPoints = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as NormPoint
      );

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        normPoints = normPoints.filter(
          np =>
            np.requirement.toLowerCase().includes(searchLower) ||
            np.description.toLowerCase().includes(searchLower)
        );
      }

      return normPoints;
    } catch (error) {
      console.error('Error listing norm points', error);
      throw error;
    }
  }

  async getById(id: string): Promise<NormPoint | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as NormPoint;
    } catch (error) {
      console.error(`Error getting norm point ${id}`, error);
      throw error;
    }
  }

  async getByChapter(chapter: string): Promise<NormPoint[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('chapter', '==', chapter)
        .where('deletedAt', '==', null)
        .orderBy('section', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as NormPoint
      );
    } catch (error) {
      console.error(`Error getting norm points by chapter ${chapter}`, error);
      throw error;
    }
  }

  async getByCategory(category: string): Promise<NormPoint[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('category', '==', category)
        .where('deletedAt', '==', null)
        .orderBy('chapter', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as NormPoint
      );
    } catch (error) {
      console.error(`Error getting norm points by category ${category}`, error);
      throw error;
    }
  }

  async getMandatory(): Promise<NormPoint[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('isMandatory', '==', true)
        .where('deletedAt', '==', null)
        .orderBy('chapter', 'asc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as NormPoint
      );
    } catch (error) {
      console.error('Error getting mandatory norm points', error);
      throw error;
    }
  }
}
