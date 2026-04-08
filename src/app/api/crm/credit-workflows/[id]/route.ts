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

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

const patchBodySchema = z.object({
  status: z
    .enum([
      'pendiente',
      'en_analisis',
      'documentacion_pendiente',
      'comite',
      'aprobado',
      'rechazado',
      'cerrado',
    ])
    .optional(),
  resolution: z.enum(['aprobado', 'rechazado', 'condicional']).optional(),
  assigned_to_user_id: z.string().min(1).nullable().optional(),
  assigned_to_user_name: z.string().min(1).nullable().optional(),
  evaluacion_id_vigente: z.string().min(1).nullable().optional(),
  sla_due_at: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
});

async function authorizeWorkflow(
  auth: Parameters<typeof resolveAuthorizedOrganizationId>[0],
  workflowOrganizationId: string
) {
  const orgScope = await resolveAuthorizedOrganizationId(auth, workflowOrganizationId, {
    allowSuperAdminCrossOrg: true,
  });

  if (!orgScope.ok || !orgScope.organizationId) {
    const error = toOrganizationApiError(orgScope, {
      defaultStatus: 403,
      defaultError: 'Acceso denegado',
    });
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: error.error, errorCode: error.errorCode },
        { status: error.status }
      ),
    };
  }

  return { ok: true as const, organizationId: orgScope.organizationId };
}

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const workflow = await CreditWorkflowService.getById(id);

      if (!workflow) {
        return NextResponse.json(
          { success: false, error: 'Workflow crediticio no encontrado' },
          { status: 404 }
        );
      }

      const scope = await authorizeWorkflow(auth, workflow.organization_id);
      if (!scope.ok) return scope.response;
      if (!(await hasCrmRiskScoringCapability(scope.organizationId))) {
        return NextResponse.json(
          { success: false, error: CRM_RISK_SCORING_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, data: workflow });
    } catch (error) {
      console.error('[crm/credit-workflows/[id]][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el workflow' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...READ_ROLES] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const workflow = await CreditWorkflowService.getById(id);

      if (!workflow) {
        return NextResponse.json(
          { success: false, error: 'Workflow crediticio no encontrado' },
          { status: 404 }
        );
      }

      const scope = await authorizeWorkflow(auth, workflow.organization_id);
      if (!scope.ok) return scope.response;
      if (!(await hasCrmRiskScoringCapability(scope.organizationId))) {
        return NextResponse.json(
          { success: false, error: CRM_RISK_SCORING_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      const body = patchBodySchema.parse(await request.json());
      const data = await CreditWorkflowService.update(
        id,
        scope.organizationId,
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

      console.error('[crm/credit-workflows/[id]][PATCH] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo actualizar el workflow',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...WRITE_ROLES] }
);
