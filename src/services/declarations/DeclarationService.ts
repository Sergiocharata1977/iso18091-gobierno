import { db } from '@/firebase/config';
import { TraceabilityService } from '@/services/shared/TraceabilityService';
import type {
  Declaration,
  DeclarationFormData,
  DeclarationReviewData,
} from '@/types/declarations';
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

const COLLECTION_NAME = 'declarations';

export class DeclarationService {
  // ============================================
  // CREATE DECLARATION
  // ============================================
  static async create(data: DeclarationFormData): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const declarationNumber = await TraceabilityService.generateNumber(
        'DEC',
        year
      );

      const now = Timestamp.now();

      const declarationData: Omit<Declaration, 'id'> = {
        declarationNumber,
        employeeName: data.employeeName,
        employeeEmail: data.employeeEmail,
        category: data.category,
        title: data.title,
        description: data.description,
        status: 'pending',
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      };

      const docRef = await addDoc(
        collection(db, COLLECTION_NAME),
        declarationData
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating declaration:', error);
      throw new Error('Error al crear la declaración');
    }
  }

  // ============================================
  // GET DECLARATION BY ID
  // ============================================
  static async getById(id: string): Promise<Declaration | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Declaration;
    } catch (error) {
      console.error('Error getting declaration:', error);
      throw new Error('Error al obtener la declaración');
    }
  }

  // ============================================
  // LIST DECLARATIONS
  // ============================================
  static async list(status?: string): Promise<Declaration[]> {
    try {
      let q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      if (status) {
        q = query(
          collection(db, COLLECTION_NAME),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Declaration
      );
    } catch (error) {
      console.error('Error listing declarations:', error);
      throw new Error('Error al listar declaraciones');
    }
  }

  // ============================================
  // REVIEW DECLARATION
  // ============================================
  static async review(
    id: string,
    data: DeclarationReviewData,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'reviewed',
        reviewedBy: userId,
        reviewedByName: userName,
        reviewedAt: Timestamp.now().toDate(),
        reviewNotes: data.reviewNotes,
        updatedAt: Timestamp.now().toDate(),
      });
    } catch (error) {
      console.error('Error reviewing declaration:', error);
      throw new Error('Error al revisar la declaración');
    }
  }

  // ============================================
  // CLOSE DECLARATION
  // ============================================
  static async close(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'closed',
        updatedAt: Timestamp.now().toDate(),
      });
    } catch (error) {
      console.error('Error closing declaration:', error);
      throw new Error('Error al cerrar la declaración');
    }
  }

  // ============================================
  // LINK FINDING
  // ============================================
  static async linkFinding(
    declarationId: string,
    findingId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, declarationId);
      await updateDoc(docRef, {
        findingId,
        updatedAt: Timestamp.now().toDate(),
      });
    } catch (error) {
      console.error('Error linking finding:', error);
      throw new Error('Error al vincular hallazgo');
    }
  }

  // ============================================
  // DELETE DECLARATION
  // ============================================
  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting declaration:', error);
      throw new Error('Error al eliminar la declaración');
    }
  }
}
