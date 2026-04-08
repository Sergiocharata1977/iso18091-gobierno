import {
  ensureValidUpdatedAfter,
  isMobileValidationError,
  mobileErrorResponse,
  mobileSuccessResponse,
  parseListParams,
  resolveMobileOrganizationId,
  toMobileCatalogoResumen,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';
import { ProductoDealerService } from '@/services/dealer/ProductoDealerService';
import type { ProductoDealer } from '@/types/dealer-catalogo';
import { PRODUCTO_CATEGORIAS } from '@/types/dealer-catalogo';

export const dynamic = 'force-dynamic';

const DEFAULT_RECENT_LIMIT = 8;
const DEFAULT_FAVORITE_LIMIT = 8;

function normalizeSearchTerm(raw: string | null) {
  if (!raw) return null;
  const normalized = raw.trim().toLocaleLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function matchesSearch(producto: ProductoDealer, searchTerm: string | null) {
  if (!searchTerm) return true;
  const haystack = [
    producto.nombre,
    producto.descripcion,
    producto.marca,
    producto.modelo,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLocaleLowerCase();

  return haystack.includes(searchTerm);
}

function isDisponible(producto: ProductoDealer) {
  if (!producto.activo) return false;
  if (typeof producto.stock === 'number') return producto.stock > 0;
  return true;
}

export const GET = withMobileOperacionesAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams, cursor, updatedAfter, limit } = parseListParams(request);
      const organizationScope = await resolveMobileOrganizationId(
        auth,
        searchParams.get('organization_id')
      );
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const categoria = searchParams.get('categoria');
      const activoParam = searchParams.get('activo');
      const searchTerm = normalizeSearchTerm(
        searchParams.get('q') || searchParams.get('search')
      );
      const recientesLimit = Number.parseInt(
        searchParams.get('recientes_limit') || '',
        10
      );
      const favoritosLimit = Number.parseInt(
        searchParams.get('favoritos_limit') || '',
        10
      );
      const effectiveRecentesLimit = Number.isFinite(recientesLimit)
        ? Math.min(Math.max(recientesLimit, 1), 20)
        : DEFAULT_RECENT_LIMIT;
      const effectiveFavoritosLimit = Number.isFinite(favoritosLimit)
        ? Math.min(Math.max(favoritosLimit, 1), 20)
        : DEFAULT_FAVORITE_LIMIT;
      const normalizedUpdatedAfter = ensureValidUpdatedAfter(updatedAfter);

      const productos = await ProductoDealerService.list(organizationScope.organizationId, {
        categoria:
          categoria && PRODUCTO_CATEGORIAS.includes(categoria as (typeof PRODUCTO_CATEGORIAS)[number])
            ? (categoria as (typeof PRODUCTO_CATEGORIAS)[number])
            : undefined,
        activo:
          activoParam === 'true' ? true : activoParam === 'false' ? false : undefined,
        limit: Math.min(limit * 3, 300),
      });

      const filtered = productos
        .filter(producto =>
          normalizedUpdatedAfter ? producto.updated_at.toISOString() >= normalizedUpdatedAfter : true
        )
        .filter(producto => matchesSearch(producto, searchTerm))
        .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

      const favoritos = filtered
        .filter(producto => producto.destacado)
        .slice(0, effectiveFavoritosLimit);
      const recientes = filtered.slice(0, effectiveRecentesLimit);
      const favoritosIds = new Set(favoritos.map(producto => producto.id));
      const recientesIds = new Set(recientes.map(producto => producto.id));
      const categorias = PRODUCTO_CATEGORIAS.map(currentCategoria => {
        const categoriaItems = filtered.filter(
          producto => producto.categoria === currentCategoria
        );
        return {
          categoria: currentCategoria,
          total: categoriaItems.length,
          disponibles: categoriaItems.filter(isDisponible).length,
        };
      }).filter(entry => entry.total > 0);

      const cursorIndex = cursor ? filtered.findIndex(producto => producto.id === cursor) : -1;
      const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      const page = filtered.slice(startIndex, startIndex + limit);
      const nextCursor =
        startIndex + page.length < filtered.length && page.length > 0
          ? page[page.length - 1].id
          : null;

      return mobileSuccessResponse(
        page.map(producto => ({
          ...toMobileCatalogoResumen(producto),
          favorito: favoritosIds.has(producto.id),
          reciente: recientesIds.has(producto.id),
        })),
        {
          organization_id: organizationScope.organizationId,
          item_count: page.length,
          limit,
          cursor_applied: cursor,
          updated_after: normalizedUpdatedAfter,
          next_cursor: nextCursor,
          has_more: Boolean(nextCursor),
          catalogo: {
            search: searchTerm,
            categorias,
            favoritos_count: favoritos.length,
            recientes_count: recientes.length,
            cache: {
              strategy: 'local_first',
              recommended_ttl_seconds: 300,
              delta_sync_supported: true,
            },
          },
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/operaciones/catalogo] GET error:', error);
      if (isMobileValidationError(error)) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Los filtros de catalogo no cumplen el contrato mobile.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener el catalogo operativo.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
