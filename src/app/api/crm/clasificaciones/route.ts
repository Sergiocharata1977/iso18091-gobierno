import { withAuth } from '@/lib/api/withAuth';
import { CreateCriterioSchema } from '@/lib/schemas/crm-clasificacion-schemas';
import {
  createCriterio,
  listCriterios,
} from '@/services/crm/CriteriosClasificacionService';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const dynamic = 'force-dynamic';

export const GET = withAuth(
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

      const criterios = await listCriterios(orgScope.organizationId);

      return NextResponse.json({
        success: true,
        data: criterios,
        count: criterios.length,
      });
    } catch (error) {
      console.error('[crm/clasificaciones][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los criterios' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        body.organization_id ||
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

      const validatedData = CreateCriterioSchema.parse(body);

      const criterio = await createCriterio(
        orgScope.organizationId,
        validatedData,
        auth.uid
      );

      return NextResponse.json(
        {
          success: true,
          data: criterio,
          message: 'Criterio creado exitosamente',
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[crm/clasificaciones][POST] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo crear el criterio',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...WRITE_ROLES] }
);
