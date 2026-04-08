import { withAuth } from '@/lib/api/withAuth';
import { aiRateLimiter } from '@/lib/rate-limiter';
import { CalendarService } from '@/services/calendar/CalendarService';
import type { EventContextQuery } from '@/types/calendar';
import { NextResponse } from 'next/server';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

/**
 * POST /api/calendar/ai/event-context
 * Obtener contexto completo de un evento
 */
export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const identifier = request.headers.get('x-forwarded-for') || auth.uid;
      const rateLimit = aiRateLimiter.check(identifier);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Demasiadas solicitudes. Intente nuevamente mas tarde.',
            resetAt: new Date(rateLimit.resetAt).toISOString(),
          },
          { status: 429 }
        );
      }

      const body = (await request.json()) as EventContextQuery;
      const {
        eventId,
        includeSourceRecord = true,
        includeRelatedRecords = true,
        includeUserDetails = true,
        includeProcessDetails = true,
      } = body;

      if (!eventId) {
        return NextResponse.json(
          { error: 'eventId es requerido' },
          { status: 400 }
        );
      }

      const event = await CalendarService.getEventById(eventId);
      if (!event) {
        return NextResponse.json(
          { error: 'Evento no encontrado' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        event.organizationId !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }

      const context = await CalendarService.getEventContext(
        eventId,
        includeSourceRecord,
        includeRelatedRecords
      );

      if (!context) {
        return NextResponse.json(
          { error: 'Evento no encontrado' },
          { status: 404 }
        );
      }

      if (!includeUserDetails) {
        context.responsibleUser = null;
        context.participants = null;
      }

      if (!includeProcessDetails) {
        context.process = null;
      }

      return NextResponse.json(context);
    } catch (error) {
      console.error('Error in event-context API:', error);
      return NextResponse.json(
        { error: 'Error al obtener contexto del evento' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
