import { z } from 'zod';

export const maturityBandSchema = z.enum(['B1', 'B2', 'B3']);

export const prioridadSchema = z.enum(['alta', 'media', 'baja']);
export const severidadSchema = z.enum(['critica', 'alta', 'media', 'baja']);
export const impactoSchema = z.enum(['alto', 'medio', 'bajo']);
export const esfuerzoSchema = z.enum(['alto', 'medio', 'bajo']);

export const isoClauseCodeSchema = z
  .string()
  .min(1, 'La cláusula ISO es requerida')
  .regex(/^\d+(?:\.\d+)*$/, 'Formato de cláusula ISO inválido (ej. 8.5.1)');

export const isoClauseRefSchema = z.object({
  codigo: isoClauseCodeSchema,
  titulo: z.string().min(1, 'El título de cláusula es requerido'),
  relevancia: z.string().min(1, 'La relevancia es requerida'),
});

export const nonEmptyStringArraySchema = z.array(z.string().min(1)).min(1);

export const baseContractSchema = z.object({
  idioma: z.literal('es'),
  nivel_madurez: maturityBandSchema,
  confianza_modelo: z.number().min(0).max(1),
});

export type MaturityBand = z.infer<typeof maturityBandSchema>;
