/**
 * Processes API Route - SDK Unified
 *
 * GET /api/sdk/processes - List processes
 * POST /api/sdk/processes - Create process
 */

import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { ProcessService } from '@/lib/sdk/modules/processes';
import { CreateProcessSchema } from '@/lib/sdk/modules/processes/validations';
import { adminDb } from '@/firebase/admin';
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
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const { searchParams } = new URL(request.url);
      const requestedOrgId = getRequestedOrgId(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const service = new ProcessService();
      const processes = await service.list({}, { limit, offset });
      const scopedProcesses = processes.filter(
        process => (process as any).organization_id === auth.organizationId
      );

      return NextResponse.json(
        { data: scopedProcesses, count: scopedProcesses.length },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in GET /api/sdk/processes:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener procesos',
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
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const body = await request.json();
      const requestedOrgId =
        (typeof body?.organization_id === 'string'
          ? body.organization_id
          : null) ||
        (typeof body?.organizationId === 'string'
          ? body.organizationId
          : null) ||
        (typeof body?.orgId === 'string' ? body.orgId : null) ||
        (typeof body?.org === 'string' ? body.org : null);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const validated = CreateProcessSchema.parse(body);

      const service = new ProcessService();
      const id = await service.createAndReturnId(validated, auth.uid);
      await adminDb
        .collection('processes')
        .doc(id)
        .set({ organization_id: auth.organizationId }, { merge: true });

      return NextResponse.json(
        { id, message: 'Proceso creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/processes:', error);
      return NextResponse.json(
        {
          error: 'Error al crear proceso',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
