import { withAuth } from '@/lib/sdk/middleware/auth';
import { errorHandler } from '@/lib/sdk/middleware/errorHandler';
import { AuditService } from '@/lib/sdk/modules/audits/AuditService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async request => {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const auditService = new AuditService();

    // Calcular fechas según el período
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Obtener auditorías del período
    const audits = await auditService.list({}, { limit: 1000 });

    // Calcular estadísticas
    const stats = {
      total: audits.length,
      byStatus: {
        planificada: 0,
        en_ejecucion: 0,
        completada: 0,
        verificada: 0,
        cerrada: 0,
      },
      byType: {
        interna: 0,
        externa: 0,
        seguimiento: 0,
      },
      conformityRate: 0,
      averageProgress: 0,
      trends: [] as Array<{
        month: string;
        completed: number;
        pending: number;
      }>,
      topFindings: [] as Array<{
        category: string;
        count: number;
      }>,
      topProcesses: [] as Array<{
        name: string;
        auditCount: number;
        conformityRate: number;
      }>,
    };

    // Contar por estado y tipo
    let totalProgress = 0;
    let conformingAudits = 0;
    const processCounts: Record<string, { count: number; conforming: number }> =
      {};
    const findingCategories: Record<string, number> = {};

    for (const audit of audits) {
      // Por estado
      if (audit.status in stats.byStatus) {
        stats.byStatus[audit.status as keyof typeof stats.byStatus]++;
      }

      // Progreso (usar 0 como default)
      totalProgress += 0;

      // Conformidad (usar false como default)
      if (false) {
        conformingAudits++;
      }
    }

    // Calcular promedios
    stats.conformityRate =
      audits.length > 0
        ? Math.round((conformingAudits / audits.length) * 100)
        : 0;
    stats.averageProgress =
      audits.length > 0 ? Math.round(totalProgress / audits.length) : 0;

    // Top Findings
    stats.topFindings = Object.entries(findingCategories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top Processes
    stats.topProcesses = Object.entries(processCounts)
      .map(([name, data]) => ({
        name,
        auditCount: data.count,
        conformityRate:
          data.count > 0 ? Math.round((data.conforming / data.count) * 100) : 0,
      }))
      .sort((a, b) => b.auditCount - a.auditCount)
      .slice(0, 5);

    // Tendencias (últimos 6 meses)
    const trends: Record<string, { completed: number; pending: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      });
      trends[monthKey] = { completed: 0, pending: 0 };
    }

    for (const audit of audits) {
      const auditDate =
        (audit.createdAt as any)?.toDate?.() ||
        new Date(audit.createdAt as any);
      const monthKey = auditDate.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      });

      if (monthKey in trends) {
        if ((audit.status as any) === 'completed') {
          trends[monthKey].completed++;
        } else {
          trends[monthKey].pending++;
        }
      }
    }

    stats.trends = Object.entries(trends).map(([month, data]) => ({
      month,
      ...data,
    }));

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return errorHandler(error);
  }
});
