export const PRODUCTO_CATEGORIAS = [
  'maquinaria',
  'implemento',
  'repuesto',
  'otro',
] as const;

export type ProductoCategoria = (typeof PRODUCTO_CATEGORIAS)[number];

export interface ProductoDealer {
  id: string;
  organization_id: string;
  nombre: string;
  descripcion?: string;
  categoria: ProductoCategoria;
  marca?: string;
  modelo?: string;
  precio_contado?: number;
  precio_lista?: number;
  stock?: number;
  imagenes: string[];
  activo: boolean;
  destacado: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export type CreateProductoDealerInput = Omit<
  ProductoDealer,
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateProductoDealerInput = Partial<
  Omit<ProductoDealer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
>;

export interface ProductoDealerFilters {
  categoria?: ProductoCategoria;
  activo?: boolean;
  limit?: number;
}
