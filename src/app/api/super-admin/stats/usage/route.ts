import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { withAuth } from '@/lib/api/withAuth';
import { ProductAnalyticsService } from '@/services/analytics/ProductAnalyticsService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, _context, _auth) => {
    try {
      const [capabilitiesUsage, activeUsers] = await Promise.all([
        ProductAnalyticsService.getCapabilitiesUsageStats(),
        ProductAnalyticsService.getActiveUsersStats(),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          capabilitiesUsage,
          activeUsers,
        },
      });
    } catch (error) {
      console.error('[super-admin/stats/usage][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron cargar las métricas de uso' },
        { status: 500 }
      );
    }
  },
  SUPER_ADMIN_AUTH_OPTIONS
);
