/**
 * NormPointRelationServiceAdmin
 * Servicio para gestion de relaciones de puntos de norma (Version Admin SDK)
 * Usado en API Routes para evitar problemas de permisos
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  ComplianceStats,
  ComplianceStatus,
  NormCategory,
  NormPointRelation,
  NormPointRelationFormData,
} from '@/types/normPoints';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NormPointServiceAdmin } from './NormPointServiceAdmin';

const COLLECTION_NAME = 'normPointRelations';

interface LinkProcessToNormPointsInput {
  organizationId: string;
  processId: string;
  normPointIds: string[];
  userId: string;
}

interface LinkProcessToNormPointsResult {
  createdRelations: number;
  skippedRelations: number;
  updatedNormPoints: number;
  missingNormPoints: string[];
}

export class NormPointRelationServiceAdmin {
  /**
   * Obtiene todas las relaciones de puntos de norma
   */
  static async getAll(): Promise<NormPointRelation[]> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db.collection(COLLECTION_NAME).get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        verification_date: doc.data().verification_date?.toDate(),
        next_review_date: doc.data().next_review_date?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPointRelation[];
    } catch (error) {
      console.error('Error getting norm point relations (Admin):', error);
      throw new Error('Error al obtener relaciones de puntos de norma');
    }
  }

  /**
   * Crea una relacion de punto de norma (Admin)
   */
  static async create(
    data: NormPointRelationFormData
  ): Promise<NormPointRelation> {
    try {
      const db = getAdminFirestore();
      const now = Timestamp.now();

      const docData = {
        ...data,
        verification_date: data.verification_date
          ? Timestamp.fromDate(data.verification_date)
          : null,
        next_review_date: data.next_review_date
          ? Timestamp.fromDate(data.next_review_date)
          : null,
        created_at: now,
        updated_at: now,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(docData);

      return {
        id: docRef.id,
        ...data,
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating norm point relation (Admin):', error);
      throw new Error('Error al crear relacion de punto de norma');
    }
  }

  /**
   * Vincula un proceso con multiples puntos de norma (idempotente)
   */
  static async linkProcessToNormPoints(
    input: LinkProcessToNormPointsInput
  ): Promise<LinkProcessToNormPointsResult> {
    try {
      const db = getAdminFirestore();
      const uniqueNormPointIds = [...new Set(input.normPointIds)].filter(
        Boolean
      );

      if (
        !input.organizationId ||
        !input.processId ||
        uniqueNormPointIds.length === 0
      ) {
        return {
          createdRelations: 0,
          skippedRelations: 0,
          updatedNormPoints: 0,
          missingNormPoints: [],
        };
      }

      const existingRelationsSnap = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', input.organizationId)
        .where('process_id', '==', input.processId)
        .get();

      const existingNormPointIds = new Set(
        existingRelationsSnap.docs.map(
          doc => doc.data().norm_point_id as string
        )
      );

      let createdRelations = 0;
      let skippedRelations = 0;
      let updatedNormPoints = 0;
      const missingNormPoints: string[] = [];
      const now = Timestamp.now();

      for (const normPointId of uniqueNormPointIds) {
        const normPointRef = db.collection('normPoints').doc(normPointId);
        const normPointSnap = await normPointRef.get();
        const normPoint = normPointSnap.data();

        if (
          !normPointSnap.exists ||
          normPoint?.organization_id !== input.organizationId
        ) {
          missingNormPoints.push(normPointId);
          skippedRelations += 1;
          continue;
        }

        await normPointRef.set(
          {
            related_process_ids: FieldValue.arrayUnion(input.processId),
            updated_by: input.userId,
            updated_at: now,
          },
          { merge: true }
        );
        updatedNormPoints += 1;

        if (existingNormPointIds.has(normPointId)) {
          skippedRelations += 1;
          continue;
        }

        await db.collection(COLLECTION_NAME).add({
          organization_id: input.organizationId,
          norm_point_id: normPointId,
          process_id: input.processId,
          document_ids: [],
          compliance_status: 'pendiente',
          compliance_percentage: 0,
          evidence_description: '',
          evidence_files: [],
          verification_date: null,
          next_review_date: null,
          created_by: input.userId,
          updated_by: input.userId,
          created_at: now,
          updated_at: now,
        });

        existingNormPointIds.add(normPointId);
        createdRelations += 1;
      }

      return {
        createdRelations,
        skippedRelations,
        updatedNormPoints,
        missingNormPoints,
      };
    } catch (error) {
      console.error('Error linking process to norm points (Admin):', error);
      throw new Error('Error al vincular proceso con puntos de norma');
    }
  }

  /**
   * Obtiene revisiones proximas en N dias
   */
  static async getUpcomingReviews(
    days: number = 30
  ): Promise<NormPointRelation[]> {
    try {
      const allRelations = await this.getAll();
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      return allRelations.filter(
        rel =>
          rel.next_review_date &&
          rel.next_review_date > now &&
          rel.next_review_date <= futureDate
      );
    } catch (error) {
      console.error('Error getting upcoming reviews (Admin):', error);
      throw new Error('Error al obtener revisiones proximas');
    }
  }

  /**
   * Obtiene estadisticas de cumplimiento
   */
  static async getComplianceStats(): Promise<ComplianceStats> {
    try {
      const allRelations = await this.getAll();
      const allNormPoints = await NormPointServiceAdmin.getAll();

      const totalPercentage = allRelations.reduce(
        (sum, rel) => sum + (rel.compliance_percentage || 0),
        0
      );
      const global_percentage =
        allRelations.length > 0 ? totalPercentage / allRelations.length : 0;

      const by_chapter: Record<number, number> = {};
      for (let chapter = 4; chapter <= 10; chapter++) {
        const chapterPoints = allNormPoints.filter(p => p.chapter === chapter);
        const chapterRelations = allRelations.filter(rel =>
          chapterPoints.some(p => p.id === rel.norm_point_id)
        );
        const chapterTotal = chapterRelations.reduce(
          (sum, rel) => sum + (rel.compliance_percentage || 0),
          0
        );
        by_chapter[chapter] =
          chapterRelations.length > 0
            ? chapterTotal / chapterRelations.length
            : 0;
      }

      const by_category: Record<NormCategory, number> = {
        contexto: 0,
        liderazgo: 0,
        planificacion: 0,
        soporte: 0,
        operacion: 0,
        evaluacion: 0,
        mejora: 0,
      };

      const categories: NormCategory[] = [
        'contexto',
        'liderazgo',
        'planificacion',
        'soporte',
        'operacion',
        'evaluacion',
        'mejora',
      ];

      categories.forEach(category => {
        const categoryPoints = allNormPoints.filter(
          p => p.category === category
        );
        const categoryRelations = allRelations.filter(rel =>
          categoryPoints.some(p => p.id === rel.norm_point_id)
        );
        const categoryTotal = categoryRelations.reduce(
          (sum, rel) => sum + (rel.compliance_percentage || 0),
          0
        );
        by_category[category] =
          categoryRelations.length > 0
            ? categoryTotal / categoryRelations.length
            : 0;
      });

      const by_status: Record<ComplianceStatus, number> = {
        completo: 0,
        parcial: 0,
        pendiente: 0,
        no_aplica: 0,
      };

      allRelations.forEach(rel => {
        if (rel.compliance_status) {
          by_status[rel.compliance_status]++;
        }
      });

      const mandatoryPoints = allNormPoints.filter(p => p.is_mandatory);
      const mandatory_pending = allRelations.filter(
        rel =>
          mandatoryPoints.some(p => p.id === rel.norm_point_id) &&
          rel.compliance_status === 'pendiente'
      ).length;

      const highPriorityPoints = allNormPoints.filter(
        p => p.priority === 'alta'
      );
      const high_priority_pending = allRelations.filter(
        rel =>
          highPriorityPoints.some(p => p.id === rel.norm_point_id) &&
          rel.compliance_status === 'pendiente'
      ).length;

      const upcoming_reviews = await this.getUpcomingReviews(30);

      return {
        global_percentage,
        by_chapter,
        by_category,
        by_status,
        mandatory_pending,
        high_priority_pending,
        upcoming_reviews,
      };
    } catch (error) {
      console.error('Error getting compliance stats (Admin):', error);
      throw new Error('Error al obtener estadisticas de cumplimiento');
    }
  }
}
