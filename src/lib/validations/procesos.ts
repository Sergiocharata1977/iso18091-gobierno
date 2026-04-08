import { z } from 'zod';

// Process Definition schemas
export const processDefinitionSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(50, 'Máximo 50 caracteres'),
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(200, 'Máximo 200 caracteres'),
  objetivo: z
    .string()
    .min(1, 'El objetivo es requerido')
    .max(1000, 'Máximo 1000 caracteres'),
  alcance: z
    .string()
    .min(1, 'El alcance es requerido')
    .max(1000, 'Máximo 1000 caracteres'),
  responsable: z
    .string()
    .min(1, 'El responsable es requerido')
    .max(100, 'Máximo 100 caracteres'),
  entradas: z.array(z.object({ value: z.string() })),
  salidas: z.array(z.object({ value: z.string() })),
  controles: z.array(z.object({ value: z.string() })),
  indicadores: z.array(z.object({ value: z.string() })),
  documentos: z.array(z.object({ value: z.string() })),
  estado: z.enum(['activo', 'inactivo']),
});

export const processDefinitionFormSchema = processDefinitionSchema.transform(
  data => ({
    ...data,
    entradas: data.entradas || [],
    salidas: data.salidas || [],
    controles: data.controles || [],
    indicadores: data.indicadores || [],
    documentos: data.documentos || [],
    estado: data.estado || 'activo',
  })
);

// Process Record schemas
export const processRecordSchema = z.object({
  processId: z.string().min(1, 'El ID del proceso es requerido'),
  titulo: z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'Máximo 200 caracteres'),
  descripcion: z
    .string()
    .min(1, 'La descripción es requerida')
    .max(1000, 'Máximo 1000 caracteres'),
  estado: z.enum(['pendiente', 'en-progreso', 'completado']),
  responsable: z
    .string()
    .min(1, 'El responsable es requerido')
    .max(100, 'Máximo 100 caracteres'),
  fecha_vencimiento: z.date(),
  prioridad: z.enum(['baja', 'media', 'alta']),
});

export const processRecordFormSchema = processRecordSchema;

// Filter schemas
export const processDefinitionFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z.enum(['activo', 'inactivo']).optional(),
  responsable: z.string().optional(),
});

export const processRecordFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z.enum(['pendiente', 'en-progreso', 'completado']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta']).optional(),
});

// Type exports
export type ProcessDefinitionFormData = z.infer<typeof processDefinitionSchema>;
export type ProcessRecordFormData = z.infer<typeof processRecordFormSchema>;

export type ProcessDefinitionFilters = z.infer<
  typeof processDefinitionFiltersSchema
>;
export type ProcessRecordFilters = z.infer<typeof processRecordFiltersSchema>;
