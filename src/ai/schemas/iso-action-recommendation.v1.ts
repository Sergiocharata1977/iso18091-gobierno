import { z } from 'zod';

import {
  baseContractSchema,
  esfuerzoSchema,
  impactoSchema,
  prioridadSchema,
} from './common';

export const isoActionRecommendationSchemaV1 = baseContractSchema.extend({
  contract_id: z.literal('iso_action_recommendation_v1'),
  version: z.literal('v1'),
  origen: z.enum([
    'no_conformidad',
    'auditoria',
    'riesgo',
    'indicador',
    'mejora',
  ]),
  resumen_contexto: z.string().min(20),
  acciones_recomendadas: z
    .array(
      z.object({
        id: z.string().min(1),
        tipo_accion: z.enum([
          'correccion',
          'correctiva',
          'preventiva',
          'mejora',
        ]),
        prioridad: prioridadSchema,
        descripcion: z.string().min(10),
        justificacion: z.string().min(10),
        impacto: impactoSchema,
        esfuerzo: esfuerzoSchema,
        responsable_rol: z.string().min(2),
        plazo_dias: z.number().int().min(1).max(365),
        dependencias: z.array(z.string().min(1)),
        criterio_verificacion: z.string().min(5),
        clausulas_iso_relacionadas: z.array(z.string().min(1)).min(1),
      })
    )
    .min(1),
  quick_wins: z.array(z.string().min(1)),
  secuencia_implementacion: z.array(z.string().min(1)).min(1),
  riesgos_implementacion: z.array(
    z.object({
      riesgo: z.string().min(5),
      mitigacion: z.string().min(5),
    })
  ),
  seguimiento_kpis: z.array(
    z.object({
      indicador: z.string().min(1),
      objetivo: z.string().min(1),
      frecuencia: z.enum(['diaria', 'semanal', 'mensual', 'trimestral']),
    })
  ),
  advertencias: z.array(z.string().min(1)),
});

export type IsoActionRecommendationOutputV1 = z.infer<
  typeof isoActionRecommendationSchemaV1
>;
