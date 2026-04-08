import { withAuth } from '@/lib/api/withAuth';
import { CalendarService } from '@/services/calendar/CalendarService';
import { EventFilters } from '@/types/calendar';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId = searchParams.get('organizationId') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;
      const type = searchParams.get('type');
      const sourceModule = searchParams.get('sourceModule');
      const status = searchParams.get('status');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId es requerido' },
          { status: 400 }
        );
      }

      const filters: EventFilters = {};
      if (type) filters.type = type as EventFilters['type'];
      if (sourceModule)
        filters.sourceModule = sourceModule as EventFilters['sourceModule'];
      if (status) filters.status = status as EventFilters['status'];

      let events;
      if (startDate && endDate) {
        events = await CalendarService.getEventsByDateRange(
          new Date(startDate),
          new Date(endDate),
          filters,
          organizationId
        );
      } else {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        events = await CalendarService.getEventsByDateRange(
          start,
          end,
          filters,
          organizationId
        );
      }

      const icalContent = CalendarService.generateICalendar(
        events,
        'Calendario Sistema de Gestion'
      );
      return new NextResponse(icalContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="calendario.ics"',
        },
      });
    } catch (error) {
      console.error('Error exporting iCalendar:', error);
      return NextResponse.json(
        { error: 'Error al exportar calendario' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
