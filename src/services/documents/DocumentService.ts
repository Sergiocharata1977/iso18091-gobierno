import { db } from '@/firebase/config';
import { getAdminStorage } from '@/lib/firebase/admin';
import { EventPublisher } from '@/services/calendar/EventPublisher';
import {
  Document,
  DocumentCreateData,
  DocumentFilters,
  DocumentFormData,
  DocumentStats,
  DocumentStatus,
  DocumentType,
  DocumentVersion,
  PaginatedResponse,
  PaginationParams,
} from '@/types/documents';
import { randomUUID } from 'crypto';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'documents';

export class DocumentService {
  // ============================================
  // CRUD OPERATIONS
  // ============================================

  static async getAll(organizationId: string): Promise<Document[]> {
    try {
      // Por defecto, no mostrar documentos archivados
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organization_id', '==', organizationId),
        where('is_archived', '==', false)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effective_date: doc.data().effective_date?.toDate(),
        review_date: doc.data().review_date?.toDate(),
        approved_at: doc.data().approved_at?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Document[];
    } catch (error) {
      console.error('Error getting documents:', error);
      throw new Error('Error al obtener documentos');
    }
  }

  static async getById(id: string): Promise<Document | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          effective_date: docSnap.data().effective_date?.toDate(),
          review_date: docSnap.data().review_date?.toDate(),
          approved_at: docSnap.data().approved_at?.toDate(),
          created_at: docSnap.data().created_at?.toDate() || new Date(),
          updated_at: docSnap.data().updated_at?.toDate() || new Date(),
        } as Document;
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw new Error('Error al obtener documento');
    }
  }

  static async getPaginated(
    organizationId: string,
    filters: DocumentFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Document>> {
    try {
      // Obtener documentos de la organización
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organization_id', '==', organizationId)
      );
      const querySnapshot = await getDocs(q);

      let allDocs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effective_date: doc.data().effective_date?.toDate(),
        review_date: doc.data().review_date?.toDate(),
        approved_at: doc.data().approved_at?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Document[];

      // Filtrar en memoria
      allDocs = allDocs.filter(doc => {
        // Por defecto, excluir archivados
        if (filters.is_archived !== undefined) {
          if (doc.is_archived !== filters.is_archived) return false;
        } else {
          if (doc.is_archived) return false;
        }

        // Filtros adicionales
        if (filters.type && doc.type !== filters.type) return false;
        if (filters.status && doc.status !== filters.status) return false;
        if (
          filters.responsible_user_id &&
          doc.responsible_user_id !== filters.responsible_user_id
        )
          return false;
        if (filters.process_id && doc.process_id !== filters.process_id)
          return false;

        return true;
      });

      // Ordenar en memoria
      const sortField = pagination.sort || 'created_at';
      const sortOrder = pagination.order === 'asc' ? 'asc' : 'desc';

      allDocs.sort((a, b) => {
        const aVal = (a as any)[sortField];
        const bVal = (b as any)[sortField];

        if (aVal instanceof Date && bVal instanceof Date) {
          return sortOrder === 'asc'
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return 0;
      });

      const total = allDocs.length;

      // Aplicar paginación
      const offset = (pagination.page - 1) * pagination.limit;
      const data = allDocs.slice(offset, offset + pagination.limit);

      return {
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
          hasNext: offset + pagination.limit < total,
          hasPrev: pagination.page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting paginated documents:', error);
      throw new Error('Error al obtener documentos paginados');
    }
  }

  static async create(data: DocumentCreateData): Promise<Document> {
    try {
      const now = Timestamp.now();

      // Generate code
      const code = await this.generateCode(data.organization_id, data.type);

      const docData = {
        ...data,
        code,
        download_count: 0,
        is_archived: false,
        reference_count: 0, // Document Integration Service
        is_orphan: true, // Document Integration Service
        effective_date: data.effective_date
          ? Timestamp.fromDate(data.effective_date)
          : null,
        review_date: data.review_date
          ? Timestamp.fromDate(data.review_date)
          : null,
        approved_at: data.approved_at
          ? Timestamp.fromDate(data.approved_at)
          : null,
        created_at: now,
        updated_at: now,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

      // Publicar evento de calendario si tiene review_date (no bloquear si falla)
      if (data.review_date) {
        try {
          const priority = this.getExpiryPriority(data.review_date);
          await EventPublisher.publishEvent('documents', {
            title: `Revisión de documento: ${data.title}`,
            description: `Documento ${code} - ${data.type}`,
            date: data.review_date,
            endDate: null,
            type: 'document_expiry',
            sourceRecordId: docRef.id,
            sourceRecordType: 'document',
            sourceRecordNumber: code,
            responsibleUserId: data.responsible_user_id || null,
            responsibleUserName: null,
            participantIds: null,
            priority,
            processId: data.process_id || null,
            processName: null,
            metadata: {
              documentType: data.type,
              documentCode: code,
            },
          });
        } catch (calendarError) {
          console.error('Error publishing calendar event:', calendarError);
          // No fallar la creación de documento si falla el calendario
        }
      }

      return {
        id: docRef.id,
        ...data,
        code,
        download_count: 0,
        is_archived: false,
        reference_count: 0, // Document Integration Service
        is_orphan: true, // Document Integration Service
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error('Error al crear documento');
    }
  }

  static async update(
    id: string,
    data: Partial<DocumentFormData>
  ): Promise<Document> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      // Build update object with proper types
      const updateData: Record<
        string,
        Timestamp | string | number | boolean | string[] | null
      > = {
        updated_at: Timestamp.now(),
      };

      // Copy non-date fields
      Object.keys(data).forEach(key => {
        const value = (data as Record<string, unknown>)[key];
        if (
          value !== undefined &&
          key !== 'effective_date' &&
          key !== 'review_date' &&
          key !== 'approved_at'
        ) {
          updateData[key] = value as
            | string
            | number
            | boolean
            | string[]
            | null;
        }
      });

      // Convert dates
      if (data.effective_date) {
        updateData.effective_date = Timestamp.fromDate(data.effective_date);
      }
      if (data.review_date) {
        updateData.review_date = Timestamp.fromDate(data.review_date);
      }
      if (data.approved_at) {
        updateData.approved_at = Timestamp.fromDate(data.approved_at);
      }

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Documento no encontrado después de actualizar');
      }

      // Actualizar evento de calendario si cambió review_date (no bloquear si falla)
      if (data.review_date) {
        try {
          const priority = this.getExpiryPriority(data.review_date);
          const eventUpdateData: Record<string, unknown> = {
            date: data.review_date,
            priority,
          };

          if (data.title) {
            eventUpdateData.title = `Revisión de documento: ${data.title}`;
          }

          if (data.responsible_user_id !== undefined) {
            eventUpdateData.responsibleUserId = data.responsible_user_id;
          }

          await EventPublisher.updatePublishedEvent(
            'documents',
            id,
            eventUpdateData
          );
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError);
          // No fallar la actualización de documento si falla el calendario
        }
      }

      return updated;
    } catch (error) {
      console.error('Error updating document:', error);
      throw new Error('Error al actualizar documento');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);

      // Eliminar evento de calendario (no bloquear si falla)
      try {
        await EventPublisher.deletePublishedEvent('documents', id);
      } catch (calendarError) {
        console.error('Error deleting calendar event:', calendarError);
        // No fallar la eliminación de documento si falla el calendario
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Error al eliminar documento');
    }
  }

  static async archive(id: string): Promise<Document> {
    try {
      console.log('[Service] Archivando documento:', id);

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        is_archived: true,
        updated_at: Timestamp.now(),
      });

      console.log('[Service] Documento marcado como archivado');

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Documento no encontrado después de archivar');
      }

      console.log('[Service] Documento archivado exitosamente:', updated.id);
      return updated;
    } catch (error) {
      console.error('[Service] Error archiving document:', error);
      if (error instanceof Error) {
        console.error('[Service] Error message:', error.message);
        throw error;
      }
      throw new Error('Error al archivar documento');
    }
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  static async changeStatus(
    id: string,
    newStatus: DocumentStatus,
    userId: string
  ): Promise<Document> {
    try {
      const document = await this.getById(id);
      if (!document) {
        throw new Error('Documento no encontrado');
      }

      // Validate status transition
      this.validateStatusTransition(document.status, newStatus);

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: newStatus,
        updated_by: userId,
        updated_at: Timestamp.now(),
      });

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Documento no encontrado después de actualizar');
      }

      return updated;
    } catch (error) {
      console.error('Error changing document status:', error);
      throw error;
    }
  }

  static async approve(id: string, userId: string): Promise<Document> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'aprobado',
        approved_by: userId,
        approved_at: Timestamp.now(),
        updated_by: userId,
        updated_at: Timestamp.now(),
      });

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Documento no encontrado después de aprobar');
      }

      return updated;
    } catch (error) {
      console.error('Error approving document:', error);
      throw new Error('Error al aprobar documento');
    }
  }

  static async publish(id: string, effectiveDate: Date): Promise<Document> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'publicado',
        effective_date: Timestamp.fromDate(effectiveDate),
        updated_at: Timestamp.now(),
      });

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Documento no encontrado después de publicar');
      }

      return updated;
    } catch (error) {
      console.error('Error publishing document:', error);
      throw new Error('Error al publicar documento');
    }
  }

  static async markObsolete(id: string): Promise<Document> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'obsoleto',
        updated_at: Timestamp.now(),
      });

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Documento no encontrado después de marcar obsoleto');
      }

      return updated;
    } catch (error) {
      console.error('Error marking document obsolete:', error);
      throw new Error('Error al marcar documento como obsoleto');
    }
  }

  private static validateStatusTransition(
    currentStatus: DocumentStatus,
    newStatus: DocumentStatus
  ): void {
    const validTransitions: Record<DocumentStatus, DocumentStatus[]> = {
      borrador: ['en_revision'],
      en_revision: ['borrador', 'aprobado'],
      aprobado: ['en_revision', 'publicado'],
      publicado: ['obsoleto'],
      obsoleto: [],
    };

    const allowed = validTransitions[currentStatus];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Transición de estado inválida: ${currentStatus} → ${newStatus}`
      );
    }
  }

  // ============================================
  // VERSION MANAGEMENT
  // ============================================

  static async createVersion(
    id: string,
    changeReason: string,
    userId: string
  ): Promise<Document> {
    try {
      const document = await this.getById(id);
      if (!document) {
        throw new Error('Documento no encontrado');
      }

      // Save current version to history
      const versionData = {
        document_id: id,
        version: document.version,
        change_reason: changeReason,
        changed_by: userId,
        changed_at: Timestamp.now(),
        snapshot: {
          ...document,
          created_at: undefined,
          updated_at: undefined,
        },
      };

      await addDoc(collection(db, 'documentVersions'), versionData);

      // Increment version
      const [major, minor] = document.version.split('.').map(Number);
      const newVersion = `${major}.${minor + 1}`;

      // Update document
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        version: newVersion,
        updated_by: userId,
        updated_at: Timestamp.now(),
      });

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Documento no encontrado después de crear versión');
      }

      return updated;
    } catch (error) {
      console.error('Error creating document version:', error);
      throw new Error('Error al crear versión del documento');
    }
  }

  static async getVersionHistory(
    documentId: string
  ): Promise<DocumentVersion[]> {
    try {
      const q = query(
        collection(db, 'documentVersions'),
        where('document_id', '==', documentId),
        orderBy('changed_at', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        document_id: doc.data().document_id,
        version: doc.data().version,
        change_reason: doc.data().change_reason,
        changed_by: doc.data().changed_by,
        changed_at: doc.data().changed_at?.toDate() || new Date(),
        snapshot: doc.data().snapshot || {},
      })) as DocumentVersion[];
    } catch (error) {
      console.error('Error getting version history:', error);
      throw new Error('Error al obtener historial de versiones');
    }
  }

  static async getVersion(versionId: string): Promise<DocumentVersion | null> {
    try {
      const docRef = doc(db, 'documentVersions', versionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          document_id: docSnap.data().document_id,
          version: docSnap.data().version,
          change_reason: docSnap.data().change_reason,
          changed_by: docSnap.data().changed_by,
          changed_at: docSnap.data().changed_at?.toDate() || new Date(),
          snapshot: docSnap.data().snapshot || {},
        } as DocumentVersion;
      }
      return null;
    } catch (error) {
      console.error('Error getting version:', error);
      throw new Error('Error al obtener versión');
    }
  }

  static async restoreVersion(
    documentId: string,
    versionId: string,
    userId: string
  ): Promise<Document> {
    try {
      const version = await this.getVersion(versionId);
      if (!version || !version.snapshot) {
        throw new Error('Versión no encontrada');
      }

      // Create new version with current state before restoring
      await this.createVersion(
        documentId,
        `Restauración desde versión ${version.version}`,
        userId
      );

      // Restore from snapshot
      const docRef = doc(db, COLLECTION_NAME, documentId);
      const snapshot = version.snapshot as Partial<Document>;

      const restoreData: Record<
        string,
        Timestamp | string | number | boolean | string[] | Date | null
      > = {
        ...snapshot,
        updated_by: userId,
        updated_at: Timestamp.now(),
      };

      // Remove undefined values
      Object.keys(restoreData).forEach(key => {
        if (restoreData[key] === undefined) {
          delete restoreData[key];
        }
      });

      await updateDoc(docRef, restoreData);

      const updated = await this.getById(documentId);
      if (!updated) {
        throw new Error('Documento no encontrado después de restaurar');
      }

      return updated;
    } catch (error) {
      console.error('Error restoring version:', error);
      throw new Error('Error al restaurar versión');
    }
  }

  // ============================================
  // FILE MANAGEMENT
  // ============================================

  static getStorageBucket() {
    return getAdminStorage().bucket();
  }

  static buildDownloadURL(bucketName: string, filePath: string, token: string) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      filePath
    )}?alt=media&token=${token}`;
  }

  static sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  static async uploadFile(
    documentId: string,
    file: File,
    userId: string
  ): Promise<string> {
    try {
      console.log('[Service] Iniciando upload de archivo:', {
        documentId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
      ];

      if (!allowedTypes.includes(file.type)) {
        console.error('[Service] Tipo de archivo no permitido:', file.type);
        throw new Error('Tipo de archivo no permitido');
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        console.error('[Service] Archivo excede tamaño máximo:', file.size);
        throw new Error('El archivo excede el tamaño máximo de 10MB');
      }

      console.log(
        '[Service] Validaciones pasadas, importando Firebase Storage...'
      );

      const bucket = this.getStorageBucket();
      const bucketName = bucket.name;
      const sanitizedName = this.sanitizeFileName(file.name);
      const fileName = `documents/${documentId}/${Date.now()}_${sanitizedName}`;
      const fileRef = bucket.file(fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      const downloadToken = randomUUID();

      console.log(
        '[Service] Firebase Storage importado, creando referencia...'
      );

      console.log('[Service] Subiendo archivo a Storage:', fileName);
      await fileRef.save(buffer, {
        resumable: false,
        metadata: {
          contentType: file.type,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
            uploadedBy: userId,
          },
        },
      });

      console.log('[Service] Archivo subido, generando URL segura...');
      const downloadURL = this.buildDownloadURL(
        bucketName,
        fileName,
        downloadToken
      );

      console.log(
        '[Service] URL obtenida, actualizando documento en Firestore...'
      );

      // Update document with file info including download URL
      const docRef = doc(db, COLLECTION_NAME, documentId);
      await updateDoc(docRef, {
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        download_url: downloadURL, // Guardar URL para mejor performance
        updated_by: userId,
        updated_at: Timestamp.now(),
      });

      console.log('[Service] Documento actualizado exitosamente');
      return downloadURL;
    } catch (error) {
      console.error('[Service] Error completo al subir archivo:', error);
      if (error instanceof Error) {
        console.error('[Service] Error message:', error.message);
        console.error('[Service] Error stack:', error.stack);
      }
      throw error;
    }
  }

  static async downloadFile(
    documentId: string,
    _userId: string
  ): Promise<string> {
    try {
      const document = await this.getById(documentId);
      if (!document || !document.file_path) {
        throw new Error('Archivo no encontrado');
      }

      if (document.download_url) {
        // Incrementar descargas y devolver URL cacheada
        const docRef = doc(db, COLLECTION_NAME, documentId);
        await updateDoc(docRef, {
          download_count: document.download_count + 1,
          updated_at: Timestamp.now(),
        });
        return document.download_url;
      }

      // Increment download count
      const docRef = doc(db, COLLECTION_NAME, documentId);
      await updateDoc(docRef, {
        download_count: document.download_count + 1,
        updated_at: Timestamp.now(),
      });

      const bucket = this.getStorageBucket();
      const fileRef = bucket.file(document.file_path);
      const [metadata] = await fileRef.getMetadata();
      let token =
        metadata.metadata?.firebaseStorageDownloadTokens ||
        metadata.metadata?.firebaseStorageDownloadToken;

      if (!token) {
        token = randomUUID();
        await fileRef.setMetadata({
          metadata: {
            ...(metadata.metadata || {}),
            firebaseStorageDownloadTokens: token,
          },
        });
      }

      const downloadURL = this.buildDownloadURL(
        bucket.name,
        document.file_path,
        String(token)
      );

      await updateDoc(docRef, {
        download_url: downloadURL,
      });

      return downloadURL;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Error al descargar archivo');
    }
  }

  static async deleteFile(documentId: string): Promise<void> {
    try {
      const document = await this.getById(documentId);
      if (!document || !document.file_path) {
        return;
      }

      const bucket = this.getStorageBucket();
      const fileRef = bucket.file(document.file_path);
      await fileRef.delete({ ignoreNotFound: true });

      // Update document
      const docRef = doc(db, COLLECTION_NAME, documentId);
      await updateDoc(docRef, {
        file_path: null,
        file_size: null,
        mime_type: null,
        download_url: null,
        updated_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Error al eliminar archivo');
    }
  }

  // ============================================
  // SEARCH AND FILTER
  // ============================================

  static async search(
    organizationId: string,
    searchTerm: string
  ): Promise<Document[]> {
    try {
      const allDocs = await this.getAll(organizationId);
      const term = searchTerm.toLowerCase();

      return allDocs.filter(
        doc =>
          doc.title.toLowerCase().includes(term) ||
          doc.description?.toLowerCase().includes(term) ||
          doc.code.toLowerCase().includes(term) ||
          doc.keywords?.some(k => k.toLowerCase().includes(term))
      );
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error('Error al buscar documentos');
    }
  }

  static async getByType(
    organizationId: string,
    type: DocumentType
  ): Promise<Document[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organization_id', '==', organizationId),
        where('type', '==', type)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effective_date: doc.data().effective_date?.toDate(),
        review_date: doc.data().review_date?.toDate(),
        approved_at: doc.data().approved_at?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Document[];
    } catch (error) {
      console.error('Error getting documents by type:', error);
      throw new Error('Error al obtener documentos por tipo');
    }
  }

  static async getByStatus(
    organizationId: string,
    status: DocumentStatus
  ): Promise<Document[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organization_id', '==', organizationId),
        where('status', '==', status)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effective_date: doc.data().effective_date?.toDate(),
        review_date: doc.data().review_date?.toDate(),
        approved_at: doc.data().approved_at?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Document[];
    } catch (error) {
      console.error('Error getting documents by status:', error);
      throw new Error('Error al obtener documentos por estado');
    }
  }

  static async getByProcess(
    organizationId: string,
    processId: string
  ): Promise<Document[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organization_id', '==', organizationId),
        where('process_id', '==', processId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effective_date: doc.data().effective_date?.toDate(),
        review_date: doc.data().review_date?.toDate(),
        approved_at: doc.data().approved_at?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Document[];
    } catch (error) {
      console.error('Error getting documents by process:', error);
      throw new Error('Error al obtener documentos por proceso');
    }
  }

  static async getByNormPoint(
    organizationId: string,
    normPointId: string
  ): Promise<Document[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organization_id', '==', organizationId),
        where('norm_point_ids', 'array-contains', normPointId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effective_date: doc.data().effective_date?.toDate(),
        review_date: doc.data().review_date?.toDate(),
        approved_at: doc.data().approved_at?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Document[];
    } catch (error) {
      console.error('Error getting documents by norm point:', error);
      throw new Error('Error al obtener documentos por punto de norma');
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  static async getStats(organizationId: string): Promise<DocumentStats> {
    try {
      const allDocs = await this.getAll(organizationId);
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      const by_status: Record<DocumentStatus, number> = {
        borrador: 0,
        en_revision: 0,
        aprobado: 0,
        publicado: 0,
        obsoleto: 0,
      };

      const by_type: Record<DocumentType, number> = {
        manual: 0,
        procedimiento: 0,
        instruccion: 0,
        formato: 0,
        registro: 0,
        politica: 0,
        otro: 0,
      };

      let expiring_soon = 0;
      let expired = 0;

      allDocs.forEach(doc => {
        by_status[doc.status]++;
        by_type[doc.type]++;

        if (doc.review_date) {
          if (doc.review_date < now) {
            expired++;
          } else if (doc.review_date < thirtyDaysFromNow) {
            expiring_soon++;
          }
        }
      });

      // Most downloaded
      const most_downloaded = [...allDocs]
        .sort((a, b) => b.download_count - a.download_count)
        .slice(0, 10);

      // Recent
      const recent = [...allDocs]
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .slice(0, 10);

      return {
        total: allDocs.length,
        by_status,
        by_type,
        expiring_soon,
        expired,
        most_downloaded,
        recent,
      };
    } catch (error) {
      console.error('Error getting document stats:', error);
      throw new Error('Error al obtener estadísticas de documentos');
    }
  }

  static async getExpiringSoon(
    organizationId: string,
    days: number = 30
  ): Promise<Document[]> {
    try {
      const allDocs = await this.getAll(organizationId);
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      return allDocs.filter(
        doc =>
          doc.review_date &&
          doc.review_date > now &&
          doc.review_date <= futureDate
      );
    } catch (error) {
      console.error('Error getting expiring documents:', error);
      throw new Error('Error al obtener documentos próximos a vencer');
    }
  }

  static async getExpired(organizationId: string): Promise<Document[]> {
    try {
      const allDocs = await this.getAll(organizationId);
      const now = new Date();

      return allDocs.filter(doc => doc.review_date && doc.review_date < now);
    } catch (error) {
      console.error('Error getting expired documents:', error);
      throw new Error('Error al obtener documentos vencidos');
    }
  }

  static async getMostDownloaded(
    organizationId: string,
    limit: number = 10
  ): Promise<Document[]> {
    try {
      const allDocs = await this.getAll(organizationId);
      return [...allDocs]
        .sort((a, b) => b.download_count - a.download_count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting most downloaded documents:', error);
      throw new Error('Error al obtener documentos más descargados');
    }
  }

  // ============================================
  // CODE GENERATION
  // ============================================

  static async generateCode(
    organizationId: string,
    type: DocumentType
  ): Promise<string> {
    try {
      const prefix = this.getCodePrefix(type);
      const docs = await this.getByType(organizationId, type);

      // Extract numbers from existing codes
      const numbers = docs
        .map(doc => {
          const match = doc.code.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter(n => !isNaN(n));

      const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNumber = maxNumber + 1;

      return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating code:', error);
      throw new Error('Error al generar código');
    }
  }

  private static getCodePrefix(type: DocumentType): string {
    const prefixes: Record<DocumentType, string> = {
      manual: 'MAN',
      procedimiento: 'PROC',
      instruccion: 'INST',
      formato: 'FOR',
      registro: 'REG',
      politica: 'POL',
      otro: 'DOC',
    };
    return prefixes[type];
  }

  // ============================================
  // CALENDAR INTEGRATION
  // ============================================

  /**
   * Calcular prioridad del evento basado en días hasta vencimiento
   * - Crítico: < 7 días
   * - Alto: < 30 días
   * - Medio: < 60 días
   * - Bajo: > 60 días
   */
  private static getExpiryPriority(
    reviewDate: Date
  ): 'low' | 'medium' | 'high' | 'critical' {
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 7) return 'critical';
    if (daysUntilExpiry < 30) return 'high';
    if (daysUntilExpiry < 60) return 'medium';
    return 'low';
  }
}
