/**
 * NormPoint API Routes - SDK Unified
 *
 * GET /api/sdk/norm-points/[id] - Get norm point by ID
 * PUT /api/sdk/norm-points/[id] - Update norm point
 * DELETE /api/sdk/norm-points/[id] - Delete norm point
 */

import { NextRequest, NextResponse } from 'next/server';
import { NormPointService } from '@/lib/sdk/modules/normPoints';
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
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }

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
          { error: 'ID de punto de norma requerido' },
          { status: 400 }
        );
      }

      const service = new NormPointService();
      const normPoint = await service.getById(id);

      if (!normPoint) {
        return NextResponse.json(
          { error: 'Punto de norma no encontrado' },
          { status: 404 }
        );
      }

      if ((normPoint as any).organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({ normPoint });
    } catch (error) {
      const params = await context.params;
      console.error(`Error in GET /api/sdk/norm-points/${params.id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al obtener punto de norma',
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
      const body = await request
        .json()
        .catch(() => ({
          organization_id: null,
          organizationId: null,
          orgId: null,
          org: null,
        }));
      const requestedOrgId =
        body?.organization_id ||
        body?.organizationId ||
        body?.orgId ||
        body?.org ||
        request.nextUrl.searchParams.get('organization_id') ||
        request.nextUrl.searchParams.get('organizationId') ||
        request.nextUrl.searchParams.get('orgId') ||
        request.nextUrl.searchParams.get('org');
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      return NextResponse.json(
        { error: 'Actualizacion de puntos de norma no implementada' },
        { status: 501 }
      );
    } catch (error) {
      const params = await context.params;
      console.error(`Error in PUT /api/sdk/norm-points/${params.id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al actualizar punto de norma',
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
      const requestedOrgId =
        request.nextUrl.searchParams.get('organization_id') ||
        request.nextUrl.searchParams.get('organizationId') ||
        request.nextUrl.searchParams.get('orgId') ||
        request.nextUrl.searchParams.get('org');
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      return NextResponse.json(
        { error: 'Eliminacion de puntos de norma no implementada' },
        { status: 501 }
      );
    } catch (error) {
      const params = await context.params;
      console.error(
        `Error in DELETE /api/sdk/norm-points/${params.id}:`,
        error
      );
      return NextResponse.json(
        {
          error: 'Error al eliminar punto de norma',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
