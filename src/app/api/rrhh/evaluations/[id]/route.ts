import { withAuth } from '@/lib/api/withAuth';
import { performanceEvaluationSchema } from '@/lib/validations/rrhh';
import { CalendarService } from '@/services/calendar/CalendarService';
import { EventService } from '@/services/events/EventService';
import { EvaluationService } from '@/services/rrhh/EvaluationService';
import { NextResponse } from 'next/server';

function denied(auth: any, orgId?: string) {
  return (
    auth.role !== 'super_admin' &&
    auth.organizationId &&
    orgId &&
    orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const evaluation = await EvaluationService.getById(id);

      if (!evaluation) {
        return NextResponse.json(
          { error: 'Evaluacion no encontrada' },
          { status: 404 }
        );
      }
      if (denied(auth, evaluation.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(evaluation);
    } catch (error) {
      console.error('Error in evaluation GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener evaluacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const currentEvaluation = await EvaluationService.getById(id);
      if (!currentEvaluation) {
        return NextResponse.json(
          { error: 'Evaluacion no encontrada' },
          { status: 404 }
        );
      }
      if (denied(auth, currentEvaluation.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

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
      if (
        auth.role !== 'super_admin' &&
        body.organization_id &&
        body.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const validatedData = performanceEvaluationSchema.parse({
        ...body,
        organization_id: currentEvaluation.organization_id,
      });
      const evaluation = await EvaluationService.update(id, validatedData);

      if (currentEvaluation.calendar_event_id) {
        try {
          await CalendarService.updateEvent(
            currentEvaluation.calendar_event_id,
            {
              title: `Evaluacion: ${evaluation.titulo || 'Sin titulo'}`,
              description: evaluation.comentarios_generales || null,
              date: evaluation.fecha_evaluacion,
              responsibleUserId: evaluation.responsable_id || null,
              responsibleUserName: evaluation.responsable_nombre || null,
              participantIds:
                evaluation.empleados_evaluados?.map(e => e.personnelId) || null,
              metadata: {
                tipo: evaluation.tipo,
                capacitacionId: evaluation.capacitacionId,
                estado: evaluation.estado,
                totalEmpleados: evaluation.empleados_evaluados?.length || 0,
                totalCompetencias:
                  evaluation.competencias_a_evaluar?.length || 0,
              },
            }
          );
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError);
        }
      }

      try {
        await EventService.syncFromSource({
          organization_id: evaluation.organization_id || '',
          titulo: `Evaluacion: ${evaluation.titulo || 'Evaluacion de desempeno'}`,
          descripcion: evaluation.comentarios_generales,
          tipo_evento: 'evaluacion',
          fecha_inicio: evaluation.fecha_evaluacion,
          responsable_id: evaluation.responsable_id,
          responsable_nombre: evaluation.responsable_nombre,
          estado: (evaluation.estado === 'cerrado'
            ? 'completado'
            : evaluation.estado === 'publicado'
              ? 'en_progreso'
              : 'programado') as any,
          prioridad: 'alta',
          source_collection: 'evaluations',
          source_id: evaluation.id,
          created_by: auth.uid,
        });
      } catch (eventError) {
        console.error(
          'Error updating unified event for evaluation:',
          eventError
        );
      }

      return NextResponse.json(evaluation);
    } catch (error) {
      console.error('Error in evaluation PUT:', error);

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
        { error: 'Error al actualizar evaluacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const evaluation = await EvaluationService.getById(id);

      if (!evaluation) {
        return NextResponse.json(
          { error: 'Evaluacion no encontrada' },
          { status: 404 }
        );
      }
      if (denied(auth, evaluation.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      if (evaluation.calendar_event_id) {
        try {
          await CalendarService.deleteEvent(evaluation.calendar_event_id);
        } catch (calendarError) {
          console.error('Error deleting calendar event:', calendarError);
        }
      }

      try {
        await EventService.deleteBySource('evaluations', id);
      } catch (eventError) {
        console.error(
          'Error deleting unified event for evaluation:',
          eventError
        );
      }

      await EvaluationService.delete(id);
      return NextResponse.json({
        message: 'Evaluacion eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error in evaluation DELETE:', error);
      return NextResponse.json(
        { error: 'Error al eliminar evaluacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const currentEvaluation = await EvaluationService.getById(id);

      if (!currentEvaluation) {
        return NextResponse.json(
          { error: 'Evaluacion no encontrada' },
          { status: 404 }
        );
      }
      if (denied(auth, currentEvaluation.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

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
      const processedBody: Record<string, any> = { ...body };

      if (body.fecha_evaluacion) {
        processedBody.fecha_evaluacion = new Date(body.fecha_evaluacion);
      }
      if (body.fechaProximaEvaluacion) {
        processedBody.fechaProximaEvaluacion = new Date(
          body.fechaProximaEvaluacion
        );
      }
      if (body.organization_id !== undefined) {
        processedBody.organization_id = currentEvaluation.organization_id;
      }

      Object.keys(processedBody).forEach(key => {
        if (processedBody[key] === undefined) {
          delete processedBody[key];
        }
      });

      const evaluation = await EvaluationService.update(id, processedBody);

      if (currentEvaluation.calendar_event_id) {
        try {
          const updateData: any = {};

          if (body.titulo !== undefined) {
            updateData.title = `Evaluacion: ${evaluation.titulo || 'Sin titulo'}`;
          }
          if (body.fecha_evaluacion !== undefined) {
            updateData.date = evaluation.fecha_evaluacion;
          }
          if (body.estado !== undefined) {
            const eventStatus =
              body.estado === 'cerrado'
                ? 'completed'
                : body.estado === 'publicado'
                  ? 'in_progress'
                  : 'scheduled';
            updateData.status = eventStatus;
          }
          if (body.responsable_id !== undefined) {
            updateData.responsibleUserId = evaluation.responsable_id || null;
            updateData.responsibleUserName =
              evaluation.responsable_nombre || null;
          }

          if (Object.keys(updateData).length > 0) {
            await CalendarService.updateEvent(
              currentEvaluation.calendar_event_id,
              updateData
            );
          }
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError);
        }
      }

      try {
        const unifiedStatus =
          evaluation.estado === 'cerrado'
            ? 'completado'
            : evaluation.estado === 'publicado'
              ? 'en_progreso'
              : 'programado';

        await EventService.syncFromSource({
          organization_id: evaluation.organization_id || '',
          titulo: `Evaluacion: ${evaluation.titulo || 'Evaluacion de desempeno'}`,
          descripcion: evaluation.comentarios_generales,
          tipo_evento: 'evaluacion',
          fecha_inicio: evaluation.fecha_evaluacion,
          responsable_id: evaluation.responsable_id,
          responsable_nombre: evaluation.responsable_nombre,
          estado: unifiedStatus as any,
          prioridad: 'alta',
          source_collection: 'evaluations',
          source_id: evaluation.id,
          created_by: auth.uid,
        });
      } catch (eventError) {
        console.error('Error updating unified event in PATCH:', eventError);
      }

      return NextResponse.json(evaluation);
    } catch (error: any) {
      console.error('Error in evaluation PATCH:', error);
      return NextResponse.json(
        { error: 'Error al actualizar evaluacion', details: error?.message },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
