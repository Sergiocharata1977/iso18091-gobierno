import { db } from '@/firebase/config';
import { ProcessRecord } from '@/types/procesos';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'processRecords';

export class ProcessRecordService {
  static async getByProcessId(processId: string): Promise<ProcessRecord[]> {
    try {
      // Simple query without orderBy to avoid index requirement
      const q = query(
        collection(db, COLLECTION_NAME),
        where('processId', '==', processId)
      );
      const querySnapshot = await getDocs(q);

      // Sort in memory instead
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        fecha_vencimiento: doc.data().fecha_vencimiento?.toDate() || new Date(),
      })) as ProcessRecord[];

      // Sort by createdAt descending in memory
      return records.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (error) {
      console.error('Error getting process records:', error);
      // Don't throw, just return empty array to avoid breaking the context loading
      return [];
    }
  }

  static async getById(id: string): Promise<ProcessRecord | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
          fecha_vencimiento:
            docSnap.data().fecha_vencimiento?.toDate() || new Date(),
        } as ProcessRecord;
      }
      return null;
    } catch (error) {
      console.error('Error getting process record:', error);
      throw new Error('Error al obtener registro de proceso');
    }
  }

  static async getFiltered(
    processId: string,
    search?: string,
    estado?: 'pendiente' | 'en-progreso' | 'completado',
    prioridad?: 'baja' | 'media' | 'alta'
  ): Promise<ProcessRecord[]> {
    try {
      let q = query(
        collection(db, COLLECTION_NAME),
        where('processId', '==', processId)
      );

      // Aplicar filtros
      if (estado) {
        q = query(q, where('estado', '==', estado));
      }

      if (prioridad) {
        q = query(q, where('prioridad', '==', prioridad));
      }

      // Ordenar por fecha de creación descendente
      q = query(q, orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      let records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        fecha_vencimiento: doc.data().fecha_vencimiento?.toDate() || new Date(),
      })) as ProcessRecord[];

      // Filtrar por búsqueda en memoria (título, descripción, responsable)
      if (search) {
        const searchLower = search.toLowerCase();
        records = records.filter(
          record =>
            record.titulo.toLowerCase().includes(searchLower) ||
            record.descripcion.toLowerCase().includes(searchLower) ||
            record.responsable.toLowerCase().includes(searchLower)
        );
      }

      return records;
    } catch (error) {
      console.error('Error getting filtered process records:', error);
      throw new Error('Error al obtener registros de proceso filtrados');
    }
  }

  static async create(
    data: Omit<ProcessRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProcessRecord> {
    try {
      const now = Timestamp.now();
      const docData = {
        ...data,
        createdAt: now,
        updatedAt: now,
        fecha_vencimiento: Timestamp.fromDate(data.fecha_vencimiento),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

      return {
        id: docRef.id,
        ...data,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating process record:', error);
      throw new Error('Error al crear registro de proceso');
    }
  }

  static async update(
    id: string,
    data: Partial<Omit<ProcessRecord, 'id' | 'createdAt'>>
  ): Promise<ProcessRecord> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: any = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      // Convertir fecha_vencimiento si está presente
      if (data.fecha_vencimiento) {
        updateData.fecha_vencimiento = Timestamp.fromDate(
          data.fecha_vencimiento
        );
      }

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error(
          'Registro de proceso no encontrado después de actualizar'
        );
      }

      return updated;
    } catch (error) {
      console.error('Error updating process record:', error);
      throw new Error('Error al actualizar registro de proceso');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting process record:', error);
      throw new Error('Error al eliminar registro de proceso');
    }
  }

  static async moveToState(
    id: string,
    newEstado: 'pendiente' | 'en-progreso' | 'completado'
  ): Promise<ProcessRecord> {
    try {
      return await this.update(id, { estado: newEstado });
    } catch (error) {
      console.error('Error moving process record to new state:', error);
      throw new Error('Error al mover registro de proceso a nuevo estado');
    }
  }
}
