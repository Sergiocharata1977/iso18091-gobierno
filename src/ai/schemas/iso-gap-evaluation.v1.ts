import { z } from 'zod';

import {
  baseContractSchema,
  isoClauseRefSchema,
  prioridadSchema,
  severidadSchema,
} from './common';

export const isoGapEvaluationSchemaV1 = baseContractSchema.extend({
  contract_id: z.literal('iso_gap_evaluation_v1'),
  version: z.literal('v1'),
  resumen_ejecutivo: z.string().min(20),
  puntaje_cumplimiento: z.number().min(0).max(100),
  estado_general: z.enum(['cumple', 'parcial', 'no_cumple']),
  fortalezas: z.array(z.string().min(1)).min(1),
  hallazgos: z
    .array(
      z.object({
        id: z.string().min(1),
        severidad: severidadSchema,
        clausula_iso: isoClauseRefSchema,
        descripcion: z.string().min(10),
        evidencia_observada: z.string().min(5),
        brecha: z.string().min(10),
        riesgo_asociado: z.string().min(10),
        accion_inmediata_sugerida: z.string().min(5),
      })
    )
    .min(1),
  prioridades_90_dias: z
    .array(
      z.object({
        prioridad: prioridadSchema,
        accion: z.string().min(5),
        clausula_iso: z.string().min(1),
        responsable_sugerido: z.string().min(2),
        plazo_dias: z.number().int().min(1).max(90),
      })
    )
    .min(1),
  supuestos: z.array(z.string().min(1)),
  advertencias: z.array(z.string().min(1)),
});

export type IsoGapEvaluationOutputV1 = z.infer<typeof isoGapEvaluationSchemaV1>;
