/**
 * Storage Service
 * Servicio genérico reutilizable para upload/download/delete de archivos en Firebase Storage
 */

import { storage } from '@/firebase/config';
import { UploadedFile, UploadProgress } from '@/types/storage';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  UploadTaskSnapshot,
} from 'firebase/storage';

// Configuración de límites
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export class StorageService {
  /**
   * Valida un archivo antes de subirlo
   */
  static validateFile(
    file: File,
    options?: {
      maxSize?: number;
      allowedTypes?: string[];
    }
  ): { isValid: boolean; error?: string } {
    const maxSize = options?.maxSize || MAX_FILE_SIZE;
    const allowedTypes = options?.allowedTypes || [
      ...ALLOWED_IMAGE_TYPES,
      ...ALLOWED_VIDEO_TYPES,
      ...ALLOWED_DOCUMENT_TYPES,
    ];

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `El archivo excede el tamaño máximo de ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -2));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return {
        isValid: false,
        error: 'Tipo de archivo no permitido',
      };
    }

    return { isValid: true };
  }

  /**
   * Sube un archivo a Firebase Storage con seguimiento de progreso
   */
  static async uploadFile(
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile> {
    // Validar archivo
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${fileId}_${file.name}`;
    const fullPath = `${path}/${fileName}`;
    const storageRef = ref(storage, fullPath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress?.({
            fileId,
            progress,
            status: progress < 100 ? 'uploading' : 'completed',
          });
        },
        error => {
          onProgress?.({
            fileId,
            progress: 0,
            status: 'error',
            error: error.message,
          });
          reject(new Error(`Error al subir archivo: ${error.message}`));
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            const uploadedFile: UploadedFile = {
              id: fileId,
              name: file.name,
              url,
              path: fullPath,
              size: file.size,
              type: file.type,
              uploadedAt: new Date(),
            };
            resolve(uploadedFile);
          } catch (error) {
            reject(new Error('Error al obtener URL del archivo'));
          }
        }
      );
    });
  }

  /**
   * Sube múltiples archivos en paralelo
   */
  static async uploadFiles(
    files: File[],
    basePath: string,
    onProgress?: (fileId: string, progress: UploadProgress) => void
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file =>
      this.uploadFile(file, basePath, progress =>
        onProgress?.(progress.fileId, progress)
      )
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Elimina un archivo de Firebase Storage
   */
  static async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Error al eliminar archivo');
    }
  }

  /**
   * Obtiene la URL de descarga de un archivo
   */
  static async getFileURL(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw new Error('Error al obtener URL del archivo');
    }
  }

  /**
   * Genera un path para archivos de noticias
   */
  static getNewsPath(organizationId: string, postId?: string): string {
    if (postId) {
      return `news/${organizationId}/posts/${postId}`;
    }
    return `news/${organizationId}/posts/temp-${Date.now()}`;
  }

  /**
   * Genera un path para archivos de evidencia (legacy sin organización)
   */
  static getEvidencePath(entityType: string, entityId: string): string {
    return `evidence/${entityType}/${entityId}`;
  }

  /**
   * Genera un path para archivos de evidencia segregado por organización
   * @param organizationId - ID de la organización
   * @param entityType - Tipo de entidad (audits, findings, actions, etc.)
   * @param entityId - ID de la entidad
   */
  static getEvidencePathWithOrg(
    organizationId: string,
    entityType: string,
    entityId: string
  ): string {
    return `organizations/${organizationId}/evidence/${entityType}/${entityId}`;
  }

  /**
   * Genera un path para archivos de RRHH segregado por organización
   * @param organizationId - ID de la organización
   * @param subCategory - Subcategoría (personnel, trainings, evaluations, etc.)
   * @param entityId - ID de la entidad
   */
  static getRRHHPath(
    organizationId: string,
    subCategory: string,
    entityId: string
  ): string {
    return `organizations/${organizationId}/rrhh/${subCategory}/${entityId}`;
  }

  /**
   * Genera un path para archivos generales de una organización
   * @param organizationId - ID de la organización
   * @param category - Categoría del archivo
   * @param fileName - Nombre del archivo (opcional)
   */
  static getOrganizationPath(
    organizationId: string,
    category: string,
    fileName?: string
  ): string {
    const basePath = `organizations/${organizationId}/${category}`;
    return fileName ? `${basePath}/${fileName}` : basePath;
  }

  /**
   * Genera un path para documentos generales
   */
  static getDocumentPath(organizationId: string, category: string): string {
    return `documents/${organizationId}/${category}`;
  }
}
