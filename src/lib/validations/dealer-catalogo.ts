import { PRODUCTO_CATEGORIAS } from '@/types/dealer-catalogo';
import { z } from 'zod';

const OptionalTrimmedString = z
  .union([z.string().trim().min(1), z.literal('')])
  .optional()
  .transform(value => {
    if (value === undefined || value === '') return undefined;
    return value;
  });

const OptionalNumber = z.preprocess(value => {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseFloat(value.trim());
  return value;
}, z.number().finite().optional());

const OptionalInteger = z.preprocess(value => {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value.trim(), 10);
  return value;
}, z.number().int().optional());

const BooleanFromQuery = z.preprocess(value => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return value;
}, z.boolean());

export const ProductoCategoriaSchema = z.enum(PRODUCTO_CATEGORIAS);

export const ProductoDealerListQuerySchema = z.object({
  categoria: ProductoCategoriaSchema.optional(),
  activo: BooleanFromQuery.optional().default(true),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const CreateProductoDealerBodySchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(2).max(160),
  descripcion: OptionalTrimmedString,
  categoria: ProductoCategoriaSchema,
  marca: OptionalTrimmedString,
  modelo: OptionalTrimmedString,
  precio_contado: OptionalNumber,
  precio_lista: OptionalNumber,
  stock: OptionalInteger,
  imagenes: z.array(z.string().trim().url()).optional().default([]),
  activo: z.boolean().optional().default(true),
  destacado: z.boolean().optional().default(false),
});

export const UpdateProductoDealerBodySchema = z
  .object({
    nombre: z.string().trim().min(2).max(160).optional(),
    descripcion: OptionalTrimmedString,
    categoria: ProductoCategoriaSchema.optional(),
    marca: OptionalTrimmedString,
    modelo: OptionalTrimmedString,
    precio_contado: OptionalNumber,
    precio_lista: OptionalNumber,
    stock: OptionalInteger,
    imagenes: z.array(z.string().trim().url()).optional(),
    activo: z.boolean().optional(),
    destacado: z.boolean().optional(),
  })
  .refine(
    data =>
      data.nombre !== undefined ||
      data.descripcion !== undefined ||
      data.categoria !== undefined ||
      data.marca !== undefined ||
      data.modelo !== undefined ||
      data.precio_contado !== undefined ||
      data.precio_lista !== undefined ||
      data.stock !== undefined ||
      data.imagenes !== undefined ||
      data.activo !== undefined ||
      data.destacado !== undefined,
    {
      message: 'Debe enviar al menos un campo para actualizar',
    }
  );

export type ProductoDealerListQuery = z.infer<
  typeof ProductoDealerListQuerySchema
>;
export type CreateProductoDealerBody = z.infer<
  typeof CreateProductoDealerBodySchema
>;
export type UpdateProductoDealerBody = z.infer<
  typeof UpdateProductoDealerBodySchema
>;
