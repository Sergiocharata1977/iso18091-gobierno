import { withAuth } from '@/lib/api/withAuth';
import { ProcessGovernanceService } from '@/services/processes/ProcessGovernanceService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const organizationId =
      auth.organizationId ||
      request.nextUrl.searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    const config =
      await ProcessGovernanceService.getGovernanceConfig(organizationId);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error in GET /api/governance/config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(
  async (request, _context, auth) => {
    try {
      const organizationId =
        auth.organizationId ||
        request.nextUrl.searchParams.get('organization_id');

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const body = await request.json();

      const config = await ProcessGovernanceService.upsertGovernanceConfig(
        organizationId,
        {
          enabled:
            typeof body?.enabled === 'boolean'
              ? Boolean(body.enabled)
              : undefined,
          thresholds:
            body?.thresholds && typeof body.thresholds === 'object'
              ? body.thresholds
              : undefined,
        },
        auth.uid
      );

      return NextResponse.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('Error in PUT /api/governance/config:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
