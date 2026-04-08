import { withAuth } from '@/lib/api/withAuth';
import { CalendarEventUpdateSchema } from '@/lib/validations/calendar';
import { CalendarService } from '@/services/calendar/CalendarService';
import type { CalendarEventUpdateData } from '@/types/calendar';
import { NextResponse } from 'next/server';

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

function denied(
  auth: { role: string; organizationId: string },
  orgId?: string
) {
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const event = await CalendarService.getEventById(id);
      if (!event)
        return NextResponse.json(
          { error: 'Evento no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (event as any).organizationId)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      return NextResponse.json({ event });
    } catch (error) {
      console.error('Error in GET /api/calendar/events/[id]:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener evento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const body = await request.json();
      if (body.date && typeof body.date === 'string')
        body.date = new Date(body.date);
      if (body.endDate && typeof body.endDate === 'string')
        body.endDate = new Date(body.endDate);

      const validatedData = CalendarEventUpdateSchema.parse(body);
      const existingEvent = await CalendarService.getEventById(id);
      if (!existingEvent)
        return NextResponse.json(
          { error: 'Evento no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (existingEvent as any).organizationId)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const updateData: CalendarEventUpdateData = {
        title: validatedData.title,
        description: validatedData.description,
        date: validatedData.date,
        endDate: validatedData.endDate,
        status: validatedData.status,
        priority: validatedData.priority,
        responsibleUserId: validatedData.responsibleUserId,
        responsibleUserName: validatedData.responsibleUserName,
        participantIds: validatedData.participantIds,
        processId: validatedData.processId,
        processName: validatedData.processName,
        metadata: validatedData.metadata,
        notificationSchedule: validatedData.notificationSchedule,
      };

      await CalendarService.updateEvent(id, updateData);
      return NextResponse.json({ message: 'Evento actualizado exitosamente' });
    } catch (error) {
      console.error('Error in PATCH /api/calendar/events/[id]:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Datos invalidos', details: error },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: 'Error al actualizar evento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const existingEvent = await CalendarService.getEventById(id);
      if (!existingEvent)
        return NextResponse.json(
          { error: 'Evento no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (existingEvent as any).organizationId)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      await CalendarService.deleteEvent(id);
      return NextResponse.json({ message: 'Evento eliminado exitosamente' });
    } catch (error) {
      console.error('Error in DELETE /api/calendar/events/[id]:', error);
      return NextResponse.json(
        {
          error: 'Error al eliminar evento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
