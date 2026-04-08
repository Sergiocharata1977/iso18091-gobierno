/**
 * Upcoming Calendar Events API Route - SDK Unified
 *
 * GET /api/sdk/calendar/events/upcoming - Get upcoming events
 */

import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { CalendarService } from '@/lib/sdk/modules/calendar';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

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

function isRecordAllowedByOrg(record: any, organizationId: string): boolean {
  const recordOrg = record?.organization_id || record?.organizationId || null;
  return recordOrg === organizationId;
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
      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId = getRequestedOrgId(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const days = searchParams.get('days')
        ? parseInt(searchParams.get('days')!)
        : 7;

      const service = new CalendarService();
      const events = await service.getUpcoming(days);
      const scopedEvents = events.filter(event =>
        isRecordAllowedByOrg(event, auth.organizationId)
      );

      return NextResponse.json({
        events: scopedEvents,
        count: scopedEvents.length,
      });
    } catch (error) {
      console.error('Error in GET /api/sdk/calendar/events/upcoming:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener eventos proximos',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
