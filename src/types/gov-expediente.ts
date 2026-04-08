import { z } from 'zod';

export type EstadoExpediente =
  | 'ingresado'
  | 'en_proceso'
  | 'resuelto'
  | 'cerrado'
  | 'archivado';

export type TipoExpediente =
  | 'reclamo'
  | 'solicitud'
  | 'consulta'
  | 'denuncia'
  | 'otro';

export type PrioridadExpediente = 'baja' | 'media' | 'alta' | 'urgente';

export interface GovExpediente {
  id: string;
  organization_id: string;
  numero: string;
  tipo: TipoExpediente;
  asunto: string;
  descripcion: string;
  ciudadano_id?: string;
  estado: EstadoExpediente;
  prioridad: PrioridadExpediente;
  area_responsable?: string;
  fecha_vencimiento_sla?: string;
  created_at: string;
  updated_at: string;
}

export const GovExpedienteCreateSchema = z.object({
  tipo: z.enum(['reclamo', 'solicitud', 'consulta', 'denuncia', 'otro']),
  asunto: z.string().min(5).max(200),
  descripcion: z.string().min(10),
  ciudadano_id: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).default('media'),
  area_responsable: z.string().optional(),
});

export const GovExpedienteUpdateSchema = GovExpedienteCreateSchema.partial().extend(
  {
    estado: z
      .enum(['ingresado', 'en_proceso', 'resuelto', 'cerrado', 'archivado'])
      .optional(),
    fecha_vencimiento_sla: z.string().optional(),
  }
);

export type GovExpedienteCreateInput = z.infer<
  typeof GovExpedienteCreateSchema
>;
export type GovExpedienteUpdateInput = z.infer<
  typeof GovExpedienteUpdateSchema
>;
