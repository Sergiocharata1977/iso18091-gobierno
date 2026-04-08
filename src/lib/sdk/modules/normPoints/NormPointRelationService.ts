import { Timestamp } from 'firebase-admin/firestore';
import { BaseService } from '../../base/BaseService';
import type {
  ComplianceMatrix,
  NormPointRelation,
  NormPointRelationFilters,
} from './types';
import {
  CreateNormPointRelationSchema,
  NormPointRelationFiltersSchema,
  UpdateComplianceStatusSchema,
} from './validations';

export class NormPointRelationService extends BaseService<NormPointRelation> {
  protected collectionName = 'normPointRelations';
  protected schema = CreateNormPointRelationSchema;

  async createRelation(data: any, userId: string): Promise<string> {
    const validated = this.schema.parse(data);

    const { notes, ...restValidated } = validated;
    const relationData: Omit<NormPointRelation, 'id'> = {
      ...restValidated,
      evidence: validated.evidence || [],
      notes: notes || '',
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      lastVerifiedAt: Timestamp.now(),
      verifiedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(relationData);
    return docRef.id;
  }

  async list(
    filters: NormPointRelationFilters = {},
    options: any = {}
  ): Promise<NormPointRelation[]> {
    try {
      NormPointRelationFiltersSchema.parse(filters);

      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.normPointId) {
        query = query.where('normPointId', '==', filters.normPointId);
      }

      if (filters.entityType) {
        query = query.where('entityType', '==', filters.entityType);
      }

      if (filters.entityId) {
        query = query.where('entityId', '==', filters.entityId);
      }

      if (filters.complianceStatus) {
        query = query.where('complianceStatus', '==', filters.complianceStatus);
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as NormPointRelation
      );
    } catch (error) {
      console.error('Error listing norm point relations', error);
      throw error;
    }
  }

  async getById(id: string): Promise<NormPointRelation | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as NormPointRelation;
    } catch (error) {
      console.error(`Error getting norm point relation ${id}`, error);
      throw error;
    }
  }

  async updateCompliance(id: string, data: any, userId: string): Promise<void> {
    try {
      const validated = UpdateComplianceStatusSchema.parse(data);

      const updateData: Record<string, any> = {
        complianceStatus: validated.complianceStatus,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        lastVerifiedAt: Timestamp.now(),
        verifiedBy: userId,
      };

      if (validated.evidence) {
        updateData.evidence = validated.evidence;
      }

      if (validated.notes) {
        updateData.notes = validated.notes;
      }

      await this.db.collection(this.collectionName).doc(id).update(updateData);
    } catch (error) {
      console.error(`Error updating compliance for relation ${id}`, error);
      throw error;
    }
  }

  async getComplianceMatrix(): Promise<ComplianceMatrix> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .get();

      const relations = snapshot.docs.map(
        doc => doc.data() as NormPointRelation
      );

      const total = relations.length;
      const compliant = relations.filter(
        r => r.complianceStatus === 'compliant'
      ).length;
      const nonCompliant = relations.filter(
        r => r.complianceStatus === 'non_compliant'
      ).length;
      const partial = relations.filter(
        r => r.complianceStatus === 'partial'
      ).length;
      const notApplicable = relations.filter(
        r => r.complianceStatus === 'not_applicable'
      ).length;

      const byCategory: Record<string, any> = {};

      // Agrupar por categoría (usando entityType como categoría)
      relations.forEach(relation => {
        const category = relation.entityType;
        if (!byCategory[category]) {
          byCategory[category] = {
            total: 0,
            compliant: 0,
            nonCompliant: 0,
            partial: 0,
            compliancePercentage: 0,
          };
        }

        byCategory[category].total++;
        if (relation.complianceStatus === 'compliant') {
          byCategory[category].compliant++;
        } else if (relation.complianceStatus === 'non_compliant') {
          byCategory[category].nonCompliant++;
        } else if (relation.complianceStatus === 'partial') {
          byCategory[category].partial++;
        }

        byCategory[category].compliancePercentage = Math.round(
          (byCategory[category].compliant / byCategory[category].total) * 100
        );
      });

      return {
        totalNormPoints: total,
        compliant,
        nonCompliant,
        partial,
        notApplicable,
        compliancePercentage:
          total > 0 ? Math.round((compliant / total) * 100) : 0,
        byCategory,
      };
    } catch (error) {
      console.error('Error getting compliance matrix', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting norm point relation ${id}`, error);
      throw error;
    }
  }
}
