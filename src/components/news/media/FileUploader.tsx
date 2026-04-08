'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StorageService } from '@/services/storage/StorageService';
import { formatFileSize, UploadedFile, UploadProgress } from '@/types/storage';
import {
  AlertCircle,
  CheckCircle,
  File,
  FileText,
  Image as ImageIcon,
  Upload,
  Video,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';

interface FileUploadItem {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  preview?: string;
  uploadedFile?: UploadedFile;
}

interface FileUploaderProps {
  /** Callback cuando los archivos se seleccionan (antes de subir) */
  onFilesSelected?: (files: File[]) => void;
  /** Callback cuando un archivo se sube exitosamente */
  onFileUploaded?: (uploadedFile: UploadedFile) => void;
  /** Callback cuando se eliminan todos los archivos subidos */
  onFilesUploaded?: (uploadedFiles: UploadedFile[]) => void;
  /** Callback cuando se elimina un archivo */
  onFileRemoved?: (fileId: string, path?: string) => void;
  /** Ruta base en Storage donde se guardarán los archivos */
  storagePath: string;
  /** Número máximo de archivos */
  maxFiles?: number;
  /** Tamaño máximo por archivo en MB */
  maxFileSize?: number;
  /** Tipos MIME aceptados */
  acceptedTypes?: string[];
  /** Clase CSS adicional */
  className?: string;
  /** Si debe subir automáticamente al seleccionar */
  autoUpload?: boolean;
}

export function FileUploader({
  onFilesSelected,
  onFileUploaded,
  onFilesUploaded,
  onFileRemoved,
  storagePath,
  maxFiles = 10,
  maxFileSize = 10,
  acceptedTypes = ['image/*', 'video/*', 'application/pdf'],
  className = '',
  autoUpload = true,
}: FileUploaderProps) {
  const [uploads, setUploads] = useState<FileUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/'))
      return <ImageIcon className="h-5 w-5" />;
    if (file.type.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (file.type.includes('pdf')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const getFileTypeColor = (file: File) => {
    if (file.type.startsWith('image/')) return 'text-blue-600';
    if (file.type.startsWith('video/')) return 'text-red-600';
    if (file.type.includes('pdf')) return 'text-orange-600';
    return 'text-slate-600';
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize * 1024 * 1024) {
      return `Archivo demasiado grande. Máximo ${maxFileSize}MB.`;
    }

    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return 'Tipo de archivo no permitido.';
    }

    return null;
  };

  const uploadFile = async (uploadItem: FileUploadItem) => {
    try {
      const uploadedFile = await StorageService.uploadFile(
        uploadItem.file,
        storagePath,
        (progress: UploadProgress) => {
          setUploads(prev =>
            prev.map(u =>
              u.id === uploadItem.id
                ? { ...u, progress: progress.progress, status: progress.status }
                : u
            )
          );
        }
      );

      // Actualizar estado con archivo completado
      setUploads(prev =>
        prev.map(u =>
          u.id === uploadItem.id
            ? { ...u, status: 'completed' as const, uploadedFile }
            : u
        )
      );

      onFileUploaded?.(uploadedFile);
      return uploadedFile;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al subir archivo';
      setUploads(prev =>
        prev.map(u =>
          u.id === uploadItem.id
            ? { ...u, status: 'error' as const, error: errorMessage }
            : u
        )
      );
      throw error;
    }
  };

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const newUploads: FileUploadItem[] = [];

      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          newUploads.push({
            file,
            id: `${Date.now()}-${Math.random()}`,
            progress: 0,
            status: 'error',
            error,
          });
        } else {
          validFiles.push(file);
          newUploads.push({
            file,
            id: `${Date.now()}-${Math.random()}`,
            progress: 0,
            status: 'pending',
            preview: file.type.startsWith('image/')
              ? URL.createObjectURL(file)
              : undefined,
          });
        }
      }

      // Check total file limit
      const totalFiles = uploads.length + validFiles.length;
      if (totalFiles > maxFiles) {
        alert(`Máximo ${maxFiles} archivos permitidos.`);
        return;
      }

      setUploads(prev => [...prev, ...newUploads]);
      onFilesSelected?.(validFiles);

      // Auto-upload si está habilitado
      if (autoUpload) {
        const uploadPromises = newUploads
          .filter(u => u.status === 'pending')
          .map(u => uploadFile(u));

        try {
          const results = await Promise.all(uploadPromises);
          onFilesUploaded?.(results.filter(Boolean) as UploadedFile[]);
        } catch (error) {
          console.error('Error uploading files:', error);
        }
      }
    },
    [uploads.length, maxFiles, onFilesSelected, autoUpload, storagePath]
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      processFiles(files);
    }
    // Reset input
    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files) {
      processFiles(files);
    }
  };

  const removeFile = async (fileId: string) => {
    const upload = uploads.find(u => u.id === fileId);

    // Si el archivo ya fue subido, eliminarlo de Storage
    if (upload?.uploadedFile?.path) {
      try {
        await StorageService.deleteFile(upload.uploadedFile.path);
      } catch (error) {
        console.error('Error deleting file from storage:', error);
      }
    }

    setUploads(prev => {
      const updated = prev.filter(u => u.id !== fileId);
      // Clean up object URLs
      if (upload?.preview) {
        URL.revokeObjectURL(upload.preview);
      }
      return updated;
    });

    onFileRemoved?.(fileId, upload?.uploadedFile?.path);
  };

  // Obtener archivos subidos exitosamente
  const getUploadedFiles = (): UploadedFile[] => {
    return uploads
      .filter(u => u.status === 'completed' && u.uploadedFile)
      .map(u => u.uploadedFile!);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload
          className={`mx-auto h-12 w-12 mb-4 ${isDragOver ? 'text-emerald-600' : 'text-slate-400'}`}
        />

        <div className="space-y-2">
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
            {isDragOver ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí'}
          </p>
          <p className="text-sm text-slate-500">
            o{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              selecciona archivos
            </button>
          </p>
          <p className="text-xs text-slate-400">
            Máximo {maxFiles} archivos, {maxFileSize}MB cada uno
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-900 dark:text-slate-100">
            Archivos ({uploads.length})
          </h4>

          <div className="space-y-2">
            {uploads.map(upload => (
              <div
                key={upload.id}
                className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
              >
                {/* File Icon or Preview */}
                <div className="flex-shrink-0">
                  {upload.preview ? (
                    <div className="relative w-10 h-10 rounded overflow-hidden">
                      <Image
                        src={upload.preview}
                        alt={upload.file.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-10 h-10 rounded flex items-center justify-center ${getFileTypeColor(upload.file)} bg-slate-100 dark:bg-slate-700`}
                    >
                      {getFileIcon(upload.file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {upload.file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(upload.file.size)}
                  </p>

                  {/* Progress Bar */}
                  {upload.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={upload.progress} className="h-1" />
                      <p className="text-xs text-slate-500 mt-1">
                        {upload.progress}%
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {upload.status === 'error' && upload.error && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 text-red-500" />
                      <p className="text-xs text-red-600">{upload.error}</p>
                    </div>
                  )}
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {upload.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {upload.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  {(upload.status === 'uploading' ||
                    upload.status === 'pending') && (
                    <div className="h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(upload.id)}
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export para uso externo
export { type FileUploadItem };
