import { db } from '@/firebase/config';
import { QualityObjective, QualityObjectiveFormData } from '@/types/quality';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'quality_objectives';

// Helper function to safely convert Firestore Timestamp to ISO string
const toISOString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const obj = value as { toDate?: () => Date };
    if (typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
    }
  }
  if (value instanceof Date) return value.toISOString();
  return undefined;
};

export class QualityObjectiveService {
  static async getAll(): Promise<QualityObjective[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: toISOString(data.created_at) || new Date().toISOString(),
          updated_at: toISOString(data.updated_at) || new Date().toISOString(),
          start_date: toISOString(data.start_date) || '',
          due_date: toISOString(data.due_date) || '',
          completed_date: toISOString(data.completed_date),
          last_alert_sent: toISOString(data.last_alert_sent),
        };
      }) as QualityObjective[];
    } catch (error) {
      console.error('Error getting quality objectives:', error);
      throw new Error('Error al obtener objetivos de calidad');
    }
  }

  static async getById(id: string): Promise<QualityObjective | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          created_at: toISOString(data.created_at) || new Date().toISOString(),
          updated_at: toISOString(data.updated_at) || new Date().toISOString(),
          start_date: toISOString(data.start_date) || '',
          due_date: toISOString(data.due_date) || '',
          completed_date: toISOString(data.completed_date),
          last_alert_sent: toISOString(data.last_alert_sent),
        } as QualityObjective;
      }
      return null;
    } catch (error) {
      console.error('Error getting quality objective:', error);
      throw new Error('Error al obtener objetivo de calidad');
    }
  }

  static async getByProcess(processId: string): Promise<QualityObjective[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('process_definition_id', '==', processId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: toISOString(data.created_at) || new Date().toISOString(),
          updated_at: toISOString(data.updated_at) || new Date().toISOString(),
          start_date: toISOString(data.start_date) || '',
          due_date: toISOString(data.due_date) || '',
          completed_date: toISOString(data.completed_date),
          last_alert_sent: toISOString(data.last_alert_sent),
        };
      }) as QualityObjective[];
    } catch (error) {
      console.error('Error getting quality objectives by process:', error);
      throw new Error('Error al obtener objetivos de calidad por proceso');
    }
  }

  static async create(
    data: QualityObjectiveFormData
  ): Promise<QualityObjective> {
    try {
      const now = Timestamp.now();
      const docData = {
        ...data,
        status: 'activo' as const,
        progress_percentage: 0,
        current_value: data.current_value || data.baseline_value,
        is_active: true,
        organization_id: 'default', // TODO: Get from context
        created_by: 'system', // TODO: Get from auth
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

      return {
        id: docRef.id,
        ...docData,
        created_at: now.toDate().toISOString(),
        updated_at: now.toDate().toISOString(),
        start_date: data.start_date,
        due_date: data.due_date,
      } as QualityObjective;
    } catch (error) {
      console.error('Error creating quality objective:', error);
      throw new Error('Error al crear objetivo de calidad');
    }
  }

  static async update(
    id: string,
    data: Partial<QualityObjectiveFormData>
  ): Promise<QualityObjective> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        ...data,
        updated_at: Timestamp.now(),
        updated_by: 'system', // TODO: Get from auth
      };

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error(
          'Objetivo de calidad no encontrado después de actualizar'
        );
      }

      return updated;
    } catch (error) {
      console.error('Error updating quality objective:', error);
      throw new Error('Error al actualizar objetivo de calidad');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        is_active: false,
        updated_at: Timestamp.now(),
        updated_by: 'system', // TODO: Get from auth
      });
      // Note: Soft delete instead of hard delete
    } catch (error) {
      console.error('Error deleting quality objective:', error);
      throw new Error('Error al eliminar objetivo de calidad');
    }
  }

  static async calculateProgress(objectiveId: string): Promise<number> {
    try {
      const objective = await this.getById(objectiveId);
      if (!objective) {
        throw new Error('Objetivo de calidad no encontrado');
      }

      const targetValue = objective.target_value;
      const currentValue = objective.current_value;
      const baselineValue = objective.baseline_value;

      if (targetValue === baselineValue) {
        return currentValue >= targetValue ? 100 : 0;
      }

      const progress =
        ((currentValue - baselineValue) / (targetValue - baselineValue)) * 100;
      return Math.min(Math.max(progress, 0), 100);
    } catch (error) {
      console.error('Error calculating progress:', error);
      throw new Error('Error al calcular progreso del objetivo');
    }
  }

  static async updateProgress(id: string): Promise<QualityObjective> {
    try {
      const progress = await this.calculateProgress(id);
      const status =
        progress >= 100 ? ('completado' as const) : ('activo' as const);

      const updateData: any = {
        progress_percentage: progress,
      };

      const updated = await this.update(id, updateData);

      // Update status if completed
      if (status === 'completado' && updated.status !== 'completado') {
        await updateDoc(doc(db, COLLECTION_NAME, id), {
          status: 'completado',
          completed_date: Timestamp.now(),
          updated_at: Timestamp.now(),
        });
      }

      return { ...updated, status, progress_percentage: progress };
    } catch (error) {
      console.error('Error updating progress:', error);
      throw new Error('Error al actualizar progreso del objetivo');
    }
  }
}
