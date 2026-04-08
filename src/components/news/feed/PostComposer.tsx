'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Image as ImageIcon,
  Video,
  FileText,
  X,
  Loader2,
  Send,
  Smile,
} from 'lucide-react';
import { useState, useRef } from 'react';
import Image from 'next/image';

interface PostComposerProps {
  currentUser?: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  onSubmit?: (content: string, files: File[]) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function PostComposer({
  currentUser,
  onSubmit,
  isLoading = false,
  placeholder = '¿Qué está pasando en tu organización?',
  maxLength = 1000,
  className = '',
}: PostComposerProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.(content, files);
      setContent('');
      setFiles([]);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const isValidType = ['image/', 'video/', 'application/pdf'].some(type =>
        file.type.startsWith(type)
      );
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

      return isValidType && isValidSize;
    });

    setFiles(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 files
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/'))
      return <ImageIcon className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canSubmit =
    (content.trim().length > 0 || files.length > 0) &&
    !isSubmitting &&
    !isLoading;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Crear Publicación
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={currentUser?.photoURL} />
            <AvatarFallback>
              {currentUser?.displayName
                ? getInitials(currentUser.displayName)
                : 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {currentUser?.displayName || 'Usuario'}
            </p>
            <Badge variant="outline" className="text-xs">
              ISO 9001
            </Badge>
          </div>
        </div>

        {/* Content Input */}
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, maxLength))}
            placeholder={placeholder}
            className="min-h-[120px] resize-none border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
            disabled={isLoading}
          />
          <div className="flex justify-between items-center text-sm text-slate-500">
            <span>
              {content.length}/{maxLength}
            </span>
            <Button variant="ghost" size="sm">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* File Attachments */}
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Archivos adjuntos ({files.length})
            </p>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                >
                  {file.type.startsWith('image/') ? (
                    <div className="relative w-12 h-12 rounded overflow-hidden">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
                      {getFileIcon(file)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="text-slate-600 hover:text-emerald-600"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Imagen
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="text-slate-600 hover:text-emerald-600"
            >
              <Video className="h-4 w-4 mr-2" />
              Video
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="text-slate-600 hover:text-emerald-600"
            >
              <FileText className="h-4 w-4 mr-2" />
              Archivo
            </Button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publicar
          </Button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
