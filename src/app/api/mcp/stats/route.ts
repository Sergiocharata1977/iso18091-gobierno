import { withAuth } from '@/lib/api/withAuth';
import { AgentMetricsService } from '@/services/agents/AgentMetricsService';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withAuth(async (req: NextRequest, _context, auth) => {
  try {
    if (!auth.organizationId) {
      return NextResponse.json(
        { error: 'Organization ID missing' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const orgIdQuery =
      url.searchParams.get('organizationId') ||
      url.searchParams.get('organization_id');

    if (
      orgIdQuery &&
      orgIdQuery !== auth.organizationId &&
      auth.role !== 'super_admin'
    ) {
      return NextResponse.json(
        { error: 'Forbidden organization' },
        { status: 403 }
      );
    }

    const detailedParam =
      url.searchParams.get('detailed') ||
      url.searchParams.get('includeDetails');
    const detailed = detailedParam === '1' || detailedParam === 'true';

    const targetOrgId =
      auth.role === 'super_admin'
        ? orgIdQuery || auth.organizationId
        : auth.organizationId;

    if (!targetOrgId) {
      return NextResponse.json(
        { error: 'Organization ID missing' },
        { status: 400 }
      );
    }

    if (detailed) {
      const data =
        await AgentMetricsService.getGlobalStatsDetailed(targetOrgId);
      return NextResponse.json(data);
    }

    const stats = await AgentMetricsService.getGlobalStats(targetOrgId);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error in /api/mcp/stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
