/**
 * Finding Close API Route - SDK Unified
 *
 * PUT /api/sdk/findings/[id]/close - Close finding
 */

import { NextRequest, NextResponse } from 'next/server';
import { FindingService } from '@/lib/sdk/modules/findings';
import { AuthContext, withAuth } from '@/lib/api/withAuth';

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

async function resolveId(context: {
  params: Promise<Record<string, string>>;
}): Promise<string> {
  const params = await context.params;
  return params.id;
}

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

      if ((finding as any).organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.close(id, auth.uid);

      return NextResponse.json({
        message: 'Hallazgo cerrado exitosamente',
        id,
        status: 'cerrado',
        progress: 100,
      });
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in PUT /api/sdk/findings/${id}/close:`, error);
      return NextResponse.json(
        {
          error: 'Error al cerrar hallazgo',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...SENSITIVE_ROLES] }
);
