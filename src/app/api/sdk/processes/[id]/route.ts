/**
 * Process Detail API Route - SDK Unified
 *
 * GET /api/sdk/processes/[id] - Get process by ID
 * PUT /api/sdk/processes/[id] - Update process
 * DELETE /api/sdk/processes/[id] - Delete process
 */

import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { ProcessService } from '@/lib/sdk/modules/processes';
import { NextRequest, NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;
const SENSITIVE_ROLES = ['admin', 'gerente', 'super_admin'] as const;

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

function getRequestedOrgFromRequest(
  request: NextRequest,
  body?: any
): string | null {
  return (
    (typeof body?.organization_id === 'string' ? body.organization_id : null) ||
    (typeof body?.organizationId === 'string' ? body.organizationId : null) ||
    (typeof body?.orgId === 'string' ? body.orgId : null) ||
    (typeof body?.org === 'string' ? body.org : null) ||
    request.nextUrl.searchParams.get('organization_id') ||
    request.nextUrl.searchParams.get('organizationId') ||
    request.nextUrl.searchParams.get('orgId') ||
    request.nextUrl.searchParams.get('org')
  );
}

async function resolveId(context: {
  params: Promise<Record<string, string>>;
}): Promise<string> {
  const params = await context.params;
  return params.id;
}

function hasResourceAccess(resource: any, auth: AuthContext): boolean {
  return (resource as any)?.organization_id === auth.organizationId;
}

export const GET = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const requestedOrgId = getRequestedOrgFromRequest(request);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const id = await resolveId(context);

      if (!id) {
        return NextResponse.json(
          { error: 'ID de proceso requerido' },
          { status: 400 }
        );
      }

      const service = new ProcessService();
      const process = await service.getById(id);

      if (!process) {
        return NextResponse.json(
          { error: 'Proceso no encontrado' },
          { status: 404 }
        );
      }

      if (!hasResourceAccess(process, auth)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({ data: process }, { status: 200 });
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in GET /api/sdk/processes/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al obtener proceso',
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
      const requestedOrgId = getRequestedOrgFromRequest(request, body);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de proceso requerido' },
          { status: 400 }
        );
      }

      const service = new ProcessService();
      const process = await service.getById(id);

      if (!process) {
        return NextResponse.json(
          { error: 'Proceso no encontrado' },
          { status: 404 }
        );
      }

      if (!hasResourceAccess(process, auth)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.update(
        id,
        { ...body, organization_id: auth.organizationId } as any,
        auth.uid
      );

      return NextResponse.json(
        { message: 'Proceso actualizado exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in PUT /api/sdk/processes/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al actualizar proceso',
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

      const id = await resolveId(context);
      const requestedOrgId = getRequestedOrgFromRequest(request);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de proceso requerido' },
          { status: 400 }
        );
      }

      const service = new ProcessService();
      const process = await service.getById(id);

      if (!process) {
        return NextResponse.json(
          { error: 'Proceso no encontrado' },
          { status: 404 }
        );
      }

      if (!hasResourceAccess(process, auth)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.delete(id);

      return NextResponse.json(
        { message: 'Proceso eliminado exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in DELETE /api/sdk/processes/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al eliminar proceso',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...SENSITIVE_ROLES] }
);
