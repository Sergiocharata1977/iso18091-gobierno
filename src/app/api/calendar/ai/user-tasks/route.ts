import { withAuth } from '@/lib/api/withAuth';
import { aiRateLimiter } from '@/lib/rate-limiter';
import { CalendarService } from '@/services/calendar/CalendarService';
import type { UserTasksQuery, UserTasksResponse } from '@/types/calendar';
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
          { status: 429 }
        );
      }

      const body = (await request.json()) as UserTasksQuery;
      const canViewOthers = [
        'admin',
        'gerente',
        'jefe',
        'super_admin',
      ].includes(auth.role);
      const userId = canViewOthers && body.userId ? body.userId : auth.uid;
      const {
        includeOverdue = true,
        includeUpcoming = true,
        daysAhead = 30,
        groupBy,
      } = body;

      let tasks = await CalendarService.getEventsByUser(
        userId,
        undefined,
        auth.organizationId || undefined
      );
      tasks = tasks.filter(
        e => e.status !== 'completed' && e.status !== 'cancelled'
      );

      const now = new Date();
      const overdueTasks = tasks.filter(
        e => e.date.toDate() < now && e.status !== 'completed'
      );
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const upcomingTasks = tasks.filter(
        e => e.date.toDate() >= now && e.date.toDate() <= futureDate
      );

      let filteredTasks: any[] = [];
      if (includeOverdue) filteredTasks.push(...overdueTasks);
      if (includeUpcoming) filteredTasks.push(...upcomingTasks);
      filteredTasks = Array.from(new Set(filteredTasks));
      filteredTasks.sort((a, b) => a.date.toMillis() - b.date.toMillis());

      let groupedTasks;
      if (groupBy) {
        groupedTasks = filteredTasks.reduce(
          (acc, task) => {
            let key: string;
            switch (groupBy) {
              case 'type':
                key = task.type;
                break;
              case 'priority':
                key = task.priority;
                break;
              case 'module':
                key = task.sourceModule;
                break;
              case 'date':
                key = task.date.toDate().toISOString().split('T')[0];
                break;
              default:
                key = 'other';
            }
            if (!acc[key]) acc[key] = [];
            acc[key].push(task);
            return acc;
          },
          {} as Record<string, typeof filteredTasks>
        );
      }

      const response: UserTasksResponse = {
        userId,
        userName: filteredTasks[0]?.responsibleUserName || 'Usuario',
        totalTasks: filteredTasks.length,
        overdueTasks: overdueTasks.length,
        upcomingTasks: upcomingTasks.length,
        tasks: filteredTasks,
        groupedTasks,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error in user-tasks API:', error);
      return NextResponse.json(
        { error: 'Error al obtener tareas del usuario' },
        { status: 500 }
      );
    }
  },
  { roles: [...AI_ROLES] }
);
