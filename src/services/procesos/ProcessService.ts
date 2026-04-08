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
  startAfter,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { ProcessDefinition } from '@/types/procesos';

const COLLECTION_NAME = 'processDefinitions';

// Helper function to safely convert Firebase Timestamp to Date
const safeToDate = (timestamp: Record<string, unknown>): Date => {
  if (!timestamp) return new Date();

  // If it's already a Date object
  if (timestamp instanceof Date) return timestamp;

  // If it's a Firebase Timestamp
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // If it's a string, try to parse it
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  // If it's a number (Unix timestamp)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  // Default fallback
  return new Date();
};

export class ProcessService {
  static async getAll(): Promise<ProcessDefinition[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: safeToDate(doc.data().createdAt),
        updatedAt: safeToDate(doc.data().updatedAt),
      })) as ProcessDefinition[];
    } catch (error) {
      console.error('Error getting process definitions:', error);
      throw new Error('Error al obtener definiciones de procesos');
    }
  }

  static async getById(id: string): Promise<ProcessDefinition | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: safeToDate(docSnap.data().createdAt),
          updatedAt: safeToDate(docSnap.data().updatedAt),
        } as ProcessDefinition;
      }
      return null;
    } catch (error) {
      console.error('Error getting process definition:', error);
      throw new Error('Error al obtener definición de proceso');
    }
  }

  static async getFiltered(
    search?: string,
    estado?: 'activo' | 'inactivo',
    responsable?: string
  ): Promise<ProcessDefinition[]> {
    try {
      let q = query(collection(db, COLLECTION_NAME));

      // Aplicar filtros
      if (search) {
        q = query(
          q,
          where('nombre', '>=', search),
          where('nombre', '<=', search + '\uf8ff')
        );
      }

      if (estado) {
        q = query(q, where('estado', '==', estado));
      }

      if (responsable) {
        q = query(q, where('responsable', '==', responsable));
      }

      // Ordenar por fecha de creación descendente
      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: safeToDate(doc.data().createdAt),
        updatedAt: safeToDate(doc.data().updatedAt),
      })) as ProcessDefinition[];
    } catch (error) {
      console.error('Error getting filtered process definitions:', error);
      throw new Error('Error al obtener definiciones de procesos filtradas');
    }
  }

  static async create(
    data: Omit<ProcessDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProcessDefinition> {
    try {
      const now = Timestamp.now();
      const docData = {
        ...data,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

      return {
        id: docRef.id,
        ...data,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating process definition:', error);
      throw new Error('Error al crear definición de proceso');
    }
  }

  static async update(
    id: string,
    data: Partial<Omit<ProcessDefinition, 'id' | 'createdAt'>>
  ): Promise<ProcessDefinition> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error(
          'Definición de proceso no encontrada después de actualizar'
        );
      }

      return updated;
    } catch (error) {
      console.error('Error updating process definition:', error);
      throw new Error('Error al actualizar definición de proceso');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting process definition:', error);
      throw new Error('Error al eliminar definición de proceso');
    }
  }

  static async toggleEstado(id: string): Promise<ProcessDefinition> {
    try {
      const process = await this.getById(id);
      if (!process) {
        throw new Error('Definición de proceso no encontrada');
      }

      const newEstado = process.estado === 'activo' ? 'inactivo' : 'activo';
      return await this.update(id, { estado: newEstado });
    } catch (error) {
      console.error('Error toggling process definition estado:', error);
      throw new Error('Error al cambiar estado de la definición de proceso');
    }
  }
}
