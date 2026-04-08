import { withAuth } from '@/lib/api/withAuth';
import { SurveyTriggerService } from '@/services/surveys/SurveyTriggerService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const period = searchParams.get('period');
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const data = await SurveyTriggerService.getNpsDashboard({
        organizationId,
        period:
          period === 'month' || period === 'quarter' || period === 'year'
            ? period
            : 'month',
      });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[GET /api/crm/satisfaccion]', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
