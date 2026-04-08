import { withAuth } from '@/lib/api/withAuth';
import { EventFiltersSchema } from '@/lib/validations/calendar';
import { CalendarService } from '@/services/calendar/CalendarService';
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
      const { searchParams } = new URL(request.url);
      const daysStr = searchParams.get('days');
      const days: number = daysStr ? parseInt(daysStr, 10) : 7;
      const requestedOrgId = searchParams.get('organizationId') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json(
          { error: 'El parametro days debe ser un numero entre 1 y 365' },
          { status: 400 }
        );
      }

      const filters: Record<string, unknown> = {};
      const type = searchParams.get('type');
      if (type) filters.type = type.includes(',') ? type.split(',') : type;
      const sourceModule = searchParams.get('sourceModule');
      if (sourceModule)
        filters.sourceModule = sourceModule.includes(',')
          ? sourceModule.split(',')
          : sourceModule;
      const status = searchParams.get('status');
      if (status)
        filters.status = status.includes(',') ? status.split(',') : status;
      const priority = searchParams.get('priority');
      if (priority)
        filters.priority = priority.includes(',')
          ? priority.split(',')
          : priority;
      const responsibleUserId = searchParams.get('responsibleUserId');
      if (responsibleUserId) filters.responsibleUserId = responsibleUserId;
      const processId = searchParams.get('processId');
      if (processId) filters.processId = processId;
      const isSystemGenerated = searchParams.get('isSystemGenerated');
      if (isSystemGenerated !== null)
        filters.isSystemGenerated = isSystemGenerated === 'true';
      const search = searchParams.get('search');
      if (search) filters.search = search;

      const validatedFilters = EventFiltersSchema.parse(filters);
      const events = await CalendarService.getUpcomingEvents(
        days,
        validatedFilters,
        organizationId || undefined
      );
      return NextResponse.json({ events, count: events.length, days });
    } catch (error) {
      console.error('Error in GET /api/calendar/events/upcoming:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Filtros invalidos', details: error },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: 'Error al obtener eventos proximos',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
