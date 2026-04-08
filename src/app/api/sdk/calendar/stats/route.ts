/**
 * Calendar Statistics API Route - SDK Unified
 *
 * GET /api/sdk/calendar/stats - Get calendar statistics
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
      const requestedOrgId = getRequestedOrgId(request.nextUrl.searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const service = new CalendarService();
      const events = await service.list({}, { limit: 1000, offset: 0 });
      const scopedEvents = events.filter(event =>
        isRecordAllowedByOrg(event, auth.organizationId)
      );
      const now = new Date();

      const stats = {
        total: scopedEvents.length,
        scheduled: scopedEvents.filter(e => e.status === 'scheduled').length,
        inProgress: scopedEvents.filter(e => e.status === 'in_progress').length,
        completed: scopedEvents.filter(e => e.status === 'completed').length,
        cancelled: scopedEvents.filter(e => e.status === 'cancelled').length,
        byType: {
          audit: scopedEvents.filter(e => e.eventType === 'audit').length,
          meeting: scopedEvents.filter(e => e.eventType === 'meeting').length,
          training: scopedEvents.filter(e => e.eventType === 'training').length,
          deadline: scopedEvents.filter(e => e.eventType === 'deadline').length,
          review: scopedEvents.filter(e => e.eventType === 'review').length,
          other: scopedEvents.filter(e => e.eventType === 'other').length,
        },
        upcomingCount: scopedEvents.filter(e => {
          const startDate = e.startDate?.toDate
            ? e.startDate.toDate()
            : new Date(e.startDate as any);
          return startDate > now && e.status === 'scheduled';
        }).length,
      };

      return NextResponse.json({ stats });
    } catch (error) {
      console.error('Error in GET /api/sdk/calendar/stats:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener estadisticas de calendario',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
