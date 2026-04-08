'use client';

// Validation utilities for the news center components

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PostValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowEmpty?: boolean;
  requireMedia?: boolean;
}

export interface CommentValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowEmpty?: boolean;
}

export interface FileValidationOptions {
  maxSize?: number; // in MB
  allowedTypes?: string[];
  maxFiles?: number;
}

// Post content validation
export function validatePostContent(
  content: string,
  mediaFiles: File[] = [],
  options: PostValidationOptions = {}
): ValidationResult {
  const {
    maxLength = 1000,
    minLength = 0,
    allowEmpty = false,
    requireMedia = false,
  } = options;

  const errors: string[] = [];

  // Check if content is empty and media is not required
  const isEmpty = !content.trim() && mediaFiles.length === 0;
  if (isEmpty && !allowEmpty) {
    errors.push('El contenido o archivos multimedia son requeridos');
  }

  // Check content length
  if (content.length > maxLength) {
    errors.push(`El contenido no puede exceder ${maxLength} caracteres`);
  }

  if (content.length < minLength && content.trim()) {
    errors.push(`El contenido debe tener al menos ${minLength} caracteres`);
  }

  // Check if media is required but not provided
  if (requireMedia && mediaFiles.length === 0 && !content.trim()) {
    errors.push('Se requiere al menos un archivo multimedia');
  }

  // Check for potentially harmful content
  if (content.includes('<script') || content.includes('javascript:')) {
    errors.push('El contenido contiene elementos no permitidos');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Comment validation
export function validateComment(
  content: string,
  options: CommentValidationOptions = {}
): ValidationResult {
  const { maxLength = 500, minLength = 1, allowEmpty = false } = options;

  const errors: string[] = [];

  if (!content.trim() && !allowEmpty) {
    errors.push('El comentario no puede estar vacío');
  }

  if (content.length > maxLength) {
    errors.push(`El comentario no puede exceder ${maxLength} caracteres`);
  }

  if (content.length < minLength && content.trim()) {
    errors.push(`El comentario debe tener al menos ${minLength} caracteres`);
  }

  // Basic XSS prevention
  if (content.includes('<script') || content.includes('javascript:')) {
    errors.push('El comentario contiene elementos no permitidos');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// File validation
export function validateFiles(
  files: File[],
  options: FileValidationOptions = {}
): ValidationResult {
  const {
    maxSize = 10, // 10MB
    allowedTypes = ['image/*', 'video/*', 'application/pdf'],
    maxFiles = 10,
  } = options;

  const errors: string[] = [];

  if (files.length > maxFiles) {
    errors.push(`Máximo ${maxFiles} archivos permitidos`);
  }

  files.forEach((file, index) => {
    // Size validation
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > maxSize) {
      errors.push(`Archivo ${index + 1}: Tamaño máximo ${maxSize}MB excedido`);
    }

    // Type validation
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      errors.push(`Archivo ${index + 1}: Tipo de archivo no permitido`);
    }

    // Filename validation (basic)
    if (
      file.name.includes('..') ||
      file.name.includes('/') ||
      file.name.includes('\\')
    ) {
      errors.push(`Archivo ${index + 1}: Nombre de archivo no válido`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// URL validation for sharing
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];

  try {
    const parsedUrl = new URL(url);

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      errors.push('Solo se permiten URLs HTTP o HTTPS');
    }

    // Basic domain validation
    if (parsedUrl.hostname.length === 0) {
      errors.push('URL inválida');
    }
  } catch {
    errors.push('Formato de URL inválido');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Sanitization functions
export function sanitizeContent(content: string): string {
  // Basic HTML sanitization - remove script tags and javascript: protocols
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function sanitizeFilename(filename: string): string {
  // Remove potentially dangerous characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .substring(0, 255); // Limit length
}

// Rate limiting helpers
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}

  canAttempt(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);

    this.attempts.set(key, validAttempts);

    return validAttempts.length < this.maxAttempts;
  }

  recordAttempt(key: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    attempts.push(now);
    this.attempts.set(key, attempts);
  }

  getRemainingAttempts(key: string): number {
    const attempts = this.attempts.get(key) || [];
    const validAttempts = attempts.filter(
      time => Date.now() - time < this.windowMs
    );
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }
}

// Export singleton rate limiter instances
export const postRateLimiter = new RateLimiter(10, 300000); // 10 posts per 5 minutes
export const commentRateLimiter = new RateLimiter(20, 60000); // 20 comments per minute
export const reactionRateLimiter = new RateLimiter(50, 60000); // 50 reactions per minute
