import { withAuth } from '@/lib/api/withAuth';
import { UpdateCriterioSchema } from '@/lib/schemas/crm-clasificacion-schemas';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import {
  deactivateCriterio,
  getCriterio,
  updateCriterio,
} from '@/services/crm/CriteriosClasificacionService';
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
  async (request, context, auth) => {
    try {
      const { id } = await context.params;
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

      const criterio = await getCriterio(orgScope.organizationId, id);

      if (!criterio || !criterio.activo) {
        return NextResponse.json(
          { success: false, error: 'Criterio no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: criterio,
      });
    } catch (error) {
      console.error('[crm/clasificaciones/:id][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el criterio' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...READ_ROLES] }
);

export const PATCH = withAuth(
  async (request, context, auth) => {
    try {
      const { id } = await context.params;
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

      const validatedData = UpdateCriterioSchema.parse(body);

      const criterio = await updateCriterio(
        orgScope.organizationId,
        id,
        validatedData
      );

      return NextResponse.json({
        success: true,
        data: criterio,
        message: 'Criterio actualizado exitosamente',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[crm/clasificaciones/:id][PATCH] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo actualizar el criterio',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (request, context, auth) => {
    try {
      const { id } = await context.params;
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

      await deactivateCriterio(orgScope.organizationId, id);

      return NextResponse.json({
        success: true,
        data: {
          id,
          organization_id: orgScope.organizationId,
          activo: false,
        },
        message: 'Criterio desactivado exitosamente',
      });
    } catch (error) {
      console.error('[crm/clasificaciones/:id][DELETE] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo desactivar el criterio',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...WRITE_ROLES] }
);
