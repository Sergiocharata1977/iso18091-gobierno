/**
 * Quality Objectives API Route - SDK Unified
 *
 * GET /api/sdk/quality/objectives - List quality objectives
 * POST /api/sdk/quality/objectives - Create quality objective
 */

import { NextRequest, NextResponse } from 'next/server';
import { QualityObjectiveService } from '@/lib/sdk/modules/quality';
import { CreateQualityObjectiveSchema } from '@/lib/sdk/modules/quality/validations';
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

      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const service = new QualityObjectiveService();
      let objectives;

      if (status) {
        objectives = await service.getByStatus(status);
      } else {
        objectives = await service.list({}, { limit, offset });
      }

      const scopedObjectives = objectives.filter(
        objective => objective.organization_id === auth.organizationId
      );

      return NextResponse.json(
        { data: scopedObjectives, count: scopedObjectives.length },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in GET /api/sdk/quality/objectives:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener objetivos de calidad',
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

      const validated = CreateQualityObjectiveSchema.parse({
        ...body,
        organization_id: auth.organizationId,
      });

      const service = new QualityObjectiveService();
      const id = await service.createAndReturnId(validated, auth.uid);

      return NextResponse.json(
        { id, message: 'Objetivo de calidad creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/quality/objectives:', error);
      return NextResponse.json(
        {
          error: 'Error al crear objetivo de calidad',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
