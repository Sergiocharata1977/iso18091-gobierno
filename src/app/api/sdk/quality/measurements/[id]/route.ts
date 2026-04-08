/**
 * Measurement Detail API Route - SDK Unified
 *
 * GET /api/sdk/quality/measurements/[id] - Get measurement by ID
 * PUT /api/sdk/quality/measurements/[id] - Update measurement
 * DELETE /api/sdk/quality/measurements/[id] - Delete measurement
 */

import { NextRequest, NextResponse } from 'next/server';
import { MeasurementService } from '@/lib/sdk/modules/quality';
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
          { error: 'ID de medicion requerido' },
          { status: 400 }
        );
      }

      const service = new MeasurementService();
      const measurement = await service.getById(id);

      if (!measurement) {
        return NextResponse.json(
          { error: 'Medicion no encontrada' },
          { status: 404 }
        );
      }

      if (measurement.organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({ data: measurement }, { status: 200 });
    } catch (error) {
      const params = await context.params;
      console.error(
        `Error in GET /api/sdk/quality/measurements/${params.id}:`,
        error
      );
      return NextResponse.json(
        {
          error: 'Error al obtener medicion',
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
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }

      const id = await resolveId(context);
      const body = await request.json();

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

      if (!id) {
        return NextResponse.json(
          { error: 'ID de medicion requerido' },
          { status: 400 }
        );
      }

      const service = new MeasurementService();
      const measurement = await service.getById(id);

      if (!measurement) {
        return NextResponse.json(
          { error: 'Medicion no encontrada' },
          { status: 404 }
        );
      }

      if (measurement.organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const sanitizedBody = { ...body };
      delete (sanitizedBody as any).organization_id;
      delete (sanitizedBody as any).organizationId;
      delete (sanitizedBody as any).orgId;
      delete (sanitizedBody as any).org;

      await service.update(
        id,
        { ...sanitizedBody, organization_id: auth.organizationId },
        auth.uid
      );

      return NextResponse.json(
        { message: 'Medicion actualizada exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      const params = await context.params;
      console.error(
        `Error in PUT /api/sdk/quality/measurements/${params.id}:`,
        error
      );
      return NextResponse.json(
        {
          error: 'Error al actualizar medicion',
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
          { error: 'ID de medicion requerido' },
          { status: 400 }
        );
      }

      const service = new MeasurementService();
      const measurement = await service.getById(id);

      if (!measurement) {
        return NextResponse.json(
          { error: 'Medicion no encontrada' },
          { status: 404 }
        );
      }

      if (measurement.organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.delete(id);

      return NextResponse.json(
        { message: 'Medicion eliminada exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      const params = await context.params;
      console.error(
        `Error in DELETE /api/sdk/quality/measurements/${params.id}:`,
        error
      );
      return NextResponse.json(
        {
          error: 'Error al eliminar medicion',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
