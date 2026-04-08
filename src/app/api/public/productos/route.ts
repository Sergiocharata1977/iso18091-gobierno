import { checkRateLimit } from '@/lib/api/rateLimit';
import { resolvePublicOrgId } from '@/lib/public/resolveTenantOrg';
import { ProductoDealerService } from '@/services/dealer/ProductoDealerService';
import type { ProductoCategoria } from '@/types/dealer-catalogo';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 300; // 5 minutos de cache

function getClientIdentifier(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    const organizationId = await resolvePublicOrgId(request);
    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organización no encontrada o módulo de productos no configurado',
          errorCode: 'ORG_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 50,
      windowSeconds: 3600,
      identifier: getClientIdentifier(request),
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const categoria = (searchParams.get('categoria') || undefined) as
      | ProductoCategoria
      | undefined;
    const destacados = searchParams.get('destacados') === 'true';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      100
    );

    const productos = await ProductoDealerService.list(organizationId, {
      categoria,
      activo: true,
      limit,
    });

    const filtered = destacados
      ? productos.filter(p => p.destacado)
      : productos;

    const publicData = filtered.map(p => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      categoria: p.categoria,
      marca: p.marca,
      modelo: p.modelo,
      precio_contado: p.precio_contado,
      precio_lista: p.precio_lista,
      imagenes: p.imagenes,
      destacado: p.destacado,
    }));

    return NextResponse.json({
      success: true,
      data: publicData,
      total: publicData.length,
    });
  } catch (error) {
    console.error('[public][productos][GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo obtener el catálogo de productos' },
      { status: 500 }
    );
  }
}
