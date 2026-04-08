import { withAuth } from '@/lib/api/withAuth';
import { aiRateLimiter } from '@/lib/rate-limiter';
import { CalendarService } from '@/services/calendar/CalendarService';
import type {
  AIQueryFilters,
  UserEventsQuery,
  UserEventsResponse,
} from '@/types/calendar';
import { NextResponse } from 'next/server';

const AI_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
] as const;

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
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            },
          }
        );
      }

      const body = (await request.json()) as UserEventsQuery;
      const requestedUserId = body.userId;
      const canViewOthers = [
        'admin',
        'gerente',
        'jefe',
        'super_admin',
      ].includes(auth.role);
      const userId =
        canViewOthers && requestedUserId ? requestedUserId : auth.uid;
      const { filters, includeContext, sortBy, sortOrder } = body;

      let events = await CalendarService.getEventsByUser(
        userId,
        filters as AIQueryFilters,
        auth.organizationId || undefined
      );

      if (filters?.dateRange) {
        const { startDate, endDate } = filters.dateRange;
        events = events.filter(
          e =>
            e.date.toDate() >= new Date(startDate) &&
            e.date.toDate() <= new Date(endDate)
        );
      }
      if (filters?.includeCompleted === false)
        events = events.filter(e => e.status !== 'completed');
      if (filters?.includeOverdue === false)
        events = events.filter(e => e.status !== 'overdue');
      if (filters?.minPriority) {
        const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        const minLevel = priorityOrder[filters.minPriority];
        events = events.filter(e => priorityOrder[e.priority] >= minLevel);
      }

      if (sortBy) {
        events.sort((a, b) => {
          let comparison = 0;
          switch (sortBy) {
            case 'date':
              comparison = a.date.toMillis() - b.date.toMillis();
              break;
            case 'priority': {
              const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
              comparison =
                priorityOrder[a.priority] - priorityOrder[b.priority];
              break;
            }
            case 'status': {
              const statusOrder = {
                overdue: 0,
                in_progress: 1,
                scheduled: 2,
                completed: 3,
                cancelled: 4,
              };
              comparison = statusOrder[a.status] - statusOrder[b.status];
              break;
            }
          }
          return sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      if (filters?.limit) events = events.slice(0, filters.limit);

      const summary = {
        byType: events.reduce(
          (acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        byPriority: events.reduce(
          (acc, e) => {
            acc[e.priority] = (acc[e.priority] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        byStatus: events.reduce(
          (acc, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        overdueCount: events.filter(e => e.status === 'overdue').length,
        upcomingCount: events.filter(
          e => e.date.toDate() > new Date() && e.status === 'scheduled'
        ).length,
      };

      let context;
      if (includeContext) {
        context = await Promise.all(
          events.map(e => CalendarService.getEventContext(e.id))
        );
      }

      const response: UserEventsResponse = {
        userId,
        userName: events[0]?.responsibleUserName || 'Usuario',
        totalEvents: events.length,
        events,
        summary: summary as UserEventsResponse['summary'],
        context: context as UserEventsResponse['context'],
      };

      return NextResponse.json(response, {
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      });
    } catch (error) {
      console.error('Error in user-events API:', error);
      return NextResponse.json(
        { error: 'Error al obtener eventos del usuario' },
        { status: 500 }
      );
    }
  },
  { roles: [...AI_ROLES] }
);
