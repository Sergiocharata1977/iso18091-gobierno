import { z } from 'zod';

// ============================================
// SCHEMAS BASE
// ============================================

export const EventTypeSchema = z.enum([
  'audit',
  'document_expiry',
  'action_deadline',
  'training',
  'evaluation',
  'meeting',
  'general',
]);

export const SourceModuleSchema = z.enum([
  'audits',
  'documents',
  'actions',
  'trainings',
  'evaluations',
  'custom',
]);

export const EventStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'overdue',
]);

export const EventPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

export const RecurrenceFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'yearly',
]);

// ============================================
// SCHEMAS DE OBJETOS ANIDADOS
// ============================================

export const NotificationScheduleSchema = z.object({
  sevenDaysBefore: z.boolean(),
  oneDayBefore: z.boolean(),
  onEventDay: z.boolean(),
  customDays: z.array(z.number().int().positive()).nullable(),
});

export const RecurrenceRuleSchema = z.object({
  frequency: RecurrenceFrequencySchema,
  interval: z.number().int().positive().min(1),
  endDate: z.date().nullable(),
  occurrences: z.number().int().positive().nullable(),
});

// ============================================
// SCHEMA PRINCIPAL DE EVENTO
// ============================================

export const CalendarEventSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200),
  description: z.string().max(1000).nullable(),
  date: z.date(),
  endDate: z.date().nullable(),
  type: EventTypeSchema,
  sourceModule: SourceModuleSchema,
  status: EventStatusSchema.optional().default('scheduled'),
  priority: EventPrioritySchema,
  sourceRecordId: z.string().min(1),
  sourceRecordType: z.string().min(1),
  sourceRecordNumber: z.string().nullable(),
  responsibleUserId: z.string().nullable(),
  responsibleUserName: z.string().nullable(),
  participantIds: z.array(z.string()).nullable(),
  organizationId: z.string().min(1),
  processId: z.string().nullable(),
  processName: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  notificationSchedule: NotificationScheduleSchema.nullable(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: RecurrenceRuleSchema.nullable(),
  createdBy: z.string().min(1),
  createdByName: z.string().min(1),
  isSystemGenerated: z.boolean(),
});

// ============================================
// SCHEMA PARA PUBLICACIÓN DESDE MÓDULOS
// ============================================

export const PublishEventSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200),
  description: z.string().max(1000).nullable(),
  date: z.date(),
  endDate: z.date().nullable().optional(),
  type: EventTypeSchema,
  sourceRecordId: z.string().min(1),
  sourceRecordType: z.string().min(1),
  sourceRecordNumber: z.string().nullable().optional(),
  responsibleUserId: z.string().nullable().optional(),
  responsibleUserName: z.string().nullable().optional(),
  participantIds: z.array(z.string()).nullable().optional(),
  priority: EventPrioritySchema,
  processId: z.string().nullable().optional(),
  processName: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

// ============================================
// SCHEMA PARA ACTUALIZACIÓN
// ============================================

export const CalendarEventUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  date: z.date().optional(),
  endDate: z.date().nullable().optional(),
  status: EventStatusSchema.optional(),
  priority: EventPrioritySchema.optional(),
  responsibleUserId: z.string().nullable().optional(),
  responsibleUserName: z.string().nullable().optional(),
  participantIds: z.array(z.string()).nullable().optional(),
  processId: z.string().nullable().optional(),
  processName: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  notificationSchedule: NotificationScheduleSchema.nullable().optional(),
});

// ============================================
// SCHEMA PARA EVENTOS PERSONALES
// ============================================

export const PersonalEventFormSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200),
  description: z.string().max(1000).optional(),
  date: z.date(),
  endDate: z.date().nullable().optional(),
  type: z.enum(['meeting', 'general']),
  priority: EventPrioritySchema.default('medium'),
  isRecurring: z.boolean().default(false),
  recurrenceRule: RecurrenceRuleSchema.nullable().optional(),
});

// ============================================
// SCHEMA PARA FILTROS
// ============================================

export const EventFiltersSchema = z.object({
  type: z.union([EventTypeSchema, z.array(EventTypeSchema)]).optional(),
  sourceModule: z
    .union([SourceModuleSchema, z.array(SourceModuleSchema)])
    .optional(),
  status: z.union([EventStatusSchema, z.array(EventStatusSchema)]).optional(),
  priority: z
    .union([EventPrioritySchema, z.array(EventPrioritySchema)])
    .optional(),
  responsibleUserId: z.string().optional(),
  processId: z.string().optional(),
  isSystemGenerated: z.boolean().optional(),
  search: z.string().optional(),
});

// ============================================
// SCHEMA PARA RANGO DE FECHAS
// ============================================

export const DateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

// Validación adicional: endDate debe ser después de startDate
export const DateRangeWithValidationSchema = DateRangeSchema.refine(
  data => data.endDate >= data.startDate,
  {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['endDate'],
  }
);

// ============================================
// SCHEMA PARA QUERY PARAMS DE API
// ============================================

export const EventsQueryParamsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.string().optional(),
  sourceModule: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  responsibleUserId: z.string().optional(),
  processId: z.string().optional(),
  isSystemGenerated: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
});

// ============================================
// SCHEMA PARA PREFERENCIAS DE NOTIFICACIÓN
// ============================================

export const NotificationPreferencesSchema = z.object({
  enabled: z.boolean().default(true),
  sevenDaysBefore: z.boolean().default(true),
  oneDayBefore: z.boolean().default(true),
  onEventDay: z.boolean().default(true),
  customDays: z.array(z.number().int().positive()).nullable().optional(),
  emailNotifications: z.boolean().default(false),
  inAppNotifications: z.boolean().default(true),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type CalendarEventFormData = z.infer<typeof CalendarEventSchema>;
export type PublishEventFormData = z.infer<typeof PublishEventSchema>;
export type CalendarEventUpdateFormData = z.infer<
  typeof CalendarEventUpdateSchema
>;
export type PersonalEventFormData = z.infer<typeof PersonalEventFormSchema>;
export type EventFiltersFormData = z.infer<typeof EventFiltersSchema>;
export type DateRangeFormData = z.infer<typeof DateRangeSchema>;
export type NotificationPreferencesFormData = z.infer<
  typeof NotificationPreferencesSchema
>;
