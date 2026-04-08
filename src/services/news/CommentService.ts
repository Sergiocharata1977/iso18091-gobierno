import { db } from '@/firebase/config';
import type {
  Comment,
  CommentCreateData,
  CommentUpdateData,
  NewsErrorCode,
} from '@/types/news';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { PostService } from './PostService';

const COLLECTION_NAME = 'news_comments';

export class CommentService {
  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Crear un nuevo comentario
   */
  static async create(data: CommentCreateData): Promise<string> {
    try {
      const now = Timestamp.now();

      const commentData: Omit<Comment, 'id'> = {
        postId: data.postId,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        authorPhotoURL: data.authorPhotoURL,
        isEdited: false,
        editedAt: null,
        reactionCount: 0,
        isModerated: false,
        moderatedBy: null,
        moderatedAt: null,
        moderationReason: null,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), commentData);

      // Incrementar contador de comentarios en el post
      await PostService.incrementCommentCount(data.postId);

      return docRef.id;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw this.handleError(
        error,
        'Error al crear comentario',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Obtener comentario por ID
   */
  static async getById(id: string): Promise<Comment | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Comment;
    } catch (error) {
      console.error('Error getting comment:', error);
      throw this.handleError(
        error,
        'Error al obtener comentario',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Obtener todos los comentarios de un post
   */
  static async getByPostId(postId: string): Promise<Comment[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('postId', '==', postId),
        where('isActive', '==', true),
        orderBy('createdAt', 'asc') // Orden cronológico
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
    } catch (error) {
      console.error('Error getting comments by post:', error);
      throw this.handleError(
        error,
        'Error al obtener comentarios',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Actualizar comentario (solo contenido)
   */
  static async update(id: string, data: CommentUpdateData): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      const updateData: Record<string, unknown> = {
        content: data.content,
        isEdited: true,
        editedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating comment:', error);
      throw this.handleError(
        error,
        'Error al actualizar comentario',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Eliminar comentario (soft delete)
   */
  static async delete(id: string): Promise<void> {
    try {
      // Obtener el comentario para saber a qué post pertenece
      const comment = await this.getById(id);
      if (!comment) {
        throw new Error('Comentario no encontrado');
      }

      const docRef = doc(db, COLLECTION_NAME, id);

      await updateDoc(docRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      // Decrementar contador de comentarios en el post
      await PostService.decrementCommentCount(comment.postId);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw this.handleError(
        error,
        'Error al eliminar comentario',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Eliminar comentario permanentemente (hard delete)
   * Solo para moderación
   */
  static async hardDelete(id: string): Promise<void> {
    try {
      // Obtener el comentario para saber a qué post pertenece
      const comment = await this.getById(id);
      if (!comment) {
        throw new Error('Comentario no encontrado');
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);

      // Decrementar contador de comentarios en el post
      await PostService.decrementCommentCount(comment.postId);
    } catch (error) {
      console.error('Error hard deleting comment:', error);
      throw this.handleError(
        error,
        'Error al eliminar permanentemente comentario',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  // ============================================
  // CONTADOR OPERATIONS
  // ============================================

  /**
   * Incrementar contador de reacciones
   */
  static async incrementReactionCount(commentId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, commentId);
      await updateDoc(docRef, {
        reactionCount: increment(1),
      });
    } catch (error) {
      console.error('Error incrementing reaction count:', error);
      throw this.handleError(
        error,
        'Error al actualizar contador de reacciones',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Decrementar contador de reacciones
   */
  static async decrementReactionCount(commentId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, commentId);
      await updateDoc(docRef, {
        reactionCount: increment(-1),
      });
    } catch (error) {
      console.error('Error decrementing reaction count:', error);
      throw this.handleError(
        error,
        'Error al actualizar contador de reacciones',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  // ============================================
  // MODERACIÓN
  // ============================================

  /**
   * Moderar comentario (marcar como moderado y eliminar)
   */
  static async moderate(
    commentId: string,
    moderatorId: string,
    reason: string
  ): Promise<void> {
    try {
      // Obtener el comentario para saber a qué post pertenece
      const comment = await this.getById(commentId);
      if (!comment) {
        throw new Error('Comentario no encontrado');
      }

      const docRef = doc(db, COLLECTION_NAME, commentId);

      await updateDoc(docRef, {
        isModerated: true,
        moderatedBy: moderatorId,
        moderatedAt: Timestamp.now(),
        moderationReason: reason,
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      // Decrementar contador de comentarios en el post
      await PostService.decrementCommentCount(comment.postId);
    } catch (error) {
      console.error('Error moderating comment:', error);
      throw this.handleError(
        error,
        'Error al moderar comentario',
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
