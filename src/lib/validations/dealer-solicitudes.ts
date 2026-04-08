import { z } from 'zod';

export const dealerSolicitudTipoSchema = z.enum([
  'repuesto',
  'servicio',
  'comercial',
]);

const nombreSchema = z.string().trim().min(2, 'Ingresa tu nombre');
const telefonoSchema = z
  .string()
  .trim()
  .min(8, 'Ingresa un telefono valido')
  .max(30, 'Telefono demasiado largo');
const emailSchema = z
  .string()
  .trim()
  .email('Ingresa un email valido')
  .toLowerCase();
const cuitSchema = z
  .string()
  .trim()
  .max(20, 'CUIT demasiado largo')
  .optional()
  .or(z.literal(''));
const maquinaTipoSchema = z.string().trim().min(2, 'Indica el tipo de maquina');
const modeloSchema = z.string().trim().min(2, 'Indica el modelo');
const numeroSerieSchema = z
  .string()
  .trim()
  .max(60, 'Numero de serie demasiado largo')
  .optional()
  .or(z.literal(''));

// Para repuestos y servicios el numero de serie es obligatorio (trazabilidad ISO 9001)
const numeroSerieRequeridoSchema = z
  .string()
  .trim()
  .min(2, 'El numero de serie es obligatorio para trazabilidad ISO 9001')
  .max(60, 'Numero de serie demasiado largo');
const descripcionSchema = (label: string) =>
  z.string().trim().min(10, label).max(1500, 'Descripcion demasiado larga');
const localidadSchema = z.string().trim().min(2, 'Indica la localidad');
const provinciaSchema = z.string().trim().min(2, 'Indica la provincia');
const productoInteresSchema = z
  .string()
  .trim()
  .min(2, 'Indica el producto de interes');
const comentariosSchema = z
  .string()
  .trim()
  .min(5, 'Agrega un comentario breve')
  .max(1500, 'Comentario demasiado largo');

const basePublicSolicitudSchema = z.object({
  tipo: dealerSolicitudTipoSchema,
  nombre: nombreSchema,
  telefono: telefonoSchema,
  email: emailSchema,
  cuit: cuitSchema,
  website: z.string().trim().max(200).optional().or(z.literal('')),
  form_started_at: z.number().int().positive().optional(),
  tenant_slug: z.string().trim().max(60).optional().or(z.literal('')),
});

export const publicSolicitudRepuestoSchema = basePublicSolicitudSchema.extend({
  tipo: z.literal('repuesto'),
  maquina_tipo: maquinaTipoSchema,
  modelo: modeloSchema,
  numero_serie: numeroSerieRequeridoSchema,
  descripcion_repuesto: descripcionSchema('Describe el repuesto que necesitas'),
});

export const publicSolicitudServicioSchema = basePublicSolicitudSchema.extend({
  tipo: z.literal('servicio'),
  maquina_tipo: maquinaTipoSchema,
  modelo: modeloSchema,
  numero_serie: numeroSerieRequeridoSchema,
  descripcion_problema: descripcionSchema('Describe el problema tecnico'),
  localidad: localidadSchema,
  provincia: provinciaSchema,
});

export const publicSolicitudComercialSchema = basePublicSolicitudSchema.extend({
  tipo: z.literal('comercial'),
  producto_interes: productoInteresSchema,
  requiere_financiacion: z.boolean(),
  comentarios: comentariosSchema,
});

export const publicSolicitudSchema = z.discriminatedUnion('tipo', [
  publicSolicitudRepuestoSchema,
  publicSolicitudServicioSchema,
  publicSolicitudComercialSchema,
]);

export const publicSolicitudResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  numeroSolicitud: z.string(),
  tipo: dealerSolicitudTipoSchema,
  message: z.string(),
});

export type DealerSolicitudTipo = z.infer<typeof dealerSolicitudTipoSchema>;
export type PublicSolicitudPayload = z.infer<typeof publicSolicitudSchema>;
export type PublicSolicitudRepuestoPayload = z.infer<
  typeof publicSolicitudRepuestoSchema
>;
export type PublicSolicitudServicioPayload = z.infer<
  typeof publicSolicitudServicioSchema
>;
export type PublicSolicitudComercialPayload = z.infer<
  typeof publicSolicitudComercialSchema
>;
export type PublicSolicitudResponse = z.infer<
  typeof publicSolicitudResponseSchema
>;
