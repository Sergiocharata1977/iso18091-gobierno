import { z } from 'zod';

// Process Definition Validation - Simplificado para creación rápida
// Solo 'nombre' es requerido en el alta, todo lo demás se edita en el Single
export const processDefinitionSchema = z.object({
  codigo: z.string().max(20, 'Máximo 20 caracteres').optional(),
  nombre: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().max(500, 'Máximo 500 caracteres').optional(),
  objetivo: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  alcance: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  funciones_involucradas: z.array(z.string()).optional().default([]),
  related_norm_points: z.array(z.string()).optional().default([]),
  categoria: z.string().optional().default('calidad'),
  documento_origen_id: z.string().optional(),
  puesto_responsable_id: z.string().optional(), // Relación con puesto
  jefe_proceso_id: z.string().optional(), // Relación con Personal
  jefe_proceso_nombre: z.string().optional(), // Nombre denormalizado
  etapas_default: z
    .array(z.string())
    .optional()
    .default(['Planificación', 'Ejecución', 'Verificación', 'Cierre']),
  tipo_registros: z
    .enum(['vincular', 'crear', 'ambos'])
    .optional()
    .default('crear'),
  modulo_vinculado: z
    .enum(['mejoras', 'auditorias', 'nc'])
    .nullable()
    .optional()
    .default(null),
  activo: z.boolean().default(true),
});

// Process Record Validation
export const processRecordSchema = z.object({
  nombre: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(150, 'Máximo 150 caracteres'),
  descripcion: z
    .string()
    .min(10, 'Mínimo 10 caracteres')
    .max(1000, 'Máximo 1000 caracteres'),
  process_definition_id: z
    .string()
    .min(1, 'Debe seleccionar una definición de proceso'),
  status: z.enum(['activo', 'pausado', 'completado', 'cancelado']),
  fecha_inicio: z.date(),
  responsable_id: z.string().min(1, 'Debe asignar un responsable'),
  responsable_nombre: z
    .string()
    .min(1, 'El nombre del responsable es requerido'),
});

// Process Record Stage Validation
export const processRecordStageSchema = z.object({
  nombre: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres'),
  descripcion: z.string().max(200, 'Máximo 200 caracteres').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido'),
  orden: z.number().int().min(0, 'El orden debe ser mayor o igual a 0'),
  es_etapa_final: z.boolean().default(false),
});

// Process Record Task Validation
export const processRecordTaskSchema = z.object({
  titulo: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(150, 'Máximo 150 caracteres'),
  descripcion: z.string().max(2000, 'Máximo 2000 caracteres'),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
  asignado_a_id: z.string().optional(),
  asignado_a_nombre: z.string().optional(),
  fecha_vencimiento: z.date().optional(),
  etiquetas: z.array(z.string()).default([]),
});

// Process Record Comment Validation
export const processRecordCommentSchema = z.object({
  contenido: z
    .string()
    .min(1, 'El comentario no puede estar vacío')
    .max(1000, 'Máximo 1000 caracteres'),
});

export type ProcessDefinitionFormData = z.infer<typeof processDefinitionSchema>;
export type ProcessRecordFormData = z.infer<typeof processRecordSchema>;
export type ProcessRecordStageFormData = z.infer<
  typeof processRecordStageSchema
>;
export type ProcessRecordTaskFormData = z.infer<typeof processRecordTaskSchema>;
export type ProcessRecordCommentFormData = z.infer<
  typeof processRecordCommentSchema
>;
