import { withAuth } from '@/lib/api/withAuth';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { ProductAnalyticsService } from '@/services/analytics/ProductAnalyticsService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
  try {
    const data = await ProductAnalyticsService.getDashboardMetrics();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[super-admin/product-metrics][GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudieron cargar las metricas de producto',
      },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
