import { TipoCliente } from '@/types/crm';
import { z } from 'zod';

/**
 * Schema simplificado para crear cliente
 */
export const createClienteCRMSchema = z.object({
  razon_social: z.string().min(1, 'La razón social es requerida'),
  nombre_comercial: z.string().optional(),
  cuit_cuil: z.string().min(1, 'El CUIT/CUIL es requerido'),
  tipo_cliente: z.nativeEnum(TipoCliente),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  monto_estimado_compra: z.number().min(0).optional(),
  probabilidad_conversion: z.number().min(0).max(100).optional(),
  notas: z.string().optional(),
});

/**
 * Schema para actualizar cliente CRM
 */
export const UpdateClienteCRMSchema = z.object({
  razon_social: z.string().min(1, 'La razón social es requerida').optional(),
  nombre_comercial: z.string().optional(),
  cuit_cuil: z.string().min(1, 'El CUIT/CUIL es requerido').optional(),
  tipo_cliente: z.nativeEnum(TipoCliente).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  whatsapp_phone: z.string().optional(),
  preferred_channel: z.enum(['whatsapp', 'llamada', 'email']).optional(),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  monto_estimado_compra: z.number().min(0).optional(),
  probabilidad_conversion: z.number().min(0).max(100).optional(),
  notas: z.string().optional(),
});

/**
 * Schema para crear estado Kanban
 */
export const CreateEstadoKanbanSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  color: z.string().min(1, 'El color es requerido'),
  orden: z.number().min(0),
  es_estado_final: z.boolean().optional(),
  requires_credit_workflow: z.boolean().optional(),
  credit_workflow_trigger: z.enum(['entry']).optional(),
  organization_id: z.string().min(1).optional(),
  tipo: z.string().min(1).optional(),
});

/**
 * Schema para mover cliente en Kanban
 */
export const MoverClienteKanbanSchema = z.object({
  cliente_id: z.string().min(1, 'El ID del cliente es requerido'),
  estado_nuevo_id: z.string().min(1, 'El ID del estado es requerido'),
  usuario_id: z.string().min(1, 'El ID del usuario es requerido'),
});
