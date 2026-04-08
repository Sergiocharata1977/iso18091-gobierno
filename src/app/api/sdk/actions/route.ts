/**
 * Action API Routes - SDK Unified
 *
 * GET /api/sdk/actions - List actions
 * POST /api/sdk/actions - Create action
 */

import { NextRequest, NextResponse } from 'next/server';
import { ActionService } from '@/lib/sdk/modules/actions';
import { CreateActionSchema } from '@/lib/sdk/modules/actions/validations';
import type { ActionFilters } from '@/lib/sdk/modules/actions/types';
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

// GET /api/sdk/actions - List actions with filters
export const GET = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId = getRequestedOrgId(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const filters: ActionFilters = {
        status: (searchParams.get('status') as any) || undefined,
        responsibleId: searchParams.get('responsibleId') || undefined,
        findingId: searchParams.get('findingId') || undefined,
        search: searchParams.get('search') || undefined,
      };

      const options = {
        limit: searchParams.get('limit')
          ? parseInt(searchParams.get('limit')!)
          : 100,
        offset: searchParams.get('offset')
          ? parseInt(searchParams.get('offset')!)
          : 0,
      };

      const service = new ActionService();
      const actions = await service.list(filters, options);
      const scopedActions = actions.filter(
        action => (action as any).organization_id === auth.organizationId
      );

      return NextResponse.json({
        actions: scopedActions,
        count: scopedActions.length,
      });
    } catch (error) {
      console.error('Error in GET /api/sdk/actions:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener acciones',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

// POST /api/sdk/actions - Create action
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

      const validatedData = CreateActionSchema.parse(body);

      const service = new ActionService();
      const actionId = await service.createAndReturnId(validatedData, auth.uid);

      await getAdminFirestore()
        .collection('actions')
        .doc(actionId)
        .set({ organization_id: auth.organizationId }, { merge: true });

      return NextResponse.json(
        {
          id: actionId,
          message: 'Acci�n creada exitosamente',
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/actions:', error);

      if (error instanceof Error && error.message.includes('validation')) {
        return NextResponse.json(
          { error: 'Datos inv�lidos', details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Error al crear acci�n',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
