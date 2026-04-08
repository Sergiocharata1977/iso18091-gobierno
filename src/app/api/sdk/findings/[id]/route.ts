/**
 * Finding API Routes - SDK Unified
 *
 * GET /api/sdk/findings/[id] - Get finding by ID
 * PUT /api/sdk/findings/[id] - Update finding
 * DELETE /api/sdk/findings/[id] - Delete finding
 */

import { NextRequest, NextResponse } from 'next/server';
import { FindingService } from '@/lib/sdk/modules/findings';
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

function isCrossOrg(resource: any, auth: AuthContext): boolean {
  return resource?.organization_id !== auth.organizationId;
}

async function resolveId(context: {
  params: Promise<Record<string, string>>;
}): Promise<string> {
  const params = await context.params;
  return params.id;
}

// GET /api/sdk/findings/[id] - Get finding by ID
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
          { error: 'ID de hallazgo requerido' },
          { status: 400 }
        );
      }

      const service = new FindingService();
      const finding = await service.getById(id);

      if (!finding) {
        return NextResponse.json(
          { error: 'Hallazgo no encontrado' },
          { status: 404 }
        );
      }

      if (isCrossOrg(finding, auth)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({ finding });
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in GET /api/sdk/findings/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al obtener hallazgo',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

// PUT /api/sdk/findings/[id] - Update finding (generic update)
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
          { error: 'ID de hallazgo requerido' },
          { status: 400 }
        );
      }

      const service = new FindingService();
      const finding = await service.getById(id);

      if (!finding) {
        return NextResponse.json(
          { error: 'Hallazgo no encontrado' },
          { status: 404 }
        );
      }

      if (isCrossOrg(finding, auth)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(
        {
          error:
            'Actualizaci�n gen�rica no implementada. Use endpoints espec�ficos de fases.',
        },
        { status: 501 }
      );
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in PUT /api/sdk/findings/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al actualizar hallazgo',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

// DELETE /api/sdk/findings/[id] - Delete finding (soft delete)
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
          { error: 'ID de hallazgo requerido' },
          { status: 400 }
        );
      }

      const service = new FindingService();
      const finding = await service.getById(id);

      if (!finding) {
        return NextResponse.json(
          { error: 'Hallazgo no encontrado' },
          { status: 404 }
        );
      }

      if (isCrossOrg(finding, auth)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.delete(id);

      return NextResponse.json({
        message: 'Hallazgo eliminado exitosamente',
        id,
      });
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in DELETE /api/sdk/findings/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al eliminar hallazgo',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
