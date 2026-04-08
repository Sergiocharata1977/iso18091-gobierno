import { z } from 'zod';

export const CreateCalendarEventSchema = z.object({
  organization_id: z.string().optional(),
  title: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(2000),
  eventType: z.enum([
    'audit',
    'meeting',
    'training',
    'deadline',
    'review',
    'other',
  ]),
  startDate: z.date().or(z.string().datetime()),
  endDate: z.date().or(z.string().datetime()),
  location: z.string().max(200).optional(),
  attendees: z
    .array(z.string().uuid())
    .min(1, 'Debe haber al menos un asistente'),
  relatedModule: z.string().min(2),
  relatedEntityId: z.string().uuid().optional(),
  reminders: z.array(z.number().min(0)).optional(),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

export const UpdateCalendarEventSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  eventType: z
    .enum(['audit', 'meeting', 'training', 'deadline', 'review', 'other'])
    .optional(),
  status: z
    .enum(['scheduled', 'in_progress', 'completed', 'cancelled'])
    .optional(),
  startDate: z.date().or(z.string().datetime()).optional(),
  endDate: z.date().or(z.string().datetime()).optional(),
  location: z.string().max(200).optional(),
  attendees: z.array(z.string().uuid()).optional(),
  reminders: z.array(z.number().min(0)).optional(),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

export const CalendarEventFiltersSchema = z.object({
  eventType: z
    .enum(['audit', 'meeting', 'training', 'deadline', 'review', 'other'])
    .optional(),
  status: z
    .enum(['scheduled', 'in_progress', 'completed', 'cancelled'])
    .optional(),
  relatedModule: z.string().optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.date().or(z.string().datetime()).optional(),
  dateTo: z.date().or(z.string().datetime()).optional(),
  search: z.string().optional(),
});
