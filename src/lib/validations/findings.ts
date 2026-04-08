import { z } from 'zod';

// ============================================
// SCHEMA DE FORMULARIO 1: ALTA DEL HALLAZGO
// ============================================

export const FindingFormSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  // Fuente polimórfica
  sourceType: z.enum([
    'auditoria',
    'encuesta',
    'declaracion',
    'inspeccion',
    'reclamo',
    'otro',
  ]),
  sourceId: z.string().optional(),
  sourceName: z.string().optional(),
  // Puntos de norma relacionados
  normPoints: z.array(z.string()).optional(),
  // Información básica
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  description: z
    .string()
    .min(1, 'La descripción es requerida')
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),
  // Proceso relacionado
  processId: z.string().min(1, 'El proceso es requerido'),
  processName: z.string().min(1, 'El nombre del proceso es requerido'),
});

// ============================================
// SCHEMA DE FORMULARIO 2: PLANIFICACIÓN DE ACCIÓN INMEDIATA
// ============================================

export const FindingImmediateActionPlanningSchema = z.object({
  responsiblePersonId: z
    .string()
    .min(1, 'El responsable de la acción es requerido'),
  responsiblePersonName: z
    .string()
    .min(1, 'El nombre del responsable es requerido'),
  plannedDate: z.date(),
  comments: z.string().optional(),
});

// ============================================
// SCHEMA DE FORMULARIO 3: EJECUCIÓN DE ACCIÓN INMEDIATA
// ============================================

export const FindingImmediateActionExecutionSchema = z.object({
  executionDate: z.date(),
  correction: z
    .string()
    .min(1, 'La corrección es requerida')
    .max(2000, 'La corrección no puede exceder 2000 caracteres'),
});

// ============================================
// SCHEMA DE FORMULARIO 4: ANÁLISIS DE CAUSA RAÍZ
// ============================================

export const FindingRootCauseAnalysisSchema = z.object({
  analysis: z
    .string()
    .min(1, 'El análisis de causa raíz es requerido')
    .max(5000, 'El análisis no puede exceder 5000 caracteres'),
  requiresAction: z.boolean(),
});

// ============================================
// SCHEMA DE FILTROS
// ============================================

export const FindingFiltersSchema = z.object({
  organization_id: z.string().optional(),
  status: z.enum(['registrado', 'en_tratamiento', 'cerrado']).optional(),
  processId: z.string().optional(),
  year: z.number().optional(),
  search: z.string().optional(),
  requiresAction: z.boolean().optional(),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type FindingFormInput = z.infer<typeof FindingFormSchema>;
export type FindingImmediateActionPlanningInput = z.infer<
  typeof FindingImmediateActionPlanningSchema
>;
export type FindingImmediateActionExecutionInput = z.infer<
  typeof FindingImmediateActionExecutionSchema
>;
export type FindingRootCauseAnalysisInput = z.infer<
  typeof FindingRootCauseAnalysisSchema
>;
export type FindingFiltersInput = z.infer<typeof FindingFiltersSchema>;
