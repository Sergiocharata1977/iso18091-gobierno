import { withAuth } from '@/lib/api/withAuth';
import {
  CalendarEventSchema,
  EventFiltersSchema,
} from '@/lib/validations/calendar';
import { CalendarService } from '@/services/calendar/CalendarService';
import type { CalendarEventCreateData } from '@/types/calendar';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const startDateStr = searchParams.get('startDate');
      const endDateStr = searchParams.get('endDate');
      const requestedOrgId = searchParams.get('organizationId') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

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
      let events;

      if (startDateStr && endDateStr) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: 'Fechas invalidas' },
            { status: 400 }
          );
        }
        events = await CalendarService.getEventsByDateRange(
          startDate,
          endDate,
          validatedFilters,
          organizationId || undefined
        );
      } else if (responsibleUserId) {
        events = await CalendarService.getEventsByUser(
          responsibleUserId,
          validatedFilters,
          organizationId || undefined
        );
      } else if (sourceModule && !sourceModule.includes(',')) {
        events = await CalendarService.getEventsByModule(
          sourceModule,
          validatedFilters,
          organizationId || undefined
        );
      } else {
        events = await CalendarService.getUpcomingEvents(
          30,
          validatedFilters,
          organizationId || undefined
        );
      }

      return NextResponse.json({ events });
    } catch (error) {
      console.error('Error in GET /api/calendar/events:', error);
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Filtros invalidos', details: error.issues },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: 'Error al obtener eventos',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      if (body.date && typeof body.date === 'string')
        body.date = new Date(body.date);
      if (body.endDate && typeof body.endDate === 'string')
        body.endDate = new Date(body.endDate);

      const validatedData = CalendarEventSchema.parse(body);
      const organizationId =
        auth.role === 'super_admin'
          ? validatedData.organizationId || auth.organizationId
          : auth.organizationId;

      const eventData: CalendarEventCreateData = {
        title: validatedData.title,
        description: validatedData.description,
        date: validatedData.date,
        endDate: validatedData.endDate,
        type: validatedData.type,
        sourceModule: validatedData.sourceModule,
        priority: validatedData.priority,
        sourceRecordId: validatedData.sourceRecordId,
        sourceRecordType: validatedData.sourceRecordType,
        sourceRecordNumber: validatedData.sourceRecordNumber,
        responsibleUserId: validatedData.responsibleUserId,
        responsibleUserName: validatedData.responsibleUserName,
        participantIds: validatedData.participantIds,
        organizationId: organizationId,
        processId: validatedData.processId,
        processName: validatedData.processName,
        metadata: validatedData.metadata,
        notificationSchedule: validatedData.notificationSchedule,
        isRecurring: validatedData.isRecurring,
        recurrenceRule: validatedData.recurrenceRule,
        createdBy: auth.uid,
        createdByName: auth.email || validatedData.createdByName,
        isSystemGenerated: validatedData.isSystemGenerated,
      };

      const eventId = await CalendarService.createEvent(eventData);
      return NextResponse.json(
        { id: eventId, message: 'Evento creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/calendar/events:', error);
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: error.issues },
          { status: 400 }
        );
      }
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
