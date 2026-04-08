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
import { z, ZodError } from 'zod';

const bodySchema = z.object({
  status: z.enum([
    'pendiente',
    'en_analisis',
    'documentacion_pendiente',
    'comite',
    'aprobado',
    'rechazado',
    'cerrado',
  ]),
  resolution: z.enum(['aprobado', 'rechazado', 'condicional']).optional(),
  assigned_to_user_id: z.string().min(1).nullable().optional(),
  assigned_to_user_name: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await CreditWorkflowService.getById(id);

      if (!current) {
        return NextResponse.json(
          { success: false, error: 'Workflow crediticio no encontrado' },
          { status: 404 }
        );
      }

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        current.organization_id
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

      const body = bodySchema.parse(await request.json());
      const data = await CreditWorkflowService.moveStatus(
        id,
        orgScope.organizationId,
        body
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[crm/credit-workflows/[id]/move][POST] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo mover el workflow',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
