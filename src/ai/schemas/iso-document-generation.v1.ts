import { z } from 'zod';

import { baseContractSchema } from './common';

export const isoDocumentGenerationSchemaV1 = baseContractSchema.extend({
  contract_id: z.literal('iso_document_generation_v1'),
  version: z.literal('v1'),
  tipo_documento: z.enum([
    'politica',
    'procedimiento',
    'instructivo',
    'formato',
    'manual',
    'plan',
    'registro',
  ]),
  titulo_propuesto: z.string().min(5),
  objetivo_documento: z.string().min(10),
  audiencia: z.string().min(3),
  tono: z.enum(['formal', 'tecnico', 'operativo']),
  clausulas_iso_relacionadas: z.array(z.string().min(1)).min(1),
  requisitos_entrada: z
    .array(
      z.object({
        campo: z.string().min(1),
        descripcion: z.string().min(5),
        obligatorio: z.boolean(),
        ejemplo: z.string().min(1),
      })
    )
    .min(1),
  estructura: z
    .array(
      z.object({
        orden: z.number().int().min(1),
        titulo: z.string().min(2),
        objetivo_seccion: z.string().min(5),
        puntos_clave: z.array(z.string().min(1)).min(1),
        evidencia_sugerida: z.array(z.string().min(1)),
        longitud_sugerida_palabras: z.number().int().min(30).max(2000),
      })
    )
    .min(3),
  criterios_calidad: z.array(z.string().min(1)).min(1),
  notas_redaccion: z.string().min(5),
  salida_final_recomendada: z.enum([
    'json_estructura',
    'texto_documento',
    'mixto',
  ]),
});

export type IsoDocumentGenerationOutputV1 = z.infer<
  typeof isoDocumentGenerationSchemaV1
>;
