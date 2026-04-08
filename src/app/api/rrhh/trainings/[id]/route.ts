import { withAuth } from '@/lib/api/withAuth';
import { trainingSchema } from '@/lib/validations/rrhh';
import { CalendarService } from '@/services/calendar/CalendarService';
import { EventService } from '@/services/events/EventService';
import { TrainingService } from '@/services/rrhh/TrainingService';
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
      const training = await TrainingService.getById(id);

      if (!training) {
        return NextResponse.json(
          { error: 'Capacitacion no encontrada' },
          { status: 404 }
        );
      }
      if (denied(auth, training.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(training);
    } catch (error) {
      console.error('Error in training GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener capacitacion' },
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
      const currentTraining = await TrainingService.getById(id);

      if (!currentTraining) {
        return NextResponse.json(
          { error: 'Capacitacion no encontrada' },
          { status: 404 }
        );
      }
      if (denied(auth, currentTraining.organization_id)) {
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

      const validatedData = trainingSchema.parse({
        ...body,
        organization_id: currentTraining.organization_id,
      });
      const training = await TrainingService.update(id, validatedData);

      if (currentTraining.calendar_event_id) {
        try {
          await CalendarService.updateEvent(currentTraining.calendar_event_id, {
            title: `Capacitacion: ${training.tema}`,
            description: training.descripcion || null,
            date: training.fecha_inicio,
            endDate: training.fecha_fin,
            responsibleUserId: training.responsable_id || null,
            responsibleUserName: training.responsable_nombre || null,
            participantIds: training.participantes || null,
            metadata: {
              modalidad: training.modalidad,
              horas: training.horas,
              proveedor: training.proveedor,
              estado: training.estado,
              competenciasDesarrolladas: training.competenciasDesarrolladas,
            },
          });
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError);
        }
      }

      try {
        await EventService.syncFromSource({
          organization_id: training.organization_id || '',
          titulo: `Capacitacion: ${training.tema}`,
          descripcion: training.descripcion,
          tipo_evento: 'capacitacion',
          fecha_inicio: training.fecha_inicio,
          fecha_fin: training.fecha_fin,
          responsable_id: training.responsable_id,
          responsable_nombre: training.responsable_nombre,
          estado: (training.estado === 'completada'
            ? 'completado'
            : training.estado === 'cancelada'
              ? 'cancelado'
              : 'programado') as any,
          prioridad: 'media',
          source_collection: 'trainings',
          source_id: training.id,
          created_by: auth.uid,
        });
      } catch (eventError) {
        console.error('Error updating unified event:', eventError);
      }

      return NextResponse.json(training);
    } catch (error) {
      console.error('Error in training PUT:', error);

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
        { error: 'Error al actualizar capacitacion' },
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
      const training = await TrainingService.getById(id);

      if (!training) {
        return NextResponse.json(
          { error: 'Capacitacion no encontrada' },
          { status: 404 }
        );
      }
      if (denied(auth, training.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      if (training.calendar_event_id) {
        try {
          await CalendarService.deleteEvent(training.calendar_event_id);
        } catch (calendarError) {
          console.error('Error deleting calendar event:', calendarError);
        }
      }

      try {
        await EventService.deleteBySource('trainings', id);
      } catch (eventError) {
        console.error('Error deleting unified event for training:', eventError);
      }

      await TrainingService.delete(id);
      return NextResponse.json({
        message: 'Capacitacion eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error in training DELETE:', error);
      return NextResponse.json(
        { error: 'Error al eliminar capacitacion' },
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
      const current = await TrainingService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Capacitacion no encontrada' },
          { status: 404 }
        );
      }
      if (denied(auth, current.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();

      if (body.action === 'update_status' && body.status) {
        const training = await TrainingService.updateStatus(id, body.status);

        if (training.calendar_event_id) {
          try {
            const eventStatus =
              body.status === 'completada'
                ? 'completed'
                : body.status === 'cancelada'
                  ? 'cancelled'
                  : body.status === 'en_curso'
                    ? 'in_progress'
                    : 'scheduled';

            await CalendarService.updateEvent(training.calendar_event_id, {
              status: eventStatus as any,
            });
          } catch (calendarError) {
            console.error(
              'Error updating calendar event status:',
              calendarError
            );
          }
        }

        try {
          const unifiedStatus =
            body.status === 'completada'
              ? 'completado'
              : body.status === 'cancelada'
                ? 'cancelado'
                : 'programado';

          await EventService.syncFromSource({
            organization_id: training.organization_id || '',
            titulo: `Capacitacion: ${training.tema}`,
            descripcion: training.descripcion,
            tipo_evento: 'capacitacion',
            fecha_inicio: training.fecha_inicio,
            fecha_fin: training.fecha_fin,
            responsable_id: training.responsable_id,
            responsable_nombre: training.responsable_nombre,
            estado: unifiedStatus as any,
            prioridad: 'media',
            source_collection: 'trainings',
            source_id: training.id,
            created_by: auth.uid,
          });
        } catch (eventError) {
          console.error('Error updating unified event status:', eventError);
        }

        return NextResponse.json(training);
      }

      if (body.action === 'add_participant' && body.participant_id) {
        const training = await TrainingService.addParticipant(
          id,
          body.participant_id
        );

        if (training.calendar_event_id) {
          try {
            await CalendarService.updateEvent(training.calendar_event_id, {
              participantIds: training.participantes || null,
            });
          } catch (calendarError) {
            console.error(
              'Error updating calendar event participants:',
              calendarError
            );
          }
        }

        return NextResponse.json(training);
      }

      if (body.action === 'remove_participant' && body.participant_id) {
        const training = await TrainingService.removeParticipant(
          id,
          body.participant_id
        );

        if (training.calendar_event_id) {
          try {
            await CalendarService.updateEvent(training.calendar_event_id, {
              participantIds: training.participantes || null,
            });
          } catch (calendarError) {
            console.error(
              'Error updating calendar event participants:',
              calendarError
            );
          }
        }

        return NextResponse.json(training);
      }

      return NextResponse.json({ error: 'Accion no valida' }, { status: 400 });
    } catch (error) {
      console.error('Error in training PATCH:', error);
      return NextResponse.json(
        { error: 'Error al actualizar capacitacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
