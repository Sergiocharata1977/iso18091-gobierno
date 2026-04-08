/**
 * Finding Module Validations
 *
 * Esquemas Zod para validación de datos de hallazgos
 */

import { z } from 'zod';

/**
 * Schema para crear hallazgo
 */
export const CreateFindingSchema = z.object({
  origin: z.enum(['audit', 'internal', 'customer', 'supplier', 'other']),
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(255),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  processId: z.string().optional().nullable(),
  processName: z.string().optional().nullable(),
  source: z.string().min(1, 'La fuente es requerida'),
  sourceId: z.string().optional().nullable(),
});

/**
 * Schema para actualizar planificación de acción inmediata
 */
export const UpdateFindingImmediateActionPlanningSchema = z.object({
  responsiblePersonId: z
    .string()
    .min(1, 'El ID de la persona responsable es requerido'),
  responsiblePersonName: z
    .string()
    .min(1, 'El nombre de la persona responsable es requerido'),
  plannedDate: z.date(),
  comments: z.string().optional().nullable(),
});

/**
 * Schema para actualizar ejecución de acción inmediata
 */
export const UpdateFindingImmediateActionExecutionSchema = z.object({
  executionDate: z.date(),
  correction: z
    .string()
    .min(10, 'La corrección debe tener al menos 10 caracteres'),
});

/**
 * Schema para actualizar análisis de causa raíz
 */
export const UpdateFindingRootCauseAnalysisSchema = z.object({
  analysis: z.string().min(20, 'El análisis debe tener al menos 20 caracteres'),
  requiresAction: z.boolean(),
});

/**
 * Schema para filtros de búsqueda
 */
export const FindingFiltersSchema = z.object({
  status: z
    .enum([
      'registrado',
      'accion_planificada',
      'accion_ejecutada',
      'analisis_completado',
      'cerrado',
    ])
    .optional(),
  processId: z.string().optional(),
  sourceId: z.string().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  search: z.string().optional(),
  requiresAction: z.boolean().optional(),
});
