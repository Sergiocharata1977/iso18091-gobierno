/**
 * Finding API Routes - SDK Unified
 *
 * GET /api/sdk/findings - List findings
 * POST /api/sdk/findings - Create finding
 */

import { NextRequest, NextResponse } from 'next/server';
import { FindingService } from '@/lib/sdk/modules/findings';
import { CreateFindingSchema } from '@/lib/sdk/modules/findings/validations';
import type { FindingStatus } from '@/lib/sdk/modules/findings/types';
import { getAdminFirestore } from '@/lib/firebase/admin';
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

function getRequestedOrgId(
  searchParams: URLSearchParams,
  body?: Record<string, unknown>
): string | null {
  return (
    (typeof body?.organization_id === 'string' ? body.organization_id : null) ||
    (typeof body?.organizationId === 'string' ? body.organizationId : null) ||
    (typeof body?.orgId === 'string' ? body.orgId : null) ||
    (typeof body?.org === 'string' ? body.org : null) ||
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

// GET /api/sdk/findings - List findings with filters
export const GET = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId = getRequestedOrgId(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const filters = {
        status: (searchParams.get('status') as FindingStatus) || undefined,
        processId: searchParams.get('processId') || undefined,
        sourceId: searchParams.get('sourceId') || undefined,
        year: searchParams.get('year')
          ? parseInt(searchParams.get('year')!)
          : undefined,
        search: searchParams.get('search') || undefined,
        requiresAction: searchParams.get('requiresAction')
          ? searchParams.get('requiresAction') === 'true'
          : undefined,
      };

      const options = {
        limit: searchParams.get('limit')
          ? parseInt(searchParams.get('limit')!)
          : 100,
        offset: searchParams.get('offset')
          ? parseInt(searchParams.get('offset')!)
          : 0,
      };

      const service = new FindingService();
      const findings = await service.list(filters, options);
      const scopedFindings = findings.filter(
        finding => (finding as any).organization_id === auth.organizationId
      );

      return NextResponse.json({
        findings: scopedFindings,
        count: scopedFindings.length,
      });
    } catch (error) {
      console.error('Error in GET /api/sdk/findings:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener hallazgos',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

// POST /api/sdk/findings - Create finding
export const POST = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const body = await request.json();
      const requestedOrgId = getRequestedOrgId(
        request.nextUrl.searchParams,
        body
      );
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const validatedData = CreateFindingSchema.parse(body);

      const service = new FindingService();
      const findingId = await service.createAndReturnId(
        validatedData,
        auth.uid
      );

      await getAdminFirestore()
        .collection('findings')
        .doc(findingId)
        .set({ organization_id: auth.organizationId }, { merge: true });

      return NextResponse.json(
        {
          id: findingId,
          message: 'Hallazgo creado exitosamente',
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/findings:', error);

      if (error instanceof Error && error.message.includes('validation')) {
        return NextResponse.json(
          { error: 'Datos inv�lidos', details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Error al crear hallazgo',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
