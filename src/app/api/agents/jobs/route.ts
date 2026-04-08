import { withAuth } from '@/lib/api/withAuth';
import { AgentMetricsService } from '@/services/agents/AgentMetricsService';
import { JobStatus } from '@/types/agents';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: JobStatus[] = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'pending_approval',
];

export const GET = withAuth(async (req: NextRequest, _context, auth) => {
  try {
    const url = new URL(req.url);
    const orgIdQuery =
      url.searchParams.get('organizationId') ||
      url.searchParams.get('organization_id');
    const limitQuery = url.searchParams.get('limit');
    const offsetQuery = url.searchParams.get('offset');
    const statusQuery = url.searchParams.get('status');
    const intentQuery = url.searchParams.get('intent');

    if (
      orgIdQuery &&
      auth.role !== 'super_admin' &&
      orgIdQuery !== auth.organizationId
    ) {
      return NextResponse.json(
        { error: 'Forbidden organization' },
        { status: 403 }
      );
    }

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

    const limit = limitQuery ? parseInt(limitQuery, 10) : 20;
    const offset = offsetQuery ? parseInt(offsetQuery, 10) : 0;

    if (!Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be a positive integer.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid offset. Must be a non-negative integer.' },
        { status: 400 }
      );
    }

    let status: JobStatus | undefined;
    if (statusQuery && statusQuery !== 'all') {
      if (!VALID_STATUSES.includes(statusQuery as JobStatus)) {
        return NextResponse.json(
          {
            error:
              'Invalid status. Use queued, running, completed, failed, cancelled, pending_approval.',
          },
          { status: 400 }
        );
      }
      status = statusQuery as JobStatus;
    }

    const intent =
      intentQuery && intentQuery !== 'all' ? intentQuery : undefined;

    const data = await AgentMetricsService.getRecentActivity(targetOrgId, {
      limit,
      offset,
      status,
      intent,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/agents/jobs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
