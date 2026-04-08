import { z } from 'zod';

import {
  baseContractSchema,
  impactoSchema,
  prioridadSchema,
  severidadSchema,
} from './common';

export const isoIndicatorAnalysisSchemaV1 = baseContractSchema.extend({
  contract_id: z.literal('iso_indicator_analysis_v1'),
  version: z.literal('v1'),
  indicador: z.object({
    nombre: z.string().min(1),
    unidad: z.string().min(1),
    periodo_analizado: z.string().min(1),
    valor_actual: z.number(),
    meta: z.number(),
    tendencia: z.enum(['mejora', 'estable', 'deterioro', 'sin_datos']),
    estado_meta: z.enum(['en_meta', 'en_riesgo', 'fuera_meta']),
    desviacion_absoluta: z.number(),
    desviacion_porcentual: z.number(),
  }),
  resumen_ejecutivo: z.string().min(20),
  hallazgos_clave: z.array(z.string().min(1)).min(1),
  causas_probables: z
    .array(
      z.object({
        causa: z.string().min(5),
        evidencia: z.string().min(5),
        impacto_estimado: impactoSchema,
      })
    )
    .min(1),
  alertas: z.array(
    z.object({
      severidad: severidadSchema,
      tipo: z.enum(['variacion', 'capacidad', 'datos', 'cumplimiento']),
      mensaje: z.string().min(5),
    })
  ),
  recomendaciones: z
    .array(
      z.object({
        prioridad: prioridadSchema,
        accion: z.string().min(5),
        impacto_esperado: z.string().min(5),
        plazo_dias: z.number().int().min(1).max(180),
      })
    )
    .min(1),
  datos_faltantes: z.array(z.string().min(1)),
});

export type IsoIndicatorAnalysisOutputV1 = z.infer<
  typeof isoIndicatorAnalysisSchemaV1
>;
