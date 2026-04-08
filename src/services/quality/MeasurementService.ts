import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Measurement, MeasurementFormData } from '@/types/quality';
import { QualityIndicatorService } from './QualityIndicatorService';

const COLLECTION_NAME = 'measurements';

// Helper function to safely convert Firestore Timestamp to ISO string
const toISOString = (value: Record<string, unknown>): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return undefined;
};

export class MeasurementService {
  static async getAll(): Promise<Measurement[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: toISOString(data.created_at) || new Date().toISOString(),
          updated_at: toISOString(data.updated_at) || new Date().toISOString(),
          measurement_date: toISOString(data.measurement_date) || '',
          validation_date: toISOString(data.validation_date),
        };
      }) as Measurement[];
    } catch (error) {
      console.error('Error getting measurements:', error);
      throw new Error('Error al obtener mediciones');
    }
  }

  static async getById(id: string): Promise<Measurement | null> {
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
          measurement_date: toISOString(data.measurement_date) || '',
          validation_date: toISOString(data.validation_date),
        } as Measurement;
      }
      return null;
    } catch (error) {
      console.error('Error getting measurement:', error);
      throw new Error('Error al obtener medición');
    }
  }

  static async getByIndicator(indicatorId: string): Promise<Measurement[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('indicator_id', '==', indicatorId),
        orderBy('measurement_date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: toISOString(data.created_at) || new Date().toISOString(),
          updated_at: toISOString(data.updated_at) || new Date().toISOString(),
          measurement_date: toISOString(data.measurement_date) || '',
          validation_date: toISOString(data.validation_date),
        };
      }) as Measurement[];
    } catch (error) {
      console.error('Error getting measurements by indicator:', error);
      throw new Error('Error al obtener mediciones por indicador');
    }
  }

  static async getByObjective(objectiveId: string): Promise<Measurement[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('objective_id', '==', objectiveId),
        orderBy('measurement_date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: toISOString(data.created_at) || new Date().toISOString(),
          updated_at: toISOString(data.updated_at) || new Date().toISOString(),
          measurement_date: toISOString(data.measurement_date) || '',
          validation_date: toISOString(data.validation_date),
        };
      }) as Measurement[];
    } catch (error) {
      console.error('Error getting measurements by objective:', error);
      throw new Error('Error al obtener mediciones por objetivo');
    }
  }

  static async getByProcess(processId: string): Promise<Measurement[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('process_definition_id', '==', processId),
        orderBy('measurement_date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: toISOString(data.created_at) || new Date().toISOString(),
          updated_at: toISOString(data.updated_at) || new Date().toISOString(),
          measurement_date: toISOString(data.measurement_date) || '',
          validation_date: toISOString(data.validation_date),
        };
      }) as Measurement[];
    } catch (error) {
      console.error('Error getting measurements by process:', error);
      throw new Error('Error al obtener mediciones por proceso');
    }
  }

  static async create(data: MeasurementFormData): Promise<Measurement> {
    try {
      const now = Timestamp.now();
      const docData = {
        ...data,
        validation_status: 'pendiente' as const,
        organization_id: 'default', // TODO: Get from context
        created_by: 'system', // TODO: Get from auth
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

      // Update indicator's current value and trend
      if (data.indicator_id) {
        await QualityIndicatorService.updateCurrentValue(
          data.indicator_id,
          data.value
        );
      }

      return {
        id: docRef.id,
        ...docData,
        created_at: now.toDate().toISOString(),
        updated_at: now.toDate().toISOString(),
        measurement_date: data.measurement_date,
      } as Measurement;
    } catch (error) {
      console.error('Error creating measurement:', error);
      throw new Error('Error al crear medición');
    }
  }

  static async update(
    id: string,
    data: Partial<MeasurementFormData>
  ): Promise<Measurement> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        ...data,
        updated_at: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Medición no encontrada después de actualizar');
      }

      // Update indicator's current value if value changed
      if (data.value !== undefined && updated.indicator_id) {
        await QualityIndicatorService.updateCurrentValue(
          updated.indicator_id,
          data.value
        );
      }

      return updated;
    } catch (error) {
      console.error('Error updating measurement:', error);
      throw new Error('Error al actualizar medición');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting measurement:', error);
      throw new Error('Error al eliminar medición');
    }
  }

  static async validateMeasurement(
    id: string,
    validatedBy: string,
    notes?: string
  ): Promise<Measurement> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        validation_status: 'validado' as const,
        validated_by: validatedBy,
        validation_date: Timestamp.now(),
        validation_notes: notes,
        updated_at: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Medición no encontrada después de validar');
      }

      return updated;
    } catch (error) {
      console.error('Error validating measurement:', error);
      throw new Error('Error al validar medición');
    }
  }

  static async rejectMeasurement(
    id: string,
    validatedBy: string,
    notes?: string
  ): Promise<Measurement> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        validation_status: 'rechazado' as const,
        validated_by: validatedBy,
        validation_date: Timestamp.now(),
        validation_notes: notes,
        updated_at: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Medición no encontrada después de rechazar');
      }

      return updated;
    } catch (error) {
      console.error('Error rejecting measurement:', error);
      throw new Error('Error al rechazar medición');
    }
  }

  static async getRecentMeasurements(
    limitCount: number = 10
  ): Promise<Measurement[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('measurement_date', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: toISOString(data.created_at) || new Date().toISOString(),
          updated_at: toISOString(data.updated_at) || new Date().toISOString(),
          measurement_date: toISOString(data.measurement_date) || '',
          validation_date: toISOString(data.validation_date),
        };
      }) as Measurement[];
    } catch (error) {
      console.error('Error getting recent measurements:', error);
      throw new Error('Error al obtener mediciones recientes');
    }
  }
}
