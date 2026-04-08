import { z } from 'zod';

export const DocumentTypeSchema = z.enum([
  'manual',
  'procedimiento',
  'instruccion',
  'formato',
  'registro',
  'politica',
  'otro',
]);

export const DocumentStatusSchema = z.enum([
  'borrador',
  'en_revision',
  'aprobado',
  'publicado',
  'obsoleto',
]);

export const DocumentSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  code: z.string().min(1, 'Code is required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  type: DocumentTypeSchema,
  category: z.string().optional(),
  status: DocumentStatusSchema,
  version: z.string().regex(/^\d+\.\d+$/, 'Version must be in format X.Y'),
  responsible_user_id: z.string().min(1, 'Responsible user is required'),
  distribution_list: z.array(z.string()).optional(),
  iso_clause: z.string().optional(),
  process_id: z.string().optional(),
  norm_point_ids: z.array(z.string()).optional(),
  file_path: z.string().optional(),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
  effective_date: z.date().optional(),
  review_date: z.date().optional(),
  approved_at: z.date().optional(),
  approved_by: z.string().optional(),
  download_count: z.number().default(0),
  is_archived: z.boolean().default(false),
  created_by: z.string().min(1),
  updated_by: z.string().min(1),
});

export const DocumentCreateSchema = DocumentSchema.omit({
  code: true,
  download_count: true,
  is_archived: true,
});

export const DocumentUpdateSchema = DocumentSchema.partial().required({
  updated_by: true,
});

export const DocumentStatusChangeSchema = z.object({
  status: DocumentStatusSchema,
  user_id: z.string().min(1),
});

export const DocumentVersionSchema = z.object({
  change_reason: z.string().min(1, 'Change reason is required'),
  user_id: z.string().min(1),
});

export const DocumentFileUploadSchema = z.object({
  file: z.instanceof(File),
  document_id: z.string().min(1),
});
