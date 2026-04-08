import { z } from 'zod';

export type GovServicioCategoria =
  | 'tramite'
  | 'consulta'
  | 'habilitacion'
  | 'beneficio'
  | 'otro';

export type GovServicioEstado = 'activo' | 'inactivo' | 'borrador';

export interface GovServicio {
  id: string;
  organization_id: string;
  nombre: string;
  descripcion: string;
  area: string;
  sla_dias: number;
  requisitos: string[];
  categoria: GovServicioCategoria;
  estado: GovServicioEstado;
  publico: boolean;
  created_at: string;
  updated_at: string;
}

export const GovServicioCreateSchema = z.object({
  nombre: z.string().min(3).max(150),
  descripcion: z.string().min(10),
  area: z.string().min(2),
  sla_dias: z.number().int().min(1).max(365),
  requisitos: z.array(z.string()).default([]),
  categoria: z.enum([
    'tramite',
    'consulta',
    'habilitacion',
    'beneficio',
    'otro',
  ]),
  publico: z.boolean().default(false),
});

export const GovServicioUpdateSchema = GovServicioCreateSchema.partial().extend({
  estado: z.enum(['activo', 'inactivo', 'borrador']).optional(),
});

export type GovServicioCreateInput = z.infer<typeof GovServicioCreateSchema>;
export type GovServicioUpdateInput = z.infer<typeof GovServicioUpdateSchema>;
