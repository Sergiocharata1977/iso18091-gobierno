import { withAuth } from '@/lib/api/withAuth';
import { QualityMeasurementOverdueDetectorService } from '@/services/agents/QualityMeasurementOverdueDetectorService';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const dynamic = 'force-dynamic';

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = await request.json().catch(() => ({}));
      const requestedOrgId = String(
        body?.organizationId ?? body?.organization_id ?? ''
      ).trim();

      const targetOrgId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!targetOrgId) {
        return NextResponse.json(
          { error: 'Organization ID missing' },
          { status: 400 }
        );
      }

      if (
        requestedOrgId &&
        auth.role !== 'super_admin' &&
        requestedOrgId !== auth.organizationId
      ) {
        return NextResponse.json(
          { error: 'Forbidden organization' },
          { status: 403 }
        );
      }

      const rawMaxIndicators = Number(
        body?.maxIndicators ?? body?.max_indicators
      );
      const maxIndicators = Number.isFinite(rawMaxIndicators)
        ? Math.max(1, Math.min(1000, Math.floor(rawMaxIndicators)))
        : undefined;
      const rawDryRun = body?.dryRun ?? body?.dry_run;
      const dryRun =
        rawDryRun === true ||
        rawDryRun === 'true' ||
        rawDryRun === 1 ||
        rawDryRun === '1';

      const detector = new QualityMeasurementOverdueDetectorService();
      const result = await detector.detectAndEnqueue({
        organizationId: targetOrgId,
        dryRun,
        maxIndicators,
      });

      return NextResponse.json(
        {
          ok: true,
          ...result,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error(
        '[API /agents/quality-measurements/detect-overdue] Error:',
        error
      );
      return NextResponse.json(
        { error: 'Error ejecutando detector de mediciones vencidas' },
        { status: 500 }
      );
    }
  },
  { roles: [...ALLOWED_ROLES] }
);
