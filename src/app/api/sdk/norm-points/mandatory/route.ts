/**
 * Mandatory NormPoints API Route - SDK Unified
 *
 * GET /api/sdk/norm-points/mandatory - Get mandatory norm points
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

      const requestedOrgId =
        request.nextUrl.searchParams.get('organization_id') ||
        request.nextUrl.searchParams.get('organizationId') ||
        request.nextUrl.searchParams.get('orgId') ||
        request.nextUrl.searchParams.get('org');
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const service = new NormPointService();
      const normPoints = await service.getMandatory();
      const scopedNormPoints = normPoints.filter(
        point => (point as any).organization_id === auth.organizationId
      );

      return NextResponse.json({
        normPoints: scopedNormPoints,
        count: scopedNormPoints.length,
      });
    } catch (error) {
      console.error('Error in GET /api/sdk/norm-points/mandatory:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener puntos de norma obligatorios',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
