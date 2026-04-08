import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  CreateProductoDealerInput,
  ProductoDealer,
  ProductoDealerFilters,
  UpdateProductoDealerInput,
} from '@/types/dealer-catalogo';
import { Timestamp } from 'firebase-admin/firestore';

function timestampToDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function timestampToOptionalDate(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizeProductoDealer(
  id: string,
  organizationId: string,
  data: Record<string, unknown>
): ProductoDealer {
  return {
    id,
    organization_id: organizationId,
    nombre: String(data.nombre || ''),
    descripcion: normalizeOptionalString(data.descripcion),
    categoria: data.categoria as ProductoDealer['categoria'],
    marca: normalizeOptionalString(data.marca),
    modelo: normalizeOptionalString(data.modelo),
    precio_contado: normalizeOptionalNumber(data.precio_contado),
    precio_lista: normalizeOptionalNumber(data.precio_lista),
    stock: Number.isInteger(data.stock) ? (data.stock as number) : undefined,
    imagenes: Array.isArray(data.imagenes)
      ? data.imagenes.filter((item): item is string => typeof item === 'string')
      : [],
    activo: data.activo === undefined ? true : Boolean(data.activo),
    destacado: Boolean(data.destacado),
    created_at: timestampToDate(data.created_at),
    updated_at: timestampToDate(data.updated_at),
    deleted_at: timestampToOptionalDate(data.deleted_at),
  };
}

export class ProductoDealerService {
  private static collection(organizationId: string) {
    const db = getAdminFirestore();
    return db
      .collection('organizations')
      .doc(organizationId)
      .collection('productos');
  }

  static async list(
    organizationId: string,
    filters: ProductoDealerFilters = {}
  ): Promise<ProductoDealer[]> {
    const snapshot = await this.collection(organizationId).get();
    const productos = snapshot.docs
      .map(doc => normalizeProductoDealer(doc.id, organizationId, doc.data() || {}))
      .filter(producto => !producto.deleted_at);

    return productos
      .filter(producto => {
        if (filters.categoria && producto.categoria !== filters.categoria) {
          return false;
        }

        if (filters.activo !== undefined && producto.activo !== filters.activo) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aTime = a.created_at?.getTime?.() ?? 0;
        const bTime = b.created_at?.getTime?.() ?? 0;
        return bTime - aTime;
      })
      .slice(0, filters.limit || 50);
  }

  static async getById(
    organizationId: string,
    productoId: string
  ): Promise<ProductoDealer | null> {
    const doc = await this.collection(organizationId).doc(productoId).get();
    if (!doc.exists) return null;
    const producto = normalizeProductoDealer(
      doc.id,
      organizationId,
      doc.data() || {}
    );
    return producto.deleted_at ? null : producto;
  }

  static async create(
    organizationId: string,
    data: CreateProductoDealerInput
  ): Promise<ProductoDealer> {
    const now = Timestamp.now();
    const docRef = this.collection(organizationId).doc();

    const docData = {
      organization_id: organizationId,
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      categoria: data.categoria,
      marca: data.marca || null,
      modelo: data.modelo || null,
      precio_contado: data.precio_contado ?? null,
      precio_lista: data.precio_lista ?? null,
      stock: data.stock ?? null,
      imagenes: data.imagenes || [],
      activo: data.activo,
      destacado: data.destacado,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await docRef.set(docData);
    return normalizeProductoDealer(docRef.id, organizationId, docData);
  }

  static async update(
    organizationId: string,
    productoId: string,
    data: UpdateProductoDealerInput
  ): Promise<ProductoDealer> {
    const docRef = this.collection(organizationId).doc(productoId);
    const current = await docRef.get();

    if (!current.exists) {
      throw new Error('PRODUCTO_NOT_FOUND');
    }

    const updateData: Record<string, unknown> = {
      updated_at: Timestamp.now(),
    };

    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.descripcion !== undefined)
      updateData.descripcion = data.descripcion || null;
    if (data.categoria !== undefined) updateData.categoria = data.categoria;
    if (data.marca !== undefined) updateData.marca = data.marca || null;
    if (data.modelo !== undefined) updateData.modelo = data.modelo || null;
    if (data.precio_contado !== undefined) {
      updateData.precio_contado = data.precio_contado ?? null;
    }
    if (data.precio_lista !== undefined) {
      updateData.precio_lista = data.precio_lista ?? null;
    }
    if (data.stock !== undefined) updateData.stock = data.stock ?? null;
    if (data.imagenes !== undefined) updateData.imagenes = data.imagenes;
    if (data.activo !== undefined) updateData.activo = data.activo;
    if (data.destacado !== undefined) updateData.destacado = data.destacado;

    await docRef.update(updateData);

    const updated = await docRef.get();
    return normalizeProductoDealer(
      updated.id,
      organizationId,
      updated.data() || {}
    );
  }

  static async softDelete(
    organizationId: string,
    productoId: string
  ): Promise<void> {
    const docRef = this.collection(organizationId).doc(productoId);
    const current = await docRef.get();

    if (!current.exists) {
      throw new Error('PRODUCTO_NOT_FOUND');
    }

    await docRef.update({
      activo: false,
      deleted_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });
  }
}
