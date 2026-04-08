import { db } from '@/firebase/config';
import type {
  NewsErrorCode,
  Reaction,
  ReactionCreateData,
  ReactionType,
} from '@/types/news';
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { CommentService } from './CommentService';
import { PostService } from './PostService';

const COLLECTION_NAME = 'news_reactions';

export class ReactionService {
  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Toggle reacción (agregar si no existe, quitar si existe)
   */
  static async toggleReaction(
    targetType: 'post' | 'comment',
    targetId: string,
    userId: string,
    userName: string,
    type: ReactionType = 'like'
  ): Promise<{ reacted: boolean; count: number }> {
    try {
      // Verificar si el usuario ya reaccionó
      const existingReaction = await this.getUserReaction(
        targetType,
        targetId,
        userId
      );

      if (existingReaction) {
        // Si ya existe, eliminar la reacción
        await this.delete(existingReaction.id);

        // Decrementar contador
        if (targetType === 'post') {
          await PostService.decrementReactionCount(targetId);
        } else {
          await CommentService.decrementReactionCount(targetId);
        }

        // Obtener nuevo contador
        const newCount = await this.getReactionCount(targetType, targetId);

        return { reacted: false, count: newCount };
      } else {
        // Si no existe, crear la reacción
        const reactionData: ReactionCreateData = {
          targetType,
          targetId,
          userId,
          userName,
          type,
        };

        await this.create(reactionData);

        // Incrementar contador
        if (targetType === 'post') {
          await PostService.incrementReactionCount(targetId);
        } else {
          await CommentService.incrementReactionCount(targetId);
        }

        // Obtener nuevo contador
        const newCount = await this.getReactionCount(targetType, targetId);

        return { reacted: true, count: newCount };
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw this.handleError(
        error,
        'Error al procesar reacción',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Crear una reacción
   */
  private static async create(data: ReactionCreateData): Promise<string> {
    try {
      const reactionData: Omit<Reaction, 'id'> = {
        targetType: data.targetType,
        targetId: data.targetId,
        userId: data.userId,
        userName: data.userName,
        type: data.type,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(db, COLLECTION_NAME),
        reactionData
      );

      return docRef.id;
    } catch (error) {
      console.error('Error creating reaction:', error);
      throw this.handleError(
        error,
        'Error al crear reacción',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Eliminar una reacción
   */
  private static async delete(reactionId: string): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('__name__', '==', reactionId)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docToDelete = querySnapshot.docs[0];
        await deleteDoc(docToDelete.ref);
      }
    } catch (error) {
      console.error('Error deleting reaction:', error);
      throw this.handleError(
        error,
        'Error al eliminar reacción',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Obtener reacción de un usuario específico
   */
  static async getUserReaction(
    targetType: 'post' | 'comment',
    targetId: string,
    userId: string
  ): Promise<Reaction | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('targetType', '==', targetType),
        where('targetId', '==', targetId),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Reaction;
    } catch (error) {
      console.error('Error getting user reaction:', error);
      throw this.handleError(
        error,
        'Error al obtener reacción del usuario',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Verificar si un usuario reaccionó
   */
  static async hasUserReacted(
    targetType: 'post' | 'comment',
    targetId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const reaction = await this.getUserReaction(targetType, targetId, userId);
      return reaction !== null;
    } catch (error) {
      console.error('Error checking user reaction:', error);
      return false;
    }
  }

  /**
   * Obtener contador de reacciones
   */
  static async getReactionCount(
    targetType: 'post' | 'comment',
    targetId: string
  ): Promise<number> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('targetType', '==', targetType),
        where('targetId', '==', targetId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting reaction count:', error);
      return 0;
    }
  }

  /**
   * Obtener todas las reacciones de un target
   */
  static async getReactions(
    targetType: 'post' | 'comment',
    targetId: string
  ): Promise<Reaction[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('targetType', '==', targetType),
        where('targetId', '==', targetId)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Reaction[];
    } catch (error) {
      console.error('Error getting reactions:', error);
      throw this.handleError(
        error,
        'Error al obtener reacciones',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Eliminar todas las reacciones de un target
   * Útil cuando se elimina un post o comentario
   */
  static async deleteAllReactions(
    targetType: 'post' | 'comment',
    targetId: string
  ): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('targetType', '==', targetType),
        where('targetId', '==', targetId)
      );

      const querySnapshot = await getDocs(q);

      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all reactions:', error);
      throw this.handleError(
        error,
        'Error al eliminar todas las reacciones',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static handleError(
    error: unknown,
    message: string,
    code: NewsErrorCode
  ): Error {
    const NewsError = class extends Error {
      constructor(
        message: string,
        public code: NewsErrorCode,
        public details?: unknown
      ) {
        super(message);
        this.name = 'NewsError';
      }
    };

    return new NewsError(message, code, { originalError: error });
  }
}
