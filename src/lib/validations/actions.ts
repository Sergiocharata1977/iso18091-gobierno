import { z } from 'zod';

// ============================================
// SCHEMAS DE ENUMS
// ============================================

export const ActionTypeSchema = z.enum(['correctiva', 'preventiva', 'mejora']);

export const ActionPrioritySchema = z.enum([
  'baja',
  'media',
  'alta',
  'critica',
]);

export const ActionStatusSchema = z.enum([
  'planificada',
  'ejecutada',
  'en_control',
  'completada',
  'cancelada',
]);

export const ActionSourceTypeSchema = z.enum([
  'manual',
  'hallazgo',
  'auditoria',
  'otro',
]);

// ============================================
// SCHEMA DE FORMULARIO 1: PLANIFICACIÓN INICIAL
// ============================================

export const ActionFormSchema = z.object({
  // Información básica
  organization_id: z.string().min(1, 'Organization ID is required'),
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'El título no puede exceder 200 caracteres'),

  description: z
    .string()
    .min(1, 'La descripción es requerida')
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),

  // Clasificación
  actionType: ActionTypeSchema,
  priority: ActionPrioritySchema,

  // Origen
  sourceType: ActionSourceTypeSchema,
  sourceName: z.string().min(1, 'El nombre del origen es requerido'),
  findingId: z.string().optional(),
  findingNumber: z.string().optional(),

  // Proceso
  processId: z.string().min(1, 'El proceso es requerido'),
  processName: z.string().min(1, 'El nombre del proceso es requerido'),

  // Planificación de la acción
  implementationResponsibleId: z
    .string()
    .min(1, 'El responsable de implementación es requerido'),
  implementationResponsibleName: z
    .string()
    .min(1, 'El nombre del responsable es requerido'),
  plannedExecutionDate: z.date(),
  planningObservations: z.string().optional(),
});

// ============================================
// SCHEMA DE FORMULARIO 2: EJECUCIÓN
// ============================================

export const ActionExecutionSchema = z.object({
  executionDate: z.date(),
  comments: z.string().optional(),
});

// ============================================
// SCHEMA DE FORMULARIO 3: PLANIFICACIÓN DEL CONTROL
// ============================================

export const ActionControlPlanningSchema = z.object({
  responsiblePersonId: z
    .string()
    .min(1, 'El responsable del control es requerido'),
  responsiblePersonName: z
    .string()
    .min(1, 'El nombre del responsable es requerido'),
  plannedDate: z.date(),
  effectivenessCriteria: z
    .string()
    .min(1, 'El criterio de efectividad es requerido'),
  comments: z.string().optional(),
});

// ============================================
// SCHEMA DE FORMULARIO 4: EJECUCIÓN DEL CONTROL
// ============================================

export const ActionControlExecutionSchema = z.object({
  executionDate: z.date(),
  verificationResult: z
    .string()
    .min(1, 'El resultado de la verificación es requerido'),
  isEffective: z.boolean(),
  comments: z.string().optional(),
});

// ============================================
// SCHEMA DE FILTROS
// ============================================

export const ActionFiltersSchema = z.object({
  organization_id: z.string().optional(),
  status: ActionStatusSchema.optional(),
  actionType: ActionTypeSchema.optional(),
  priority: ActionPrioritySchema.optional(),
  responsiblePersonId: z.string().optional(),
  processId: z.string().optional(),
  findingId: z.string().optional(),
  year: z.number().optional(),
  search: z.string().optional(),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type ActionFormInput = z.infer<typeof ActionFormSchema>;
export type ActionExecutionInput = z.infer<typeof ActionExecutionSchema>;
export type ActionControlPlanningInput = z.infer<
  typeof ActionControlPlanningSchema
>;
export type ActionControlExecutionInput = z.infer<
  typeof ActionControlExecutionSchema
>;
export type ActionFiltersInput = z.infer<typeof ActionFiltersSchema>;
