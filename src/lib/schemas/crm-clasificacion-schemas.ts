import { z } from 'zod';

export const OpcionClasificacionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guión bajo'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  orden: z.number().int().min(0),
});

export const CreateCriterioSchema = z.object({
  nombre: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guión bajo'),
  tipo: z.enum(['select', 'multiselect']),
  aplica_a_clientes: z.boolean(),
  aplica_a_oportunidades: z.boolean(),
  opciones: z.array(OpcionClasificacionSchema).default([]),
});

export const UpdateCriterioSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
  aplica_a_clientes: z.boolean().optional(),
  aplica_a_oportunidades: z.boolean().optional(),
  opciones: z.array(OpcionClasificacionSchema).optional(),
});

export const ClasificacionesMapSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string())])
);

export const UpdateClasificacionesClienteSchema = z.object({
  classifications: ClasificacionesMapSchema,
});

export type CreateCriterioInput = z.infer<typeof CreateCriterioSchema>;
export type UpdateCriterioInput = z.infer<typeof UpdateCriterioSchema>;
