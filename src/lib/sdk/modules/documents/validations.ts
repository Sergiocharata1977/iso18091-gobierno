import { z } from 'zod';

export const CreateDocumentSchema = z.object({
  organization_id: z.string().optional(),
  title: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(1000),
  content: z
    .string()
    .min(20, 'El contenido debe tener al menos 20 caracteres')
    .max(50000),
  category: z
    .string()
    .min(2, 'La categoría debe tener al menos 2 caracteres')
    .max(100),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
  relatedDocuments: z.array(z.string().uuid()).optional(),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(1000).optional(),
  content: z.string().min(20).max(50000).optional(),
  category: z.string().min(2).max(100).optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
  relatedDocuments: z.array(z.string().uuid()).optional(),
});

export const CreateVersionSchema = z.object({
  content: z
    .string()
    .min(20, 'El contenido debe tener al menos 20 caracteres')
    .max(50000),
  changesSummary: z
    .string()
    .min(5, 'El resumen de cambios debe tener al menos 5 caracteres')
    .max(500),
});

export const UpdateStatusSchema = z.object({
  newStatus: z.enum(['draft', 'review', 'approved', 'published', 'archived']),
  notes: z.string().max(500).optional(),
});

export const DocumentFiltersSchema = z.object({
  status: z
    .enum(['draft', 'review', 'approved', 'published', 'archived'])
    .optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().uuid().optional(),
  search: z.string().optional(),
  dateFrom: z.date().or(z.string().datetime()).optional(),
  dateTo: z.date().or(z.string().datetime()).optional(),
});
