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

const statusSchema = z.enum([
  'pendiente',
  'en_analisis',
  'documentacion_pendiente',
  'comite',
  'aprobado',
  'rechazado',
  'cerrado',
]);

const listQuerySchema = z.object({
  status: statusSchema.optional(),
  activo: z
    .enum(['true', 'false'])
    .transform(value => value === 'true')
    .optional(),
  oportunidad_id: z.string().min(1).optional(),
  crm_organizacion_id: z.string().min(1).optional(),
  assigned_to_user_id: z.string().min(1).optional(),
});

const createBodySchema = z.object({
  organization_id: z.string().min(1).optional(),
  oportunidad_id: z.string().min(1),
  crm_organizacion_id: z.string().min(1),
  cliente_nombre: z.string().min(1),
  oportunidad_nombre: z.string().min(1),
  stage_origin_id: z.string().min(1),
  stage_origin_name: z.string().min(1),
  status: statusSchema.optional(),
  assigned_to_user_id: z.string().min(1).optional(),
  assigned_to_user_name: z.string().min(1).optional(),
  evaluacion_id_vigente: z.string().min(1).optional(),
  sla_due_at: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
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

      const query = listQuerySchema.parse({
        status: request.nextUrl.searchParams.get('status') || undefined,
        activo: request.nextUrl.searchParams.get('activo') || undefined,
        oportunidad_id:
          request.nextUrl.searchParams.get('oportunidad_id') || undefined,
        crm_organizacion_id:
          request.nextUrl.searchParams.get('crm_organizacion_id') || undefined,
        assigned_to_user_id:
          request.nextUrl.searchParams.get('assigned_to_user_id') || undefined,
      });

      const data = await CreditWorkflowService.listByOrganization(
        orgScope.organizationId,
        query
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[crm/credit-workflows][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los workflows' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = createBodySchema.parse(await request.json());
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        body.organization_id || request.nextUrl.searchParams.get('organization_id')
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

      const data = await CreditWorkflowService.createForOpportunity({
        ...body,
        organization_id: orgScope.organizationId,
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[crm/credit-workflows][POST] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo crear el workflow',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...WRITE_ROLES] }
);
