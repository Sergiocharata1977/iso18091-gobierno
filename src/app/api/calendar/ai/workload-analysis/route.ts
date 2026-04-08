import { withAuth } from '@/lib/api/withAuth';
import { aiRateLimiter } from '@/lib/rate-limiter';
import { CalendarService } from '@/services/calendar/CalendarService';
import type {
  WorkloadAnalysisQuery,
  WorkloadAnalysisResponse,
} from '@/types/calendar';
import { NextResponse } from 'next/server';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const CAN_ANALYZE_OTHERS = new Set(['admin', 'gerente', 'jefe', 'super_admin']);

/**
 * POST /api/calendar/ai/workload-analysis
 * Analizar carga de trabajo de un usuario
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

      const body = (await request.json()) as WorkloadAnalysisQuery;
      const { userId, period, startDate, compareWithPrevious = false } = body;

      if (!userId || !period) {
        return NextResponse.json(
          { error: 'userId y period son requeridos' },
          { status: 400 }
        );
      }

      const canAnalyzeOthers = CAN_ANALYZE_OTHERS.has(auth.role);
      if (!canAnalyzeOthers && userId !== auth.uid) {
        return NextResponse.json(
          { error: 'Sin permisos para consultar otro usuario' },
          { status: 403 }
        );
      }

      const scopedOrganizationId =
        auth.role === 'super_admin' ? undefined : auth.organizationId;

      const currentWorkload = await CalendarService.getUserWorkload(
        userId,
        period,
        startDate ? new Date(startDate) : undefined,
        scopedOrganizationId
      );

      let previousWorkload;
      if (compareWithPrevious) {
        const previousStart = new Date(currentWorkload.startDate);

        switch (period) {
          case 'week':
            previousStart.setDate(previousStart.getDate() - 7);
            break;
          case 'month':
            previousStart.setMonth(previousStart.getMonth() - 1);
            break;
          case 'quarter':
            previousStart.setMonth(previousStart.getMonth() - 3);
            break;
        }

        previousWorkload = await CalendarService.getUserWorkload(
          userId,
          period,
          previousStart,
          scopedOrganizationId
        );
      }

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (previousWorkload && previousWorkload.totalEvents > 0) {
        const diff = currentWorkload.totalEvents - previousWorkload.totalEvents;
        const percentChange = (diff / previousWorkload.totalEvents) * 100;

        if (percentChange > 10) trend = 'increasing';
        else if (percentChange < -10) trend = 'decreasing';
      }

      const insights: string[] = [];

      if (currentWorkload.overdueEvents > 0) {
        insights.push(
          `Tiene ${currentWorkload.overdueEvents} evento(s) vencido(s) que requieren atencion inmediata.`
        );
      }

      if (currentWorkload.averageEventsPerDay > 5) {
        insights.push(
          `Carga de trabajo alta: promedio de ${currentWorkload.averageEventsPerDay.toFixed(1)} eventos por dia.`
        );
      }

      if (currentWorkload.completionRate < 50) {
        insights.push(
          `Tasa de completitud baja (${currentWorkload.completionRate.toFixed(0)}%). Considere revisar prioridades.`
        );
      }

      if (currentWorkload.peakDay) {
        insights.push(
          `Dia pico: ${currentWorkload.peakDay.date.toLocaleDateString()} con ${currentWorkload.peakDay.count} eventos.`
        );
      }

      const criticalEvents = currentWorkload.byPriority.critical || 0;
      if (criticalEvents > 0) {
        insights.push(
          `${criticalEvents} evento(s) de prioridad critica requieren atencion.`
        );
      }

      const recommendations: string[] = [];

      if (currentWorkload.overdueEvents > 0) {
        recommendations.push(
          'Priorice la resolucion de eventos vencidos antes de tomar nuevas tareas.'
        );
      }

      if (currentWorkload.averageEventsPerDay > 5) {
        recommendations.push(
          'Considere delegar o reprogramar eventos no criticos para balancear la carga.'
        );
      }

      if (trend === 'increasing') {
        recommendations.push(
          'La carga de trabajo esta aumentando. Planifique tiempo adicional para gestion.'
        );
      }

      if (currentWorkload.completionRate < 70) {
        recommendations.push(
          'Revise los eventos pendientes y actualice su estado para mejorar el seguimiento.'
        );
      }

      if (recommendations.length === 0) {
        recommendations.push(
          'La carga de trabajo esta bien balanceada. Continue con el ritmo actual.'
        );
      }

      const response: WorkloadAnalysisResponse = {
        current: currentWorkload,
        previous: previousWorkload,
        trend,
        insights,
        recommendations,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error in workload-analysis API:', error);
      return NextResponse.json(
        { error: 'Error al analizar carga de trabajo' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
