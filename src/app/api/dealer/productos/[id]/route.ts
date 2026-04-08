import { withAuth } from '@/lib/api/withAuth';
import { UpdateProductoDealerBodySchema } from '@/lib/validations/dealer-catalogo';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { ProductoDealerService } from '@/services/dealer/ProductoDealerService';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const WRITE_ROLES = ['admin', 'gerente', 'super_admin'] as const;

export const GET = withAuth(async (request, { params }, auth) => {
  try {
    const { id } = await params;
    const orgScope = await resolveAuthorizedOrganizationId(
      auth,
      request.nextUrl.searchParams.get('organization_id')
    );

    if (!orgScope.ok || !orgScope.organizationId) {
      const error = toOrganizationApiError(orgScope, {
        defaultStatus: 403,
        defaultError: 'Acceso denegado',
      });
      return NextResponse.json(
        { success: false, error: error.error, errorCode: error.errorCode },
        { status: error.status }
      );
    }

    const data = await ProductoDealerService.getById(
      orgScope.organizationId,
      id
    );

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[dealer/productos/[id]][GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo obtener el producto' },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const body = UpdateProductoDealerBodySchema.parse(await request.json());
      const data = await ProductoDealerService.update(
        orgScope.organizationId,
        id,
        body
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      if (error instanceof Error && error.message === 'PRODUCTO_NOT_FOUND') {
        return NextResponse.json(
          { success: false, error: 'Producto no encontrado' },
          { status: 404 }
        );
      }

      console.error('[dealer/productos/[id]][PATCH] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el producto' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      await ProductoDealerService.softDelete(orgScope.organizationId, id);

      return NextResponse.json({ success: true, data: null });
    } catch (error) {
      if (error instanceof Error && error.message === 'PRODUCTO_NOT_FOUND') {
        return NextResponse.json(
          { success: false, error: 'Producto no encontrado' },
          { status: 404 }
        );
      }

      console.error('[dealer/productos/[id]][DELETE] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo dar de baja el producto' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
