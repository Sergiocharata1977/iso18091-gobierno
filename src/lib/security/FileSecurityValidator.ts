/**
 * File Security Validator
 * Validación de archivos con MIME types + Magic Bytes (OWASP Compliant)
 *
 * @version 1.0
 * @author Document Integration Service
 */

import { FileValidationOptions, FileValidationResult } from '@/types/storage';

/**
 * Magic Bytes para validación de tipos de archivo
 * Los primeros bytes del archivo deben coincidir con estos valores
 * para prevenir file spoofing (renombrar .exe a .pdf)
 */
const MAGIC_BYTES: Record<string, number[]> = {
  // Imágenes
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF

  // Documentos
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF

  // Microsoft Office (ZIP-based)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    0x50, 0x4b, 0x03, 0x04,
  ], // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    0x50, 0x4b, 0x03, 0x04,
  ], // XLSX

  // Microsoft Office Legacy
  'application/msword': [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // DOC
  'application/vnd.ms-excel': [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // XLS

  // Videos
  'video/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
  'video/webm': [0x1a, 0x45, 0xdf, 0xa3],
  'video/quicktime': [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // MOV

  // Audio
  'audio/mpeg': [0xff, 0xfb], // MP3
  'audio/wav': [0x52, 0x49, 0x46, 0x46], // RIFF

  // Comprimidos
  'application/zip': [0x50, 0x4b, 0x03, 0x04],
  'application/x-rar-compressed': [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07],
};

/**
 * Tipos MIME permitidos por defecto
 */
const DEFAULT_ALLOWED_TYPES = [
  // Imágenes
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',

  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',

  // Audio
  'audio/mpeg',
  'audio/wav',
];

/**
 * Tamaño máximo por defecto: 10MB
 */
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/**
 * Validador de seguridad de archivos
 */
export class FileSecurityValidator {
  /**
   * Valida un archivo completo: MIME type + Magic Bytes + Tamaño
   *
   * @param file - Archivo a validar
   * @param options - Opciones de validación
   * @returns Resultado de validación
   */
  static async validateFile(
    file: File,
    options?: FileValidationOptions
  ): Promise<FileValidationResult> {
    // 1. Validar tamaño
    const maxSize = options?.maxSize || DEFAULT_MAX_SIZE;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `Archivo excede el tamaño máximo de ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    if (file.size === 0) {
      return {
        isValid: false,
        error: 'El archivo está vacío',
      };
    }

    // 2. Validar MIME type
    const allowedTypes = options?.allowedTypes || DEFAULT_ALLOWED_TYPES;

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Tipo de archivo no permitido: ${file.type}`,
      };
    }

    // 3. Validar Magic Bytes (primeros bytes del archivo)
    const magicBytes = MAGIC_BYTES[file.type];
    if (magicBytes) {
      const isValid = await this.validateMagicBytes(file, magicBytes);
      if (!isValid) {
        return {
          isValid: false,
          error:
            'El archivo no coincide con su tipo declarado (posible spoofing). El contenido real no corresponde a la extensión.',
        };
      }
    }

    // 4. Sanitizar nombre de archivo
    const sanitizedName = this.sanitizeFileName(file.name);

    return {
      isValid: true,
      sanitizedName,
    };
  }

  /**
   * Valida los Magic Bytes del archivo
   * Lee los primeros bytes y los compara con los esperados
   *
   * @param file - Archivo a validar
   * @param expectedBytes - Bytes esperados
   * @returns true si coinciden, false si no
   */
  private static async validateMagicBytes(
    file: File,
    expectedBytes: number[]
  ): Promise<boolean> {
    try {
      // Leer los primeros bytes del archivo
      const buffer = await file.slice(0, expectedBytes.length).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Comparar byte por byte
      for (let i = 0; i < expectedBytes.length; i++) {
        if (bytes[i] !== expectedBytes[i]) {
          console.warn(
            `[FileSecurityValidator] Magic byte mismatch at position ${i}:`,
            {
              expected: expectedBytes[i].toString(16),
              actual: bytes[i].toString(16),
              file: file.name,
              type: file.type,
            }
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(
        '[FileSecurityValidator] Error reading magic bytes:',
        error
      );
      return false;
    }
  }

  /**
   * Sanitiza el nombre de archivo para prevenir path traversal
   * y otros ataques basados en nombres de archivo
   *
   * @param fileName - Nombre original del archivo
   * @returns Nombre sanitizado
   */
  static sanitizeFileName(fileName: string): string {
    return (
      fileName
        // Reemplazar caracteres no permitidos
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        // Prevenir path traversal (..)
        .replace(/\.{2,}/g, '.')
        // Prevenir nombres que empiezan con punto
        .replace(/^\./, '')
        // Limitar longitud (255 caracteres es el límite en la mayoría de sistemas)
        .substring(0, 255) ||
      // Asegurar que no quede vacío
      'file'
    );
  }

  /**
   * Obtiene la extensión del archivo desde el nombre
   *
   * @param fileName - Nombre del archivo
   * @returns Extensión sin el punto (ej: "pdf", "jpg")
   */
  static getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Genera un nombre de archivo único con timestamp
   *
   * @param originalName - Nombre original del archivo
   * @returns Nombre único sanitizado
   */
  static generateUniqueFileName(originalName: string): string {
    const sanitized = this.sanitizeFileName(originalName);
    const extension = this.getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(
      0,
      sanitized.length - extension.length - 1
    );

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);

    return `${timestamp}_${random}_${nameWithoutExt}.${extension}`;
  }

  /**
   * Valida si un tipo MIME es una imagen
   *
   * @param mimeType - Tipo MIME
   * @returns true si es imagen
   */
  static isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Valida si un tipo MIME es un video
   *
   * @param mimeType - Tipo MIME
   * @returns true si es video
   */
  static isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Valida si un tipo MIME es un audio
   *
   * @param mimeType - Tipo MIME
   * @returns true si es audio
   */
  static isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * Valida si un tipo MIME es un documento
   *
   * @param mimeType - Tipo MIME
   * @returns true si es documento
   */
  static isDocument(mimeType: string): boolean {
    return (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheet')
    );
  }

  /**
   * Obtiene una categoría legible del tipo de archivo
   *
   * @param mimeType - Tipo MIME
   * @returns Categoría del archivo
   */
  static getFileCategory(
    mimeType: string
  ): 'image' | 'video' | 'audio' | 'document' | 'other' {
    if (this.isImage(mimeType)) return 'image';
    if (this.isVideo(mimeType)) return 'video';
    if (this.isAudio(mimeType)) return 'audio';
    if (this.isDocument(mimeType)) return 'document';
    return 'other';
  }
}
