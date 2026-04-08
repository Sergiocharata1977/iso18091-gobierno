/**
 * FODA Analysis Detail API Route - SDK Unified
 *
 * GET /api/sdk/foda/[id] - Get FODA analysis by ID
 * PUT /api/sdk/foda/[id] - Update FODA analysis
 * DELETE /api/sdk/foda/[id] - Delete FODA analysis
 */

import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { AnalisisFODAService } from '@/lib/sdk/modules/foda';
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
          { error: 'ID de analisis FODA requerido' },
          { status: 400 }
        );
      }

      const service = new AnalisisFODAService();
      const analysis = await service.getById(id);

      if (!analysis) {
        return NextResponse.json(
          { error: 'Analisis FODA no encontrado' },
          { status: 404 }
        );
      }

      if (!hasResourceAccess(analysis, auth)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({ data: analysis }, { status: 200 });
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in GET /api/sdk/foda/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al obtener analisis FODA',
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
          { error: 'ID de analisis FODA requerido' },
          { status: 400 }
        );
      }

      const service = new AnalisisFODAService();
      const analysis = await service.getById(id);

      if (!analysis) {
        return NextResponse.json(
          { error: 'Analisis FODA no encontrado' },
          { status: 404 }
        );
      }

      if (!hasResourceAccess(analysis, auth)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.update(
        id,
        { ...body, organization_id: auth.organizationId } as any,
        auth.uid
      );

      return NextResponse.json(
        { message: 'Analisis FODA actualizado exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in PUT /api/sdk/foda/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al actualizar analisis FODA',
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
          { error: 'ID de analisis FODA requerido' },
          { status: 400 }
        );
      }

      const service = new AnalisisFODAService();
      const analysis = await service.getById(id);

      if (!analysis) {
        return NextResponse.json(
          { error: 'Analisis FODA no encontrado' },
          { status: 404 }
        );
      }

      if (!hasResourceAccess(analysis, auth)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.delete(id);

      return NextResponse.json(
        { message: 'Analisis FODA eliminado exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in DELETE /api/sdk/foda/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al eliminar analisis FODA',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...SENSITIVE_ROLES] }
);
