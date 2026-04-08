import { BaseService } from '../../base/BaseService';
import { Timestamp } from 'firebase-admin/firestore';
import type {
  Document,
  CreateDocumentInput,
  DocumentFilters,
  DocumentStats,
  DocumentVersion,
} from './types';
import {
  CreateDocumentSchema,
  UpdateDocumentSchema,
  CreateVersionSchema,
  UpdateStatusSchema,
  DocumentFiltersSchema,
} from './validations';

export class DocumentService extends BaseService<Document> {
  protected collectionName = 'documents';
  protected schema = CreateDocumentSchema;

  async createAndReturnId(
    data: CreateDocumentInput,
    userId: string
  ): Promise<string> {
    const validated = this.schema.parse(data);

    const initialVersion: DocumentVersion = {
      versionNumber: 1,
      content: validated.content,
      createdBy: userId,
      createdAt: Timestamp.now(),
      changesSummary: 'Versión inicial',
    };

    const documentData: Omit<Document, 'id'> = {
      ...validated,
      status: 'draft',
      currentVersion: 1,
      versions: [initialVersion],
      tags: validated.tags || [],
      isActive: true,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      deletedAt: null,
    };

    const docRef = await this.db
      .collection(this.collectionName)
      .add(documentData);
    return docRef.id;
  }

  async list(
    filters: DocumentFilters = {},
    options: any = {}
  ): Promise<Document[]> {
    try {
      DocumentFiltersSchema.parse(filters);

      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.createdBy) {
        query = query.where('createdBy', '==', filters.createdBy);
      }

      if (filters.dateFrom) {
        const fromDate =
          filters.dateFrom instanceof Date
            ? filters.dateFrom
            : new Date(filters.dateFrom);
        query = query.where('createdAt', '>=', Timestamp.fromDate(fromDate));
      }

      if (filters.dateTo) {
        const toDate =
          filters.dateTo instanceof Date
            ? filters.dateTo
            : new Date(filters.dateTo);
        query = query.where('createdAt', '<=', Timestamp.fromDate(toDate));
      }

      const limit = options.limit || 100;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      let documents = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Document
      );

      if (filters.tags && filters.tags.length > 0) {
        documents = documents.filter(doc =>
          filters.tags!.some(tag => doc.tags.includes(tag))
        );
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        documents = documents.filter(
          doc =>
            doc.title.toLowerCase().includes(searchLower) ||
            doc.description.toLowerCase().includes(searchLower) ||
            doc.content.toLowerCase().includes(searchLower)
        );
      }

