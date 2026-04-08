import { withAuth } from '@/lib/api/withAuth';
import { ActionService } from '@/services/actions/ActionService';
import type { ActionPriority, ActionStatus, ActionType } from '@/types/actions';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      status: (searchParams.get('status') as ActionStatus) || undefined,
      actionType: (searchParams.get('actionType') as ActionType) || undefined,
      priority: (searchParams.get('priority') as ActionPriority) || undefined,
      responsiblePersonId: searchParams.get('responsiblePersonId') || undefined,
      processId: searchParams.get('processId') || undefined,
      findingId: searchParams.get('findingId') || undefined,
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

    const stats = await ActionService.getStats(organizationId, filters);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/actions/stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadisticas' },
      { status: 500 }
    );
  }
});
