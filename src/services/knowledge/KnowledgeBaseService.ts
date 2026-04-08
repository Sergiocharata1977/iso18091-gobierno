// Service for Knowledge Base management

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  KnowledgeArticle,
  KnowledgeFilters,
  ImplementationPhase,
} from '@/types/knowledge';

const ARTICLES_COLLECTION = 'knowledge_articles';
const PHASES_COLLECTION = 'implementation_phases';

export class KnowledgeBaseService {
  /**
   * Get all articles with optional filters
   */
  static async getArticles(
    filters?: KnowledgeFilters
  ): Promise<KnowledgeArticle[]> {
    try {
      let q = query(
        collection(db, ARTICLES_COLLECTION),
        where('activo', '==', true),
        orderBy('created_at', 'desc')
      );

      if (filters?.categoria) {
        q = query(q, where('categoria', '==', filters.categoria));
      }

      if (filters?.nivel_implementacion) {
        q = query(
          q,
          where('nivel_implementacion', '==', filters.nivel_implementacion)
        );
      }

      if (filters?.clausula_iso) {
        q = query(q, where('clausula_iso', '==', filters.clausula_iso));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as KnowledgeArticle
      );
    } catch (error) {
      console.error('[KnowledgeBaseService] Error getting articles:', error);
      return [];
    }
  }

  /**
   * Get article by ID
   */
  static async getArticleById(id: string): Promise<KnowledgeArticle | null> {
    try {
      const docRef = doc(db, ARTICLES_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as KnowledgeArticle;
      }

      return null;
    } catch (error) {
      console.error('[KnowledgeBaseService] Error getting article:', error);
      return null;
    }
  }

  /**
   * Get implementation phases in order
   */
  static async getImplementationPhases(): Promise<ImplementationPhase[]> {
    try {
      const q = query(
        collection(db, PHASES_COLLECTION),
        orderBy('orden', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as ImplementationPhase
      );
    } catch (error) {
      console.error('[KnowledgeBaseService] Error getting phases:', error);
      return [];
    }
  }

  /**
   * Search articles by text
   */
  static async searchArticles(searchText: string): Promise<KnowledgeArticle[]> {
    try {
      // Firestore no tiene búsqueda full-text nativa
      // Esta es una implementación básica
      const articles = await this.getArticles();

      const searchLower = searchText.toLowerCase();
      return articles.filter(
        article =>
          article.titulo.toLowerCase().includes(searchLower) ||
          article.contenido.toLowerCase().includes(searchLower) ||
          article.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error('[KnowledgeBaseService] Error searching articles:', error);
      return [];
    }
  }

  /**
   * Create new article (admin only)
   */
  static async createArticle(
    article: Omit<KnowledgeArticle, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, ARTICLES_COLLECTION), {
        ...article,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('[KnowledgeBaseService] Error creating article:', error);
      throw error;
    }
  }

  /**
   * Update article (admin only)
   */
  static async updateArticle(
    id: string,
    updates: Partial<KnowledgeArticle>
  ): Promise<void> {
    try {
      const docRef = doc(db, ARTICLES_COLLECTION, id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('[KnowledgeBaseService] Error updating article:', error);
      throw error;
    }
  }
}
