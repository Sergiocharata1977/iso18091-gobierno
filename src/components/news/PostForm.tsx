'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useState, useRef } from 'react';

interface PostFormProps {
  onSubmit: (content: string, imageFiles: File[]) => Promise<void>;
  onCancel?: () => void;
  initialContent?: string;
  submitLabel?: string;
  placeholder?: string;
}

export function PostForm({
  onSubmit,
  onCancel,
  initialContent = '',
  submitLabel = 'Publicar',
  placeholder = '¿Qué quieres compartir?',
}: PostFormProps) {
  const [content, setContent] = useState(initialContent);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxLength = 5000;
  const minLength = 1;
  const maxImages = 5;
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  const remainingChars = maxLength - content.length;
  const isValid =
    content.trim().length >= minLength &&
    content.length <= maxLength &&
    imageFiles.length <= maxImages;

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Solo se permiten archivos JPG, PNG y WEBP';
    }
    if (file.size > maxFileSize) {
      return 'El archivo no puede exceder 5MB';
    }
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    let errorMessage: string | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validar archivo
      const validationError = validateFile(file);
      if (validationError) {
        errorMessage = validationError;
        break;
      }

      // Verificar límite total
      if (imageFiles.length + newFiles.length >= maxImages) {
        errorMessage = `Máximo ${maxImages} imágenes permitidas`;
        break;
      }

      newFiles.push(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) {
          setImagePreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }

    if (errorMessage) {
      setError(errorMessage);
    } else {
      setImageFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError('El contenido debe tener entre 1 y 5000 caracteres');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(content.trim(), imageFiles);
      setContent('');
      setImageFiles([]);
      setImagePreviews([]);
    } catch (err) {
      console.error('Error submitting post:', err);
      setError(err instanceof Error ? err.message : 'Error al publicar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={placeholder}
            className="min-h-[100px] resize-none"
            disabled={isSubmitting}
          />

          {/* Image Upload Area */}
          <div className="mt-4">
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {imageFiles.length === 0 ? (
                <div className="space-y-2">
                  <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Arrastra imágenes aquí o{' '}
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        selecciona archivos
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP hasta 5MB cada uno (máx. 5 imágenes)
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-primary hover:underline text-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Agregar más imágenes ({imageFiles.length}/{maxImages})
                </button>
              )}
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {remainingChars < 100 && (
                <span className={remainingChars < 0 ? 'text-destructive' : ''}>
                  {remainingChars} caracteres restantes
                </span>
              )}
            </div>
          </div>

          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