      return documents;
    } catch (error) {
      console.error('Error listing documents', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Document | null> {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data?.deletedAt) {
        return null;
      }

      return { id: doc.id, ...data } as Document;
    } catch (error) {
      console.error(`Error getting document ${id}`, error);
      throw error;
    }
  }

  async createVersion(id: string, data: any, userId: string): Promise<void> {
    try {
      const validated = CreateVersionSchema.parse(data);
      const document = await this.getById(id);

      if (!document) {
        throw new Error(`Document ${id} not found`);
      }

      const newVersion: DocumentVersion = {
        versionNumber: document.currentVersion + 1,
        content: validated.content,
        createdBy: userId,
        createdAt: Timestamp.now(),
        changesSummary: validated.changesSummary,
      };

      const updatedVersions = [...document.versions, newVersion];

      await this.db.collection(this.collectionName).doc(id).update({
        currentVersion: newVersion.versionNumber,
        versions: updatedVersions,
        content: validated.content,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error(`Error creating version for document ${id}`, error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    newStatus: string,
    userId: string
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      };

      if (newStatus === 'published') {
        updateData.publishedAt = Timestamp.now();
        updateData.publishedBy = userId;
      }

      if (newStatus === 'approved') {
        updateData.approvedAt = Timestamp.now();
        updateData.approvedBy = userId;
      }

      await this.db.collection(this.collectionName).doc(id).update(updateData);
    } catch (error) {
      console.error(`Error updating status for document ${id}`, error);
      throw error;
    }
  }

  async getVersionHistory(id: string): Promise<DocumentVersion[]> {
    try {
      const document = await this.getById(id);

      if (!document) {
        throw new Error(`Document ${id} not found`);
      }

      return document.versions || [];
    } catch (error) {
      console.error(`Error getting version history for document ${id}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.collection(this.collectionName).doc(id).update({
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error deleting document ${id}`, error);
      throw error;
    }
  }

  async getStats(filters: any = {}): Promise<DocumentStats> {
    try {
      let query = this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null);

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      const snapshot = await query.get();
      const documents = snapshot.docs.map(doc => doc.data() as Document);

      const stats: DocumentStats = {
        total: documents.length,
        draft: documents.filter(d => d.status === 'draft').length,
        review: documents.filter(d => d.status === 'review').length,
        approved: documents.filter(d => d.status === 'approved').length,
        published: documents.filter(d => d.status === 'published').length,
        archived: documents.filter(d => d.status === 'archived').length,
        totalVersions: documents.reduce(
          (sum, d) => sum + (d.versions?.length || 0),
          0
        ),
        averageVersionsPerDocument:
          documents.length > 0
            ? Math.round(
                documents.reduce(
                  (sum, d) => sum + (d.versions?.length || 0),
                  0
                ) / documents.length
              )
            : 0,
      };

      return stats;
    } catch (error) {
      console.error('Error getting document stats', error);
      throw error;
    }
  }

  /**
   * Compartir documento con usuarios
   */
  async shareDocument(
    documentId: string,
    userIds: string[],
    permissions: 'view' | 'comment' | 'edit',
    sharedBy: string
  ): Promise<void> {
    try {
      const document = await this.getById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      const sharedWith = document.sharedWith || [];
      const newShares = userIds.map(userId => ({
        userId,
        permissions,
        sharedAt: Timestamp.now(),
        sharedBy,
      }));

      const updatedShares = [...sharedWith, ...newShares];

      await this.db.collection(this.collectionName).doc(documentId).update({
        sharedWith: updatedShares,
        updatedAt: Timestamp.now(),
        updatedBy: sharedBy,
      });
    } catch (error) {
      console.error(`Error sharing document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Revocar acceso a documento
   */
  async revokeDocumentAccess(
    documentId: string,
    userId: string,
    revokedBy: string
  ): Promise<void> {
    try {
      const document = await this.getById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      const updatedShares = (document.sharedWith || []).filter(
        share => share.userId !== userId
      );

      await this.db.collection(this.collectionName).doc(documentId).update({
        sharedWith: updatedShares,
        updatedAt: Timestamp.now(),
        updatedBy: revokedBy,
      });
    } catch (error) {
      console.error(`Error revoking access for document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Obtener documentos compartidos con usuario
   */
  async getSharedDocuments(userId: string): Promise<Document[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .get();

      const documents = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Document
      );

      return documents.filter(doc =>
        doc.sharedWith?.some(share => share.userId === userId)
      );
    } catch (error) {
      console.error(`Error getting shared documents for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Búsqueda full-text en documentos
   */
  async fullTextSearch(query: string, limit: number = 20): Promise<Document[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .get();

      const documents = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Document
      );
      const queryLower = query.toLowerCase();

      const scored = documents
        .map(doc => {
          let score = 0;

          // Búsqueda en título (peso 3)
          if (doc.title.toLowerCase().includes(queryLower)) {
            score += 3;
          }

          // Búsqueda en descripción (peso 2)
          if (doc.description.toLowerCase().includes(queryLower)) {
            score += 2;
          }

          // Búsqueda en contenido (peso 1)
          if (doc.content.toLowerCase().includes(queryLower)) {
            score += 1;
          }

          // Búsqueda en tags (peso 2)
          if (doc.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
            score += 2;
          }

          return { doc, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.doc);

      return scored;
    } catch (error) {
      console.error(
        `Error performing full-text search with query ${query}`,
        error
      );
      throw error;
    }
  }

  /**
   * Obtener documentos por categoría con estadísticas
   */
  async getByCategory(
    category: string
  ): Promise<{ documents: Document[]; stats: any }> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('category', '==', category)
        .where('deletedAt', '==', null)
        .get();

      const documents = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Document
      );

      const stats = {
        total: documents.length,
        byStatus: {
          draft: documents.filter(d => d.status === 'draft').length,
          review: documents.filter(d => d.status === 'review').length,
          approved: documents.filter(d => d.status === 'approved').length,
          published: documents.filter(d => d.status === 'published').length,
        },
        recentlyUpdated: documents
          .sort((a, b) => {
            const dateA =
              a.updatedAt instanceof Timestamp
                ? a.updatedAt.toDate()
                : new Date(a.updatedAt);
            const dateB =
              b.updatedAt instanceof Timestamp
                ? b.updatedAt.toDate()
                : new Date(b.updatedAt);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5),
      };

      return { documents, stats };
    } catch (error) {
      console.error(`Error getting documents by category ${category}`, error);
      throw error;
    }
  }

  /**
   * Obtener documentos recientes
   */
  async getRecentDocuments(limit: number = 10): Promise<Document[]> {
    try {
      // Query without orderBy to avoid composite index requirement
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .get();

      const documents = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Document
      );

      // Sort by updatedAt on the client side
      return documents
        .sort((a, b) => {
          const dateA =
            a.updatedAt instanceof Timestamp
              ? a.updatedAt.toDate()
              : new Date(a.updatedAt);
          const dateB =
            b.updatedAt instanceof Timestamp
              ? b.updatedAt.toDate()
              : new Date(b.updatedAt);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent documents', error);
      throw error;
    }
  }

  /**
   * Obtener documentos más vistos/accedidos
   */
  async getMostAccessedDocuments(limit: number = 10): Promise<Document[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .get();

      const documents = snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Document
      );

      return documents
        .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting most accessed documents', error);
      throw error;
    }
  }

  /**
   * Incrementar contador de acceso
   */
  async incrementAccessCount(documentId: string): Promise<void> {
    try {
      const document = await this.getById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      await this.db
        .collection(this.collectionName)
        .doc(documentId)
        .update({
          accessCount: (document.accessCount || 0) + 1,
          lastAccessedAt: Timestamp.now(),
        });
    } catch (error) {
      console.error(
        `Error incrementing access count for document ${documentId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Obtener documentos por rango de fechas
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<Document[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .where('createdAt', '>=', Timestamp.fromDate(startDate))
        .where('createdAt', '<=', Timestamp.fromDate(endDate))
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Document
      );
    } catch (error) {
      console.error('Error getting documents by date range', error);
      throw error;
    }
  }

  /**
   * Exportar documento a diferentes formatos
   */
  async exportDocument(
    documentId: string,
    format: 'json' | 'markdown' | 'html' | 'pdf'
  ): Promise<string> {
    try {
      const document = await this.getById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      switch (format) {
        case 'json':
          return JSON.stringify(document, null, 2);

        case 'markdown':
          return `# ${document.title}\n\n${document.description}\n\n${document.content}`;

        case 'html':
          return `
            <html>
              <head><title>${document.title}</title></head>
              <body>
                <h1>${document.title}</h1>
                <p>${document.description}</p>
                <div>${document.content}</div>
              </body>
            </html>
          `;

        case 'pdf':
          // PDF export would require a library like pdfkit
          return JSON.stringify({
            title: document.title,
            description: document.description,
            content: document.content,
            format: 'pdf',
          });

        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error(`Error exporting document ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Obtener documentos por autor
   */
  async getByAuthor(authorId: string): Promise<Document[]> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('createdBy', '==', authorId)
        .where('deletedAt', '==', null)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(
        doc => ({ id: doc.id, ...doc.data() }) as Document
      );
    } catch (error) {
      console.error(`Error getting documents by author ${authorId}`, error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas avanzadas de documentos
   */
  async getAdvancedStats(): Promise<any> {
    try {
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('deletedAt', '==', null)
        .get();

      const documents = snapshot.docs.map(doc => doc.data() as Document);

      const stats = {
        total: documents.length,
        byStatus: {
          draft: documents.filter(d => d.status === 'draft').length,
          review: documents.filter(d => d.status === 'review').length,
          approved: documents.filter(d => d.status === 'approved').length,
          published: documents.filter(d => d.status === 'published').length,
          archived: documents.filter(d => d.status === 'archived').length,
        },
        byCategory: documents.reduce(
          (acc, doc) => {
            acc[doc.category] = (acc[doc.category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        totalVersions: documents.reduce(
          (sum, d) => sum + (d.versions?.length || 0),
          0
        ),
        averageVersionsPerDocument:
          documents.length > 0
            ? Math.round(
                documents.reduce(
                  (sum, d) => sum + (d.versions?.length || 0),
                  0
                ) / documents.length
              )
            : 0,
        totalAccess: documents.reduce(
          (sum, d) => sum + (d.accessCount || 0),
          0
        ),
        averageAccessPerDocument:
          documents.length > 0
            ? Math.round(
                documents.reduce((sum, d) => sum + (d.accessCount || 0), 0) /
                  documents.length
              )
            : 0,
        mostAccessedDocument: documents.reduce((prev, current) =>
          (current.accessCount || 0) > (prev.accessCount || 0) ? current : prev
        ),
        recentlyUpdated: documents
          .sort((a, b) => {
            const dateA =
              a.updatedAt instanceof Timestamp
                ? a.updatedAt.toDate()
                : new Date(a.updatedAt);
            const dateB =
              b.updatedAt instanceof Timestamp
                ? b.updatedAt.toDate()
                : new Date(b.updatedAt);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5),
      };

      return stats;
    } catch (error) {
      console.error('Error getting advanced stats', error);
      throw error;
    }
  }
}
