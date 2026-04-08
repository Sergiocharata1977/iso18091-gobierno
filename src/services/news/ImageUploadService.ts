import { getAdminStorage } from '@/lib/firebase/admin';
import type { PostImage } from '@/types/news';
import { NewsError, NewsErrorCode } from '@/types/news';

export class ImageUploadService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_FILES = 5;
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  private static readonly STORAGE_BASE_PATH = 'news/posts';

  /**
   * Subir una imagen a Firebase Storage
   */
  static async uploadImage(
    file: File,
    postId: string,
    userId: string
  ): Promise<PostImage> {
    try {
      // Validar archivo
      this.validateFile(file);

      // Generar path único
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storagePath = `${this.STORAGE_BASE_PATH}/${postId}/${fileName}`;

      // Obtener bucket de Storage
      const storage = getAdminStorage();
      const bucket = storage.bucket();

      // Crear file reference
      const fileRef = bucket.file(storagePath);

      // Convertir File a Buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Subir archivo
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            uploadedBy: userId,
            originalName: file.name,
            postId,
          },
        },
      });

      // Hacer público el archivo
      await fileRef.makePublic();

      // Obtener URL pública
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      // Obtener dimensiones (si es posible)
      const width: number | null = null;
      const height: number | null = null;

      try {
        // Para obtener dimensiones necesitaríamos una librería como sharp
        // Por ahora dejamos null
      } catch (error) {
        console.warn('Could not get image dimensions:', error);
      }

      // Crear objeto PostImage
      const postImage: PostImage = {
        url: publicUrl,
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width,
        height,
      };

      return postImage;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw this.handleError(
        error,
        'Error al subir imagen',
        'STORAGE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Subir múltiples imágenes
   */
  static async uploadMultiple(
    files: File[],
    postId: string,
    userId: string
  ): Promise<PostImage[]> {
    try {
      // Validar cantidad de archivos
      if (files.length > this.MAX_FILES) {
        throw new NewsError(
          `Máximo ${this.MAX_FILES} imágenes por publicación`,
          'TOO_MANY_IMAGES' as NewsErrorCode
        );
      }

      // Subir todas las imágenes en paralelo
      const uploadPromises = files.map(file =>
        this.uploadImage(file, postId, userId)
      );

      const uploadedImages = await Promise.all(uploadPromises);

      return uploadedImages;
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      throw this.handleError(
        error,
        'Error al subir imágenes',
        'STORAGE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Eliminar imagen de Storage
   */
  static async deleteImage(storagePath: string): Promise<void> {
    try {
      const storage = getAdminStorage();
      const bucket = storage.bucket();
      const fileRef = bucket.file(storagePath);

      // Verificar si el archivo existe
      const [exists] = await fileRef.exists();
      if (!exists) {
        console.warn(`Image not found in storage: ${storagePath}`);
        return;
      }

      // Eliminar archivo
      await fileRef.delete();

      console.log(`Image deleted from storage: ${storagePath}`);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw this.handleError(
        error,
        'Error al eliminar imagen',
        'STORAGE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Eliminar múltiples imágenes
   */
  static async deleteMultiple(storagePaths: string[]): Promise<void> {
    try {
      const deletePromises = storagePaths.map(path => this.deleteImage(path));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      throw this.handleError(
        error,
        'Error al eliminar imágenes',
        'STORAGE_ERROR' as NewsErrorCode
      );
    }
  }

  /**
   * Validar archivo antes de subir
   */
  private static validateFile(file: File): void {
    // Validar tipo
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new NewsError(
        'Tipo de archivo no permitido. Solo JPG, PNG y WEBP',
        'INVALID_FILE_TYPE' as NewsErrorCode
      );
    }

    // Validar tamaño
    if (file.size > this.MAX_FILE_SIZE) {
      throw new NewsError(
        `Archivo demasiado grande. Máximo ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        'FILE_TOO_LARGE' as NewsErrorCode
      );
    }

    // Validar nombre
    if (!file.name || file.name.trim().length === 0) {
      throw new NewsError(
        'Nombre de archivo inválido',
        'INVALID_FILE_TYPE' as NewsErrorCode
      );
    }
  }

  /**
   * Handle errors consistently
   */
  private static handleError(
    error: unknown,
    message: string,
    code: NewsErrorCode
  ): Error {
    if (error instanceof NewsError) {
      return error;
    }

    return new NewsError(message, code, { originalError: error });
  }
}
