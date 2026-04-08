/**
 * Storage Types
 * Tipos para el manejo de archivos en Firebase Storage
 */

/**
 * Representa un archivo subido a Firebase Storage
 */
export interface UploadedFile {
  /** ID único del archivo */
  id: string;
  /** Nombre original del archivo */
  name: string;
  /** URL pública para acceder al archivo */
  url: string;
  /** Ruta en Firebase Storage */
  path: string;
  /** Tamaño en bytes */
  size: number;
  /** Tipo MIME del archivo */
  type: string;
  /** Fecha de subida */
  uploadedAt: Date;
}

/**
 * Representa el progreso de subida de un archivo
 */
export interface UploadProgress {
  /** ID del archivo en proceso */
  fileId: string;
  /** Porcentaje de progreso (0-100) */
  progress: number;
  /** Estado actual de la subida */
  status: 'pending' | 'uploading' | 'completed' | 'error';
  /** Mensaje de error si aplica */
  error?: string;
}

/**
 * Opciones para la validación de archivos
 */
export interface FileValidationOptions {
  /** Tamaño máximo en bytes */
  maxSize?: number;
  /** Tipos MIME permitidos */
  allowedTypes?: string[];
}

/**
 * Resultado de la validación de un archivo
 */
export interface FileValidationResult {
  /** Si el archivo es válido */
  isValid: boolean;
  /** Mensaje de error si no es válido */
  error?: string;
  /** Nombre sanitizado del archivo (si es válido) */
  sanitizedName?: string;
}

/**
 * Tipos de archivos soportados
 */
export type FileCategory = 'image' | 'video' | 'document' | 'other';

/**
 * Obtiene la categoría de un archivo basado en su tipo MIME
 */
export function getFileCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word')
  ) {
    return 'document';
  }
  return 'other';
}

/**
 * Formatea el tamaño de un archivo para mostrar
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
