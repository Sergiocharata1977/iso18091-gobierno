import { z } from 'zod';

export const CreateActionSchema = z.object({
  title: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(2000),
  findingId: z.string().uuid('ID de hallazgo inválido'),
  responsibleId: z.string().uuid('ID de responsable inválido'),
  dueDate: z.date().or(z.string().datetime()),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  estimatedCost: z.number().min(0).optional(),
  resources: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateActionExecutionSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  progressPercentage: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
  attachments: z.array(z.string()).optional(),
});

export const VerifyEffectivenessSchema = z.object({
  isEffective: z.boolean(),
  verificationDate: z.date().or(z.string().datetime()),
  verificationNotes: z.string().max(1000),
  evidenceAttachments: z.array(z.string()).optional(),
  followUpRequired: z.boolean().default(false),
  followUpDescription: z.string().max(1000).optional(),
});

export const ActionFiltersSchema = z.object({
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  responsibleId: z.string().uuid().optional(),
  findingId: z.string().uuid().optional(),
  dueDateFrom: z.date().or(z.string().datetime()).optional(),
  dueDateTo: z.date().or(z.string().datetime()).optional(),
  isEffective: z.boolean().optional(),
  search: z.string().optional(),
});

export const ActionStatsFiltersSchema = z.object({
  responsibleId: z.string().uuid().optional(),
  findingId: z.string().uuid().optional(),
  dateFrom: z.date().or(z.string().datetime()).optional(),
  dateTo: z.date().or(z.string().datetime()).optional(),
});
