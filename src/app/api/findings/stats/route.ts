import { withAuth } from '@/lib/api/withAuth';
import { FindingService } from '@/services/findings/FindingService';
import type { FindingStatus } from '@/types/findings';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      status: (searchParams.get('status') as FindingStatus) || undefined,
      processId: searchParams.get('processId') || undefined,
      year: searchParams.get('year')
        ? parseInt(searchParams.get('year')!, 10)
        : undefined,
    };

    const organizationId =
      auth.organizationId || searchParams.get('organization_id');
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    const stats = await FindingService.getStats(organizationId, filters);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in GET /api/findings/stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadisticas' },
      { status: 500 }
    );
  }
});
