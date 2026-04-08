import { withAuth } from '@/lib/api/withAuth';
import {
  paginationSchema,
  trainingFiltersSchema,
  trainingSchema,
} from '@/lib/validations/rrhh';
import { CalendarService } from '@/services/calendar/CalendarService';
import { EventService } from '@/services/events/EventService';
import { TrainingService } from '@/services/rrhh/TrainingService';
import type { CalendarEventCreateData } from '@/types/calendar';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);

      const filters = trainingFiltersSchema.parse({
        search: searchParams.get('search') || undefined,
        estado: (searchParams.get('estado') as any) || undefined,
        modalidad: (searchParams.get('modalidad') as any) || undefined,
        fecha_inicio: searchParams.get('fecha_inicio')
          ? new Date(searchParams.get('fecha_inicio')!)
          : undefined,
        fecha_fin: searchParams.get('fecha_fin')
          ? new Date(searchParams.get('fecha_fin')!)
          : undefined,
      });

      const pagination = paginationSchema.parse({
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '100'),
        sort: searchParams.get('sort') || undefined,
        order: searchParams.get('order') || 'desc',
      });

      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const result = await TrainingService.getPaginated(
        organizationId,
        filters,
        pagination
      );

      return NextResponse.json(result.data);
    } catch (error) {
      console.error('Error in trainings GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener capacitaciones' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      if (
        body.responsable_id !== undefined ||
        body.responsable_nombre !== undefined
      ) {
        return NextResponse.json(
          {
            error:
              'La asignacion estructural de responsables se administra desde Mi Panel',
          },
          { status: 409 }
        );
      }
      const requestedOrgId = body.organization_id as string | undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        requestedOrgId &&
        requestedOrgId !== organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const processedBody = {
        ...body,
        organization_id: organizationId,
        fecha_inicio: body.fecha_inicio
          ? new Date(body.fecha_inicio)
          : undefined,
        fecha_fin: body.fecha_fin ? new Date(body.fecha_fin) : undefined,
      };

      const validatedData = trainingSchema.parse(processedBody);
      const training = await TrainingService.create(
        validatedData,
        organizationId
      );

      try {
        const calendarEventData: CalendarEventCreateData = {
          title: `Capacitacion: ${training.tema}`,
          description: training.descripcion || null,
          date: training.fecha_inicio,
          endDate: training.fecha_fin,
          type: 'training',
          sourceModule: 'trainings',
          priority: 'medium',
          sourceRecordId: training.id,
          sourceRecordType: 'training',
          sourceRecordNumber: null,
          responsibleUserId: training.responsable_id || null,
          responsibleUserName: training.responsable_nombre || null,
          participantIds: training.participantes || null,
          organizationId: training.organization_id || '',
          processId: null,
          processName: null,
          metadata: {
            modalidad: training.modalidad,
            horas: training.horas,
            proveedor: training.proveedor,
            estado: training.estado,
            competenciasDesarrolladas: training.competenciasDesarrolladas,
          },
          notificationSchedule: {
            sevenDaysBefore: true,
            oneDayBefore: true,
            onEventDay: true,
            customDays: null,
          },
          isRecurring: false,
          recurrenceRule: null,
          createdBy: auth.uid,
          createdByName: auth.email || 'Sistema',
          isSystemGenerated: true,
        };

        const calendarEventId =
          await CalendarService.createEvent(calendarEventData);

        const eventId = await EventService.syncFromSource({
          organization_id: training.organization_id || '',
          titulo: `Capacitacion: ${training.tema}`,
          descripcion: training.descripcion,
          tipo_evento: 'capacitacion',
          fecha_inicio: training.fecha_inicio,
          fecha_fin: training.fecha_fin,
          responsable_id: training.responsable_id,
          responsable_nombre: training.responsable_nombre,
          estado: 'programado',
          prioridad: 'media',
          source_collection: 'trainings',
          source_id: training.id,
          created_by: auth.uid,
        });

        await TrainingService.update(training.id, {
          calendar_event_id: calendarEventId,
          event_id: eventId,
        });
        training.calendar_event_id = calendarEventId;
        training.event_id = eventId;
      } catch (calendarError) {
        console.error('Error creating calendar/event:', calendarError);
      }

      return NextResponse.json(training, { status: 201 });
    } catch (error) {
      console.error('Error in trainings POST:', error);

      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ZodError'
      ) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: (error as any).errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error al crear capacitacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
