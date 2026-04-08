/**
 * NormPoint by Chapter API Route - SDK Unified
 *
 * GET /api/sdk/norm-points/chapter/[chapter] - Get norm points by chapter
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

async function resolveChapter(context: {
  params: Promise<Record<string, string>>;
}): Promise<string> {
  const params = await context.params;
  return params.chapter;
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

      const chapter = await resolveChapter(context);

      if (!chapter) {
        return NextResponse.json(
          { error: 'Capitulo requerido' },
          { status: 400 }
        );
      }

      const service = new NormPointService();
      const normPoints = await service.getByChapter(chapter);
      const scopedNormPoints = normPoints.filter(
        point => (point as any).organization_id === auth.organizationId
      );

      return NextResponse.json({
        normPoints: scopedNormPoints,
        count: scopedNormPoints.length,
      });
    } catch (error) {
      const params = await context.params;
      console.error(
        `Error in GET /api/sdk/norm-points/chapter/${params.chapter}:`,
        error
      );
      return NextResponse.json(
        {
          error: 'Error al obtener puntos de norma por capitulo',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
