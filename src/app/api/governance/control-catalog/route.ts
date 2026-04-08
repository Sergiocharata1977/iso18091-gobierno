import { withAuth } from '@/lib/api/withAuth';
import { GovernancePhase3Service } from '@/services/governance/GovernancePhase3Service';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, _context, auth) => {
  try {
    const organizationId =
      auth.organizationId ||
      _request.nextUrl.searchParams.get('organization_id');
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    const items =
      await GovernancePhase3Service.getOrCreateControlCatalog(organizationId);

    return NextResponse.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('Error in GET /api/governance/control-catalog:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});

export const POST = withAuth(
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
      const saved = await GovernancePhase3Service.upsertControlCatalogItem(
        organizationId,
        {
          id: body.id,
          control_code: body.control_code,
          control_name: body.control_name,
          objective: body.objective,
          frequency: body.frequency,
          owner: body.owner,
          severity: body.severity,
          expected_evidence: Array.isArray(body.expected_evidence)
            ? body.expected_evidence
            : [],
          status: body.status || 'active',
        }
      );

      return NextResponse.json({
        success: true,
        data: saved,
      });
    } catch (error) {
      console.error('Error in POST /api/governance/control-catalog:', error);
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
