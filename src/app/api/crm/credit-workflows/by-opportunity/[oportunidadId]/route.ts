import { withAuth } from '@/lib/api/withAuth';
import {
  CRM_RISK_SCORING_DISABLED_MESSAGE,
  hasCrmRiskScoringCapability,
} from '@/lib/plugins/crmRiskScoring';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { CreditWorkflowService } from '@/services/crm/CreditWorkflowService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, { params }, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      if (!(await hasCrmRiskScoringCapability(orgScope.organizationId))) {
        return NextResponse.json(
          { success: false, error: CRM_RISK_SCORING_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      const { oportunidadId } = await params;
      const data = await CreditWorkflowService.getByOpportunityId(
        orgScope.organizationId,
        oportunidadId
      );

      if (!data) {
        return NextResponse.json(
          { success: false, error: 'Workflow crediticio no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error(
        '[crm/credit-workflows/by-opportunity/[oportunidadId]][GET] Error:',
        error
      );
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el workflow' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
