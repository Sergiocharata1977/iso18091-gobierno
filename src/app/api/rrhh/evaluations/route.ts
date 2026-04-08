import { withAuth } from '@/lib/api/withAuth';
import {
  paginationSchema,
  performanceEvaluationFiltersSchema,
  performanceEvaluationSchema,
} from '@/lib/validations/rrhh';
import { CalendarService } from '@/services/calendar/CalendarService';
import { EventService } from '@/services/events/EventService';
import { EvaluationService } from '@/services/rrhh/EvaluationService';
import type { CalendarEventCreateData } from '@/types/calendar';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);

      const filters = performanceEvaluationFiltersSchema.parse({
        search: searchParams.get('search') || undefined,
        estado: (searchParams.get('estado') as any) || undefined,
        periodo: searchParams.get('periodo') || undefined,
        personnel_id: searchParams.get('personnel_id') || undefined,
        evaluador_id: searchParams.get('evaluador_id') || undefined,
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

      const result = await EvaluationService.getPaginated(
        organizationId,
        filters,
        pagination
      );

      return NextResponse.json(result.data);
    } catch (error) {
      console.error('Error in evaluations GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener evaluaciones' },
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
        fecha_evaluacion: body.fecha_evaluacion
          ? new Date(body.fecha_evaluacion)
          : new Date(),
        fechaProximaEvaluacion: body.fechaProximaEvaluacion
          ? new Date(body.fechaProximaEvaluacion)
          : null,
        competencias: body.competencias || [],
        estado: body.estado || 'borrador',
        resultado_global: body.resultado_global || 'Requiere Capacitacion',
      };

      const validatedData = performanceEvaluationSchema.parse(processedBody);
      const evaluation = await EvaluationService.create(
        validatedData,
        organizationId
      );

      try {
        const calendarEventData: CalendarEventCreateData = {
          title: `Evaluacion: ${evaluation.titulo || 'Sin titulo'}`,
          description: evaluation.comentarios_generales || null,
          date: evaluation.fecha_evaluacion,
          endDate: null,
          type: 'evaluation',
          sourceModule: 'evaluations',
          priority: 'high',
          sourceRecordId: evaluation.id,
          sourceRecordType: 'evaluation',
          sourceRecordNumber: null,
          responsibleUserId: evaluation.responsable_id || null,
          responsibleUserName: evaluation.responsable_nombre || null,
          participantIds:
            evaluation.empleados_evaluados?.map(e => e.personnelId) || null,
          organizationId: evaluation.organization_id || '',
          processId: null,
          processName: null,
          metadata: {
            tipo: evaluation.tipo,
            capacitacionId: evaluation.capacitacionId,
            estado: evaluation.estado,
            totalEmpleados: evaluation.empleados_evaluados?.length || 0,
            totalCompetencias: evaluation.competencias_a_evaluar?.length || 0,
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
          organization_id: evaluation.organization_id || '',
          titulo: `Evaluacion: ${evaluation.titulo || 'Evaluacion de desempeno'}`,
          descripcion: evaluation.comentarios_generales,
          tipo_evento: 'evaluacion',
          fecha_inicio: evaluation.fecha_evaluacion,
          responsable_id: evaluation.responsable_id,
          responsable_nombre: evaluation.responsable_nombre,
          estado: 'programado',
          prioridad: 'alta',
          source_collection: 'evaluations',
          source_id: evaluation.id,
          created_by: auth.uid,
        });

        await EvaluationService.update(evaluation.id, {
          calendar_event_id: calendarEventId,
          event_id: eventId,
        });
        evaluation.calendar_event_id = calendarEventId;
        evaluation.event_id = eventId;
      } catch (calendarError) {
        console.error('Error creating calendar/event:', calendarError);
      }

      return NextResponse.json(evaluation, { status: 201 });
    } catch (error: any) {
      console.error('[Evaluations POST] Error:', error);

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
        { error: 'Error al crear evaluacion', details: error?.message },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
