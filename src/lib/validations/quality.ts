import { z } from 'zod';

// Quality Objective schemas
export const qualityObjectiveSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(50, 'Máximo 50 caracteres'),
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'Máximo 200 caracteres'),
  description: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .default(''),
  type: z
    .enum(['estrategico', 'tactico', 'operativo'])
    .optional()
    .default('operativo'),
  target_value: z
    .number()
    .min(0, 'El valor meta debe ser positivo')
    .optional()
    .default(0),
  current_value: z
    .number()
    .min(0, 'El valor actual debe ser positivo')
    .optional()
    .default(0),
  unit: z.string().max(50, 'Máximo 50 caracteres').optional().default('%'),
  baseline_value: z
    .number()
    .min(0, 'El valor línea base debe ser positivo')
    .optional()
    .default(0),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  process_definition_id: z
    .string()
    .min(1, 'El proceso relacionado es requerido'),
  responsible_user_id: z.string().optional().default(''),
  department_id: z.string().optional(),
  team_members: z.array(z.string()).optional().default([]),
  alert_threshold: z
    .number()
    .min(0)
    .max(100, 'El umbral debe estar entre 0 y 100')
    .optional()
    .default(80),
  organization_id: z.string().optional(),
  status: z.string().optional().default('activo'),
  is_active: z.boolean().optional().default(true),
  progress_percentage: z.number().optional().default(0),
  created_by: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const qualityObjectiveFormSchema = qualityObjectiveSchema;

// Quality Indicator schemas
export const qualityIndicatorSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .max(50, 'Máximo 50 caracteres'),
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(200, 'Máximo 200 caracteres'),
  description: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional()
    .default(''),
  type: z.enum([
    'eficacia',
    'eficiencia',
    'efectividad',
    'calidad',
    'productividad',
  ]),
  formula: z.string().max(500, 'Máximo 500 caracteres').optional().default(''),
  unit: z
    .string()
    .min(1, 'La unidad es requerida')
    .max(50, 'Máximo 50 caracteres'),
  measurement_frequency: z.enum([
    'diaria',
    'semanal',
    'mensual',
    'trimestral',
    'anual',
  ]),
  target_min: z.number(),
  target_max: z.number(),
  data_source: z
    .string()
    .max(200, 'Máximo 200 caracteres')
    .optional()
    .default(''),
  calculation_method: z
    .string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .default(''),
  process_definition_id: z
    .string()
    .min(1, 'El proceso relacionado es requerido'),
  objective_id: z.string().optional(),
  responsible_user_id: z.string().optional().default(''),
  department_id: z.string().optional(),
});

export const qualityIndicatorFormSchema = qualityIndicatorSchema;

// Measurement schemas
export const measurementSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(50),
  indicator_id: z.string().min(1, 'El indicador es requerido'),
  objective_id: z.string().optional(),
  process_definition_id: z.string().min(1, 'El proceso es requerido'),

  // Datos de medición (requeridos)
  value: z.number(),
  measurement_date: z.string().min(1, 'La fecha de medición es requerida'),
  measured_by: z.string().min(1, 'Quien realizó la medición es requerido'),

  // Detalles (opcionales, editables en Single)
  measurement_method: z.string().max(500).optional().default(''),
  observations: z.string().max(1000).optional().default(''),
  evidence_url: z.string().max(500).optional().default(''),

  // Metadata
  organization_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const measurementFormSchema = measurementSchema;

// Filter schemas
export const qualityObjectiveFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['activo', 'completado', 'atrasado', 'cancelado']).optional(),
  type: z.enum(['estrategico', 'tactico', 'operativo']).optional(),
  process_definition_id: z.string().optional(),
  responsible_user_id: z.string().optional(),
});

export const qualityIndicatorFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['activo', 'inactivo', 'suspendido']).optional(),
  type: z
    .enum(['eficacia', 'eficiencia', 'efectividad', 'calidad', 'productividad'])
    .optional(),
  process_definition_id: z.string().optional(),
  objective_id: z.string().optional(),
  responsible_user_id: z.string().optional(),
});

export const measurementFiltersSchema = z.object({
  search: z.string().optional(),
  validation_status: z.enum(['pendiente', 'validado', 'rechazado']).optional(),
  indicator_id: z.string().optional(),
  objective_id: z.string().optional(),
  process_definition_id: z.string().optional(),
  measured_by: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

// Type exports
export type QualityObjectiveFormData = z.infer<
  typeof qualityObjectiveFormSchema
>;
export type QualityIndicatorFormData = z.infer<
  typeof qualityIndicatorFormSchema
>;
export type MeasurementFormData = z.infer<typeof measurementFormSchema>;

export type QualityObjectiveFilters = z.infer<
  typeof qualityObjectiveFiltersSchema
>;
export type QualityIndicatorFilters = z.infer<
  typeof qualityIndicatorFiltersSchema
>;
export type MeasurementFilters = z.infer<typeof measurementFiltersSchema>;
