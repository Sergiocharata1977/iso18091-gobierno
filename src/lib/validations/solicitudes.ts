import { z } from 'zod';
import {
  SOLICITUD_CRM_SYNC_STATUSES,
  SOLICITUD_ESTADOS,
  SOLICITUD_ESTADOS_OPERATIVOS,
  SOLICITUD_FLUJOS,
  SOLICITUD_PRIORIDADES,
  SOLICITUD_TIPOS,
} from '@/types/solicitudes';

export const SolicitudTipoSchema = z.enum(SOLICITUD_TIPOS);

export const SolicitudFlujoSchema = z.enum(SOLICITUD_FLUJOS);

export const SolicitudEstadoSchema = z.enum(SOLICITUD_ESTADOS);

export const SolicitudEstadoOperativoSchema = z.enum(
  SOLICITUD_ESTADOS_OPERATIVOS
);

export const SolicitudPrioridadSchema = z.enum(SOLICITUD_PRIORIDADES);

const OptionalNullableTrimmedString = z
  .union([z.string().trim().min(1), z.literal(''), z.null()])
  .optional()
  .transform(value => {
    if (value === undefined) return undefined;
    if (value === '' || value === null) return null;
    return value;
  });

export const PublicSolicitudBodySchema = z
  .object({
    tipo: SolicitudTipoSchema,
    prioridad: SolicitudPrioridadSchema.optional().nullable(),
    nombre: z.string().trim().min(2).max(160).optional(),
    name: z.string().trim().min(2).max(160).optional(),
    telefono: z.string().trim().min(6).max(40).optional().nullable(),
    phone: z.string().trim().min(6).max(40).optional().nullable(),
    email: z.string().trim().email().optional().nullable(),
    cuit: z.string().trim().min(7).max(20).optional().nullable(),
    mensaje: z.string().trim().max(4000).optional().nullable(),
    message: z.string().trim().max(4000).optional().nullable(),
    payload: z.record(z.string(), z.unknown()).optional(),
    origen: z.string().trim().min(1).max(80).optional(),
  })
  .transform(data => ({
    tipo: data.tipo,
    prioridad: data.prioridad ?? null,
    nombre: data.nombre || data.name || '',
    telefono: data.telefono ?? data.phone ?? null,
    email: data.email ?? null,
    cuit: data.cuit ?? null,
    mensaje: data.mensaje ?? data.message ?? null,
    payload: data.payload || {},
    origen: data.origen || 'public_api',
  }))
  .refine(data => data.nombre.length >= 2, {
    message: 'El nombre es requerido',
    path: ['nombre'],
  })
  .refine(data => Boolean(data.telefono || data.email), {
    message: 'Debe informar telefono o email',
    path: ['telefono'],
  });

export const SolicitudListQuerySchema = z.object({
  tipo: SolicitudTipoSchema.optional(),
  flujo: SolicitudFlujoSchema.optional(),
  estado: SolicitudEstadoSchema.optional(),
  estado_operativo: SolicitudEstadoOperativoSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  includeCommercialReferences: z.coerce.boolean().optional(),
});

export const UpdateSolicitudBodySchema = z
  .object({
    estado: SolicitudEstadoSchema.optional(),
    estado_operativo: SolicitudEstadoOperativoSchema.optional(),
    prioridad: SolicitudPrioridadSchema.optional().nullable(),
    assigned_to: OptionalNullableTrimmedString,
    crm_cliente_id: OptionalNullableTrimmedString,
    crm_contacto_id: OptionalNullableTrimmedString,
    crm_oportunidad_id: OptionalNullableTrimmedString,
    crm_sync_status: z.enum(SOLICITUD_CRM_SYNC_STATUSES).optional().nullable(),
    crm_sync_at: z.coerce.date().optional().nullable(),
    crm_sync_error: OptionalNullableTrimmedString,
  })
  .refine(
    data =>
      data.estado !== undefined ||
      data.estado_operativo !== undefined ||
      data.prioridad !== undefined ||
      data.assigned_to !== undefined ||
      data.crm_cliente_id !== undefined ||
      data.crm_contacto_id !== undefined ||
      data.crm_oportunidad_id !== undefined ||
      data.crm_sync_status !== undefined ||
      data.crm_sync_at !== undefined ||
      data.crm_sync_error !== undefined,
    {
      message: 'Debe enviar al menos un campo para actualizar',
    }
  );

export type PublicSolicitudBody = z.infer<typeof PublicSolicitudBodySchema>;
export type SolicitudListQuery = z.infer<typeof SolicitudListQuerySchema>;
export type UpdateSolicitudBody = z.infer<typeof UpdateSolicitudBodySchema>;
