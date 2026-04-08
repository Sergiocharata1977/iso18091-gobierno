/**
 * Action Statistics API Route - SDK Unified
 *
 * GET /api/sdk/actions/stats - Get action statistics
 */

import { ActionService } from '@/lib/sdk/modules/actions';
import type { Action, ActionFilters } from '@/lib/sdk/modules/actions/types';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { AuthContext, withAuth } from '@/lib/api/withAuth';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

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

export const GET = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId =
        searchParams.get('organization_id') ||
        searchParams.get('organizationId') ||
        searchParams.get('orgId') ||
        searchParams.get('org');
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const filters: ActionFilters = {
        status: (searchParams.get('status') as any) || undefined,
        responsibleId: searchParams.get('responsibleId') || undefined,
        findingId: searchParams.get('findingId') || undefined,
      };

      const service = new ActionService();
      const actions = await service.list(filters, { limit: 1000, offset: 0 });
      const scopedActions = actions.filter(
        action => (action as any).organization_id === auth.organizationId
      );

      const stats = {
        total: scopedActions.length,
        pending: scopedActions.filter(a => a.status === 'pending').length,
        inProgress: scopedActions.filter(a => a.status === 'in_progress')
          .length,
        completed: scopedActions.filter(a => a.status === 'completed').length,
        cancelled: scopedActions.filter(a => a.status === 'cancelled').length,
        effective: scopedActions.filter(a => a.isEffective === true).length,
        ineffective: scopedActions.filter(a => a.isEffective === false).length,
        unverified: scopedActions.filter(a => a.isEffective === null).length,
        overdue: scopedActions.filter((a: Action) => {
          if (!a.dueDate) return false;
          const dueDate =
            a.dueDate instanceof Timestamp
              ? a.dueDate.toDate()
              : new Date(a.dueDate);
          return dueDate < new Date() && a.status !== 'completed';
        }).length,
        averageProgressPercentage:
          scopedActions.length > 0
            ? Math.round(
                scopedActions.reduce(
                  (sum, a) => sum + (a.progressPercentage || 0),
                  0
                ) / scopedActions.length
              )
            : 0,
      };

      return NextResponse.json({ stats });
    } catch (error) {
      console.error('Error in GET /api/sdk/actions/stats:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener estad�sticas de acciones',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
