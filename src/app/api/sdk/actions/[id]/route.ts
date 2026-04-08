/**
 * Action API Routes - SDK Unified
 *
 * GET /api/sdk/actions/[id] - Get action by ID
 * PUT /api/sdk/actions/[id] - Update action
 * DELETE /api/sdk/actions/[id] - Delete action
 */

import { NextRequest, NextResponse } from 'next/server';
import { ActionService } from '@/lib/sdk/modules/actions';
import { AuthContext, withAuth } from '@/lib/api/withAuth';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function requireOrganization(auth: AuthContext): NextResponse | null {
  if (!auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Sin organizacion',
        message: 'Usuario sin organizacion asignada',
      },
      { status: 403 }
    );
  }
  return null;
}

function validateRequestedOrg(
  requestedOrgId: string | null,
  auth: AuthContext
): NextResponse | null {
  if (!requestedOrgId) return null;
  if (requestedOrgId !== auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Acceso denegado',
        message: 'No puedes operar sobre otra organizacion',
      },
      { status: 403 }
    );
  }
  return null;
}

async function resolveId(context: {
  params: Promise<Record<string, string>>;
}): Promise<string> {
  const params = await context.params;
  return params.id;
}

export const GET = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const requestedOrgId =
        request.nextUrl.searchParams.get('organization_id') ||
        request.nextUrl.searchParams.get('organizationId') ||
        request.nextUrl.searchParams.get('orgId') ||
        request.nextUrl.searchParams.get('org');
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const id = await resolveId(context);

      if (!id) {
        return NextResponse.json(
          { error: 'ID de acci�n requerido' },
          { status: 400 }
        );
      }

      const service = new ActionService();
      const action = await service.getById(id);

      if (!action) {
        return NextResponse.json(
          { error: 'Acci�n no encontrada' },
          { status: 404 }
        );
      }

      if ((action as any).organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({ action });
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in GET /api/sdk/actions/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al obtener acci�n',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const PUT = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const id = await resolveId(context);
      const body = await request.json();

      const requestedOrgId =
        (typeof body?.organization_id === 'string'
          ? body.organization_id
          : null) ||
        (typeof body?.organizationId === 'string'
          ? body.organizationId
          : null) ||
        (typeof body?.orgId === 'string' ? body.orgId : null) ||
        (typeof body?.org === 'string' ? body.org : null) ||
        request.nextUrl.searchParams.get('organization_id') ||
        request.nextUrl.searchParams.get('organizationId') ||
        request.nextUrl.searchParams.get('orgId') ||
        request.nextUrl.searchParams.get('org');
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de acci�n requerido' },
          { status: 400 }
        );
      }

      const service = new ActionService();
      const action = await service.getById(id);

      if (!action) {
        return NextResponse.json(
          { error: 'Acci�n no encontrada' },
          { status: 404 }
        );
      }

      if ((action as any).organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(
        {
          error:
            'Actualizaci�n gen�rica no implementada. Use endpoints espec�ficos.',
        },
        { status: 501 }
      );
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in PUT /api/sdk/actions/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al actualizar acci�n',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const requestedOrgId =
        request.nextUrl.searchParams.get('organization_id') ||
        request.nextUrl.searchParams.get('organizationId') ||
        request.nextUrl.searchParams.get('orgId') ||
        request.nextUrl.searchParams.get('org');
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const id = await resolveId(context);

      if (!id) {
        return NextResponse.json(
          { error: 'ID de acci�n requerido' },
          { status: 400 }
        );
      }

      const service = new ActionService();
      const action = await service.getById(id);

      if (!action) {
        return NextResponse.json(
          { error: 'Acci�n no encontrada' },
          { status: 404 }
        );
      }

      if ((action as any).organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.delete(id);

      return NextResponse.json({
        message: 'Acci�n eliminada exitosamente',
        id,
      });
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in DELETE /api/sdk/actions/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al eliminar acci�n',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
