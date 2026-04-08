/**
 * Calendar Events API Routes - SDK Unified
 *
 * GET /api/sdk/calendar/events - List calendar events
 * POST /api/sdk/calendar/events - Create calendar event
 */

import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { CalendarService } from '@/lib/sdk/modules/calendar';
import { CreateCalendarEventSchema } from '@/lib/sdk/modules/calendar/validations';
import type { CalendarEventFilters } from '@/lib/sdk/modules/calendar/types';
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

function getRequestedOrgId(
  searchParams: URLSearchParams,
  body?: any
): string | null {
  return (
    body?.organization_id ||
    body?.organizationId ||
    body?.orgId ||
    body?.org ||
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
      const requestedUserId = searchParams.get('userId');
      if (requestedUserId && requestedUserId !== auth.uid) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'No puedes consultar eventos de otro usuario',
          },
          { status: 403 }
        );
      }

      const filters: CalendarEventFilters = {
        eventType: (searchParams.get('eventType') as any) || undefined,
        status: (searchParams.get('status') as any) || undefined,
        relatedModule: searchParams.get('relatedModule') || undefined,
        userId: requestedUserId || undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
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

      const service = new CalendarService();
      const events = await service.list(filters, options);
      const scopedEvents = events.filter(event =>
        isRecordAllowedByOrg(event, auth.organizationId)
      );

      return NextResponse.json({
        events: scopedEvents,
        count: scopedEvents.length,
      });
    } catch (error) {
      console.error('Error in GET /api/sdk/calendar/events:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener eventos',
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
      const requestedOrgId = getRequestedOrgId(
        request.nextUrl.searchParams,
        body
      );
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const validatedData = CreateCalendarEventSchema.parse({
        ...body,
        organization_id: auth.organizationId,
      });

      const service = new CalendarService();
      const eventId = await service.createAndReturnId(
        validatedData as any,
        auth.uid
      );

      return NextResponse.json(
        { id: eventId, message: 'Evento creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/calendar/events:', error);
      return NextResponse.json(
        {
          error: 'Error al crear evento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
