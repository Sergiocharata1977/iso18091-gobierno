import { db } from '@/firebase/config';
import {
  ComplianceMatrix,
  ComplianceStats,
  ComplianceStatus,
  NormCategory,
  NormPointRelation,
  NormPointRelationFormData,
} from '@/types/normPoints';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { NormPointService } from './NormPointService';

const COLLECTION_NAME = 'normPointRelations';

export class NormPointRelationService {
  // ============================================
  // CRUD OPERATIONS
  // ============================================

  static async getAll(): Promise<NormPointRelation[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        verification_date: doc.data().verification_date?.toDate(),
        next_review_date: doc.data().next_review_date?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPointRelation[];
    } catch (error) {
      console.error('Error getting norm point relations:', error);
      throw new Error('Error al obtener relaciones de puntos de norma');
    }
  }

  static async getById(id: string): Promise<NormPointRelation | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          verification_date: docSnap.data().verification_date?.toDate(),
          next_review_date: docSnap.data().next_review_date?.toDate(),
          created_at: docSnap.data().created_at?.toDate() || new Date(),
          updated_at: docSnap.data().updated_at?.toDate() || new Date(),
        } as NormPointRelation;
      }
      return null;
    } catch (error) {
      console.error('Error getting norm point relation:', error);
      throw new Error('Error al obtener relación de punto de norma');
    }
  }

  static async create(
    data: NormPointRelationFormData
  ): Promise<NormPointRelation> {
    try {
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

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

      return {
        id: docRef.id,
        ...data,
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating norm point relation:', error);
      throw new Error('Error al crear relación de punto de norma');
    }
  }

  static async update(
    id: string,
    data: Partial<NormPointRelationFormData>
  ): Promise<NormPointRelation> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      const updateData: Record<
        string,
        Timestamp | string | number | boolean | string[] | null
      > = {
        updated_at: Timestamp.now(),
      };

      // Copy non-date fields
      Object.keys(data).forEach(key => {
        const value = (data as Record<string, unknown>)[key];
        if (
          value !== undefined &&
          key !== 'verification_date' &&
          key !== 'next_review_date'
        ) {
          updateData[key] = value as
            | string
            | number
            | boolean
            | string[]
            | null;
        }
      });

      // Convert dates
      if (data.verification_date) {
        updateData.verification_date = Timestamp.fromDate(
          data.verification_date
        );
      }
      if (data.next_review_date) {
        updateData.next_review_date = Timestamp.fromDate(data.next_review_date);
      }

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Relación no encontrada después de actualizar');
      }

      return updated;
    } catch (error) {
      console.error('Error updating norm point relation:', error);
      throw new Error('Error al actualizar relación de punto de norma');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting norm point relation:', error);
      throw new Error('Error al eliminar relación de punto de norma');
    }
  }

  // ============================================
  // SEARCH AND FILTER
  // ============================================

  static async getByNormPoint(
    normPointId: string
  ): Promise<NormPointRelation[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('norm_point_id', '==', normPointId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        verification_date: doc.data().verification_date?.toDate(),
        next_review_date: doc.data().next_review_date?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPointRelation[];
    } catch (error) {
      console.error('Error getting relations by norm point:', error);
      throw new Error('Error al obtener relaciones por punto de norma');
    }
  }

  static async getByProcess(processId: string): Promise<NormPointRelation[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('process_id', '==', processId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        verification_date: doc.data().verification_date?.toDate(),
        next_review_date: doc.data().next_review_date?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPointRelation[];
    } catch (error) {
      console.error('Error getting relations by process:', error);
      throw new Error('Error al obtener relaciones por proceso');
    }
  }

  static async getByStatus(
    status: ComplianceStatus
  ): Promise<NormPointRelation[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('compliance_status', '==', status)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        verification_date: doc.data().verification_date?.toDate(),
        next_review_date: doc.data().next_review_date?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as NormPointRelation[];
    } catch (error) {
      console.error('Error getting relations by status:', error);
      throw new Error('Error al obtener relaciones por estado');
    }
  }

  // ============================================
  // COMPLIANCE MANAGEMENT
  // ============================================

  static async updateCompliance(
    id: string,
    status: ComplianceStatus,
    percentage: number,
    userId: string
  ): Promise<NormPointRelation> {
    try {
      if (percentage < 0 || percentage > 100) {
        throw new Error('El porcentaje debe estar entre 0 y 100');
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        compliance_status: status,
        compliance_percentage: percentage,
        verification_date: Timestamp.now(),
        updated_by: userId,
        updated_at: Timestamp.now(),
      });

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Relación no encontrada después de actualizar');
      }

      return updated;
    } catch (error) {
      console.error('Error updating compliance:', error);
      throw error;
    }
  }

  static async addEvidence(
    id: string,
    description: string,
    files: File[]
  ): Promise<NormPointRelation> {
    try {
      const relation = await this.getById(id);
      if (!relation) {
        throw new Error('Relación no encontrada');
      }

      // Upload files to Storage
      const { ref, uploadBytes } = await import('firebase/storage');
      const { storage } = await import('@/firebase/config');

      const uploadedPaths: string[] = [];

      for (const file of files) {
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(
            `El archivo ${file.name} excede el tamaño máximo de 5MB`
          );
        }

        const fileName = `evidence/${id}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        uploadedPaths.push(fileName);
      }

      // Update relation
      const existingFiles = relation.evidence_files || [];
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        evidence_description: description,
        evidence_files: [...existingFiles, ...uploadedPaths],
        updated_at: Timestamp.now(),
      });

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Relación no encontrada después de agregar evidencia');
      }

      return updated;
    } catch (error) {
      console.error('Error adding evidence:', error);
      throw error;
    }
  }

  static async removeEvidence(
    id: string,
    filePath: string
  ): Promise<NormPointRelation> {
    try {
      const relation = await this.getById(id);
      if (!relation) {
        throw new Error('Relación no encontrada');
      }

      // Delete from Storage
      const { ref, deleteObject } = await import('firebase/storage');
      const { storage } = await import('@/firebase/config');

      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);

      // Update relation
      const updatedFiles = (relation.evidence_files || []).filter(
        f => f !== filePath
      );
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        evidence_files: updatedFiles,
        updated_at: Timestamp.now(),
      });

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Relación no encontrada después de eliminar evidencia');
      }

      return updated;
    } catch (error) {
      console.error('Error removing evidence:', error);
      throw new Error('Error al eliminar evidencia');
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  static async getComplianceStats(): Promise<ComplianceStats> {
    try {
      const allRelations = await this.getAll();
      const allNormPoints = await NormPointService.getAll();

      // Calculate global percentage
      const totalPercentage = allRelations.reduce(
        (sum, rel) => sum + rel.compliance_percentage,
        0
      );
      const global_percentage =
        allRelations.length > 0 ? totalPercentage / allRelations.length : 0;

      // By chapter
      const by_chapter: Record<number, number> = {};
      for (let chapter = 4; chapter <= 10; chapter++) {
        const chapterPoints = allNormPoints.filter(p => p.chapter === chapter);
        const chapterRelations = allRelations.filter(rel =>
          chapterPoints.some(p => p.id === rel.norm_point_id)
        );
        const chapterTotal = chapterRelations.reduce(
          (sum, rel) => sum + rel.compliance_percentage,
          0
        );
        by_chapter[chapter] =
          chapterRelations.length > 0
            ? chapterTotal / chapterRelations.length
            : 0;
      }

      // By category
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
          (sum, rel) => sum + rel.compliance_percentage,
          0
        );
        by_category[category] =
          categoryRelations.length > 0
            ? categoryTotal / categoryRelations.length
            : 0;
      });

      // By status
      const by_status: Record<ComplianceStatus, number> = {
        completo: 0,
        parcial: 0,
        pendiente: 0,
        no_aplica: 0,
      };

      allRelations.forEach(rel => {
        by_status[rel.compliance_status]++;
      });

      // Mandatory pending
      const mandatoryPoints = allNormPoints.filter(p => p.is_mandatory);
      const mandatory_pending = allRelations.filter(
        rel =>
          mandatoryPoints.some(p => p.id === rel.norm_point_id) &&
          rel.compliance_status === 'pendiente'
      ).length;

      // High priority pending
      const highPriorityPoints = allNormPoints.filter(
        p => p.priority === 'alta'
      );
      const high_priority_pending = allRelations.filter(
        rel =>
          highPriorityPoints.some(p => p.id === rel.norm_point_id) &&
          rel.compliance_status === 'pendiente'
      ).length;

      // Upcoming reviews
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
      console.error('Error getting compliance stats:', error);
      throw new Error('Error al obtener estadísticas de cumplimiento');
    }
  }

  static async getComplianceMatrix(): Promise<ComplianceMatrix> {
    try {
      const allNormPoints = await NormPointService.getAll();
      const allRelations = await this.getAll();

      // Get unique processes
      const processIds = [...new Set(allRelations.map(r => r.process_id))];

      // Fetch process names (assuming ProcessService exists)
      const processes = await Promise.all(
        processIds.map(async id => {
          try {
            const { ProcessService } = await import(
              '../procesos/ProcessService'
            );
            const process = await ProcessService.getById(id);
            return { id, nombre: process?.nombre || 'Proceso desconocido' };
          } catch {
            return { id, nombre: 'Proceso desconocido' };
          }
        })
      );

      // Build relations map with both status and percentage
      const relations = new Map<
        string,
        { status: ComplianceStatus; percentage: number }
      >();
      allRelations.forEach(rel => {
        const key = `${rel.norm_point_id}_${rel.process_id}`;
        relations.set(key, {
          status: rel.compliance_status,
          percentage: rel.compliance_percentage,
        });
      });

      return {
        norm_points: allNormPoints,
        processes,
        relations,
      };
    } catch (error) {
      console.error('Error getting compliance matrix:', error);
      throw new Error('Error al obtener matriz de cumplimiento');
    }
  }

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
      console.error('Error getting upcoming reviews:', error);
      throw new Error('Error al obtener revisiones próximas');
    }
  }

  static async getDashboardData() {
    try {
      const [stats, matrix, upcomingReviews] = await Promise.all([
        this.getComplianceStats(),
        this.getComplianceMatrix(),
        this.getUpcomingReviews(30),
      ]);

      // Get mandatory pending relations
      const allRelations = await this.getAll();
      const allNormPoints = await NormPointService.getAll();
      const mandatoryPoints = allNormPoints.filter(p => p.is_mandatory);
      const mandatoryPending = allRelations.filter(
        rel =>
          mandatoryPoints.some(p => p.id === rel.norm_point_id) &&
          rel.compliance_status === 'pendiente'
      );

      return {
        stats,
        matrix,
        upcomingReviews,
        mandatoryPending,
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw new Error('Error al obtener datos del dashboard');
    }
  }
}
