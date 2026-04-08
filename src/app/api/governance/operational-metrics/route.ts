import { withAuth } from '@/lib/api/withAuth';
import { GovernancePhase3Service } from '@/services/governance/GovernancePhase3Service';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slaDaysParam = searchParams.get('sla_days');
    const slaDays = slaDaysParam ? parseInt(slaDaysParam, 10) : 30;

    const organizationId =
      auth.organizationId || searchParams.get('organization_id');
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    const metrics = await GovernancePhase3Service.generateOperationalMetrics(
      organizationId,
      Number.isNaN(slaDays) ? 30 : slaDays
    );

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error in GET /api/governance/operational-metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
