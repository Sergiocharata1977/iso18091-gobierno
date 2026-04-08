import { z } from 'zod';

export const CreatePostSchema = z.object({
  organization_id: z.string().optional(),
  title: z
    .string()
    .min(3, 'El titulo debe tener al menos 3 caracteres')
    .max(200),
  content: z
    .string()
    .min(10, 'El contenido debe tener al menos 10 caracteres')
    .max(5000),
  tags: z.array(z.string()).optional(),
});

export const CreateCommentSchema = z.object({
  organization_id: z.string().optional(),
  postId: z.string().uuid('ID de post invalido'),
  content: z.string().min(1, 'El comentario no puede estar vacio').max(1000),
});

export const CreateReactionSchema = z.object({
  organization_id: z.string().optional(),
  postId: z.string().uuid('ID de post invalido'),
  userId: z.string().uuid('ID de usuario invalido'),
  reactionType: z.enum(['like', 'love', 'haha', 'wow', 'sad', 'angry']),
});

export const PostFiltersSchema = z.object({
  tags: z.array(z.string()).optional(),
  author: z.string().uuid().optional(),
  search: z.string().optional(),
  dateFrom: z.date().or(z.string().datetime()).optional(),
  dateTo: z.date().or(z.string().datetime()).optional(),
});
