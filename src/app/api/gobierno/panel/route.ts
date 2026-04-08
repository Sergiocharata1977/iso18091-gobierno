import { withAuth } from '@/lib/api/withAuth';
import { assembleGovMonitor, buildGovPanelData } from '@/lib/gov/monitor-assembler';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      const scope = await resolveAuthorizedOrganizationId(auth, undefined);

      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: scope.status ?? 403 }
        );
      }

      const orgId = scope.organizationId;
      const monitor = await assembleGovMonitor(orgId);
      const data = buildGovPanelData(monitor);

      return NextResponse.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[gobierno/panel][GET]', error);

      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo cargar el panel municipal',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'manager', 'employee'] }
);
