import { withAuth } from '@/lib/api/withAuth';
import {
  CreateProductoDealerBodySchema,
  ProductoDealerListQuerySchema,
} from '@/lib/validations/dealer-catalogo';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { ProductoDealerService } from '@/services/dealer/ProductoDealerService';
import type { CreateProductoDealerInput } from '@/types/dealer-catalogo';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const WRITE_ROLES = ['admin', 'gerente', 'super_admin'] as const;

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const query = ProductoDealerListQuerySchema.parse({
      categoria: request.nextUrl.searchParams.get('categoria') || undefined,
      activo: request.nextUrl.searchParams.get('activo') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') || undefined,
    });

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

    const data = await ProductoDealerService.list(
      orgScope.organizationId,
      query
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Query invalida', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[dealer/productos][GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudieron obtener los productos' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
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

      const body = CreateProductoDealerBodySchema.parse(await request.json());
      const payload: CreateProductoDealerInput = {
        ...body,
        organization_id: orgScope.organizationId,
      };

      const data = await ProductoDealerService.create(
        orgScope.organizationId,
        payload
      );

      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[dealer/productos][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el producto' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
