/**
 * PostServiceAdmin - Servicio de posts usando Firebase Admin SDK
 *
 * Este servicio se usa en las rutas API del servidor (Next.js API routes)
 * porque el SDK cliente no tiene contexto de autenticación en el servidor.
 *
 * Firebase Admin SDK bypasa las reglas de seguridad de Firestore.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  NewsErrorCode,
  Post,
  PostCreateData,
  PostFilters,
} from '@/types/news';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'news_posts';

export class PostServiceAdmin {
  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Obtener todos los posts con paginación
   */
  static async getAll(
    page: number = 1,
    pageLimit: number = 10,
    filters?: PostFilters,
    organizationId?: string
  ): Promise<{ posts: Post[]; hasMore: boolean; total: number }> {
    try {
      const db = getAdminFirestore();

      // Construir query base
      let queryRef = db
        .collection(COLLECTION_NAME)
        .where('isActive', '==', true);

      // Filtro por organización si se proporciona
      if (organizationId) {
        queryRef = queryRef.where('organizationId', '==', organizationId);
      }

      // Filtro por autor
      if (filters?.authorId) {
        queryRef = queryRef.where('authorId', '==', filters.authorId);
      }

      // Ordenar por fecha descendente y limitar
      queryRef = queryRef.orderBy('createdAt', 'desc').limit(pageLimit + 1);

      const snapshot = await queryRef.get();

      let posts: Post[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];

      // Verificar si hay más resultados
      const hasMore = posts.length > pageLimit;
      if (hasMore) {
        posts = posts.slice(0, pageLimit);
      }

      // Filtro de búsqueda en memoria (si se proporciona)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        posts = posts.filter(post =>
          post.content.toLowerCase().includes(searchLower)
        );
      }

      // Obtener total
      let totalQuery = db
        .collection(COLLECTION_NAME)
        .where('isActive', '==', true);

      if (organizationId) {
        totalQuery = totalQuery.where('organizationId', '==', organizationId);
      }

      const totalSnapshot = await totalQuery.count().get();
      const total = totalSnapshot.data().count;

      return { posts, hasMore, total };
    } catch (error) {
      console.error('Error getting posts (Admin):', error);
      throw this.handleError(
        error,
        'Error al obtener publicaciones',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Obtener post por ID
   */
  static async getById(id: string): Promise<Post | null> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Post;
    } catch (error) {
      console.error('Error getting post (Admin):', error);
      throw this.handleError(
        error,
        'Error al obtener publicación',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Crear un nuevo post
   */
  static async create(data: PostCreateData): Promise<string> {
    try {
      const db = getAdminFirestore();
      const now = Timestamp.now();

      const postData = {
        content: data.content,
        images: data.images || [],
        attachments: data.attachments || [],
        authorId: data.authorId,
        authorName: data.authorName,
        authorPhotoURL: data.authorPhotoURL,
        organizationId: data.organizationId,
        isEdited: false,
        editedAt: null,
        commentCount: 0,
        reactionCount: 0,
        isModerated: false,
        moderatedBy: null,
        moderatedAt: null,
        moderationReason: null,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(postData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating post (Admin):', error);
      throw this.handleError(
        error,
        'Error al crear publicación',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Actualizar post
   */
  static async update(id: string, content: string): Promise<void> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(id);

      await docRef.update({
        content,
        isEdited: true,
        editedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating post (Admin):', error);
      throw this.handleError(
        error,
        'Error al actualizar publicación',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Eliminar post (soft delete)
   */
  static async delete(id: string): Promise<void> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(id);

      await docRef.update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting post (Admin):', error);
      throw this.handleError(
        error,
        'Error al eliminar publicación',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  // ============================================
  // CONTADOR OPERATIONS
  // ============================================

  /**
   * Incrementar contador de comentarios
   */
  static async incrementCommentCount(postId: string): Promise<void> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(postId);
      await docRef.update({
        commentCount: FieldValue.increment(1),
      });
    } catch (error) {
      console.error('Error incrementing comment count (Admin):', error);
      throw this.handleError(
        error,
        'Error al actualizar contador de comentarios',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Decrementar contador de comentarios
   */
  static async decrementCommentCount(postId: string): Promise<void> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(postId);
      await docRef.update({
        commentCount: FieldValue.increment(-1),
      });
    } catch (error) {
      console.error('Error decrementing comment count (Admin):', error);
      throw this.handleError(
        error,
        'Error al actualizar contador de comentarios',
        'DATABASE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Incrementar contador de reacciones
   */
  static async incrementReactionCount(postId: string): Promise<void> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(postId);
      await docRef.update({
        reactionCount: FieldValue.increment(1),
      });
    } catch (error) {
      console.error('Error incrementing reaction count (Admin):', error);
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
  static async decrementReactionCount(postId: string): Promise<void> {
    try {
      const db = getAdminFirestore();
      const docRef = db.collection(COLLECTION_NAME).doc(postId);
      await docRef.update({
        reactionCount: FieldValue.increment(-1),
      });
    } catch (error) {
      console.error('Error decrementing reaction count (Admin):', error);
      throw this.handleError(
        error,
        'Error al actualizar contador de reacciones',
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
