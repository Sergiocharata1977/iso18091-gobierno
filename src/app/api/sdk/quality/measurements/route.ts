/**
 * Measurements API Route - SDK Unified
 *
 * GET /api/sdk/quality/measurements - List measurements
 * POST /api/sdk/quality/measurements - Create measurement
 */

import { NextRequest, NextResponse } from 'next/server';
import { MeasurementService } from '@/lib/sdk/modules/quality';
import { CreateMeasurementSchema } from '@/lib/sdk/modules/quality/validations';
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

function getRequestedOrgId(searchParams: URLSearchParams): string | null {
  return (
    searchParams.get('organization_id') ||
    searchParams.get('organizationId') ||
    searchParams.get('orgId') ||
    searchParams.get('org')
  );
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

export const GET = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
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

      const { searchParams } = new URL(request.url);
      const requestedOrgId = getRequestedOrgId(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const indicatorId = searchParams.get('indicatorId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const service = new MeasurementService();
      let measurements;

      if (indicatorId) {
        measurements = await service.getByIndicator(
          indicatorId,
          auth.organizationId
        );
      } else if (startDate && endDate) {
        measurements = await service.getByDateRange(
          startDate,
          endDate,
          auth.organizationId
        );
      } else {
        measurements = await service.list(
          { organization_id: auth.organizationId },
          { limit, offset }
        );
      }

      return NextResponse.json(
        { data: measurements, count: measurements.length },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in GET /api/sdk/quality/measurements:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener mediciones',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
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

      const body = await request.json();
      const requestedOrgId =
        body?.organization_id ||
        body?.organizationId ||
        body?.orgId ||
        body?.org ||
        null;
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const validated = CreateMeasurementSchema.parse({
        ...body,
        organization_id: auth.organizationId,
      });

      const service = new MeasurementService();
      const id = await service.createAndReturnId(validated, auth.uid);

      return NextResponse.json(
        { id, message: 'Medicion creada exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/quality/measurements:', error);
      return NextResponse.json(
        {
          error: 'Error al crear medicion',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
