import { withAuth } from '@/lib/api/withAuth';
import {
  CRM_RISK_SCORING_DISABLED_MESSAGE,
  hasCrmRiskScoringCapability,
} from '@/lib/plugins/crmRiskScoring';
import { EvaluacionRiesgoService } from '@/services/crm/EvaluacionRiesgoService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;
      const clienteId = searchParams.get('cliente_id');
      const soloVigentes = searchParams.get('solo_vigentes') === 'true';

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      if (!(await hasCrmRiskScoringCapability(organizationId))) {
        return NextResponse.json(
          { success: false, error: CRM_RISK_SCORING_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      const evaluaciones = clienteId
        ? await EvaluacionRiesgoService.getByCliente(organizationId, clienteId)
        : await EvaluacionRiesgoService.getByOrganization(
            organizationId,
            soloVigentes
          );

      return NextResponse.json({ success: true, data: evaluaciones });
    } catch (error: any) {
      console.error('Error in GET /api/crm/evaluaciones:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const organization_id =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      if (!organization_id)
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      if (!(await hasCrmRiskScoringCapability(organization_id))) {
        return NextResponse.json(
          { success: false, error: CRM_RISK_SCORING_DISABLED_MESSAGE },
          { status: 403 }
        );
      }
      if (!body.crm_organizacion_id) {
        return NextResponse.json(
          { success: false, error: 'crm_organizacion_id es requerido' },
          { status: 400 }
        );
      }
      if (!body.items || body.items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'items de evaluacion son requeridos' },
          { status: 400 }
        );
      }

      const evaluacion = await EvaluacionRiesgoService.create(
        organization_id,
        auth.uid,
        body.evaluador_nombre || auth.email || 'Sistema',
        {
          crm_organizacion_id: body.crm_organizacion_id,
          oportunidad_id: body.oportunidad_id,
          credit_workflow_id: body.credit_workflow_id,
          cliente_nombre: body.cliente_nombre,
          cliente_cuit: body.cliente_cuit,
          patrimonio_neto_computable: body.patrimonio_neto_computable || 0,
          items: body.items,
          score_nosis: body.score_nosis,
          evaluacion_personal: body.evaluacion_personal,
        }
      );

      return NextResponse.json({ success: true, data: evaluacion });
    } catch (error: any) {
      console.error('Error in POST /api/crm/evaluaciones:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error al crear evaluacion' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
