import { z } from 'zod';

// ============================================
// ESQUEMAS DE VALIDACIÓN
// ============================================

// Validación de contenido de post
export const postContentSchema = z
  .string()
  .min(1, 'El contenido no puede estar vacío')
  .max(5000, 'El contenido no puede exceder 5000 caracteres')
  .trim();

// Validación de contenido de comentario
export const commentContentSchema = z
  .string()
  .min(1, 'El comentario no puede estar vacío')
  .max(1000, 'El comentario no puede exceder 1000 caracteres')
  .trim();

// Validación para crear post
export const createPostSchema = z.object({
  content: postContentSchema,
  organizationId: z.string().min(1, 'organizationId es requerido'),
});

// Validación para actualizar post
export const updatePostSchema = z.object({
  content: postContentSchema,
});

// Validación para crear comentario
export const createCommentSchema = z.object({
  content: commentContentSchema,
});

// Validación para actualizar comentario
export const updateCommentSchema = z.object({
  content: commentContentSchema,
});

// Validación para reacción
export const createReactionSchema = z.object({
  type: z.enum(['like']),
});

// Validación para paginación
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

// Validación para búsqueda
export const searchSchema = z.object({
  q: z.string().min(1, 'Query de búsqueda requerido').max(100),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// Validación para filtros de posts
export const postFiltersSchema = z.object({
  authorId: z.string().optional(),
  search: z.string().optional(),
});

// ============================================
// ESQUEMAS PARA FASE 2 (Imágenes y Archivos)
// ============================================

// Validación de imagen (Fase 2)
export const imageSchema = z.object({
  fileName: z.string(),
  fileSize: z.number().max(5 * 1024 * 1024, 'La imagen no puede exceder 5MB'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif']),
});

// Validación de archivo PDF (Fase 2)
export const attachmentSchema = z.object({
  fileName: z.string(),
  fileSize: z
    .number()
    .max(10 * 1024 * 1024, 'El archivo no puede exceder 10MB'),
  mimeType: z.literal('application/pdf'),
});

// Validación para crear post con archivos (Fase 2)
export const createPostWithFilesSchema = z.object({
  content: postContentSchema,
  organizationId: z.string().min(1, 'organizationId es requerido'),
  images: z
    .array(imageSchema)
    .max(5, 'Máximo 5 imágenes permitidas')
    .optional(),
  attachments: z
    .array(attachmentSchema)
    .max(3, 'Máximo 3 archivos PDF permitidos')
    .optional(),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateReactionInput = z.infer<typeof createReactionSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type PostFiltersInput = z.infer<typeof postFiltersSchema>;
