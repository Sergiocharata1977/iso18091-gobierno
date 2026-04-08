import { z } from 'zod'
import {
  CIUDADANO_CANALES_PREFERIDOS,
  CIUDADANO_TIPOS,
} from '@/types/gov/ciudadano'

const OptionalTrimmedString = z
  .union([z.string().trim().min(1), z.literal('')])
  .optional()
  .transform(value => {
    if (value === undefined || value === '') return undefined
    return value
  })

const OptionalTagsSchema = z
  .array(z.string().trim().min(1))
  .optional()
  .transform(value => value?.map(tag => tag.trim()))

export const CiudadanoTipoSchema = z.enum(CIUDADANO_TIPOS)

export const CiudadanoCanalPreferidoSchema = z.enum(
  CIUDADANO_CANALES_PREFERIDOS
)

export const CreateCiudadanoBodySchema = z.object({
  organization_id: OptionalTrimmedString,
  dni: OptionalTrimmedString,
  nombre: z.string().trim().min(1, 'nombre es requerido').max(120),
  apellido: z.string().trim().min(1, 'apellido es requerido').max(120),
  email: z.email().optional().or(z.literal('')).transform(value => {
    if (!value) return undefined
    return value.trim().toLowerCase()
  }),
  telefono: OptionalTrimmedString,
  direccion: OptionalTrimmedString,
  barrio: OptionalTrimmedString,
  tipo: CiudadanoTipoSchema,
  canal_preferido: CiudadanoCanalPreferidoSchema,
  etiquetas: OptionalTagsSchema,
  activo: z.boolean().optional().default(true),
})

export const UpdateCiudadanoBodySchema = z
  .object({
    dni: OptionalTrimmedString,
    nombre: z.string().trim().min(1).max(120).optional(),
    apellido: z.string().trim().min(1).max(120).optional(),
    email: z.email().optional().or(z.literal('')).transform(value => {
      if (!value) return undefined
      return value.trim().toLowerCase()
    }),
    telefono: OptionalTrimmedString,
    direccion: OptionalTrimmedString,
    barrio: OptionalTrimmedString,
    tipo: CiudadanoTipoSchema.optional(),
    canal_preferido: CiudadanoCanalPreferidoSchema.optional(),
    etiquetas: OptionalTagsSchema,
    activo: z.boolean().optional(),
  })
  .refine(
    data =>
      data.dni !== undefined ||
      data.nombre !== undefined ||
      data.apellido !== undefined ||
      data.email !== undefined ||
      data.telefono !== undefined ||
      data.direccion !== undefined ||
      data.barrio !== undefined ||
      data.tipo !== undefined ||
      data.canal_preferido !== undefined ||
      data.etiquetas !== undefined ||
      data.activo !== undefined,
    { message: 'Debe enviar al menos un campo para actualizar' }
  )

export const CiudadanoListQuerySchema = z.object({
  organization_id: OptionalTrimmedString,
  barrio: OptionalTrimmedString,
  tipo: CiudadanoTipoSchema.optional(),
  search: OptionalTrimmedString,
})

export type CreateCiudadanoBody = z.infer<typeof CreateCiudadanoBodySchema>
export type UpdateCiudadanoBody = z.infer<typeof UpdateCiudadanoBodySchema>
export type CiudadanoListQuery = z.infer<typeof CiudadanoListQuerySchema>
