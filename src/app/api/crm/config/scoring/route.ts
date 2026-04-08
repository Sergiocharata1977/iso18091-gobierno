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

      const config =
        await EvaluacionRiesgoService.getOrCreateConfig(organizationId);
      return NextResponse.json({ success: true, data: config });
    } catch (error: any) {
      console.error('Error in GET /api/crm/config/scoring:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      if (!body.id) {
        return NextResponse.json(
          { success: false, error: 'id de configuracion es requerido' },
          { status: 400 }
        );
      }

      const totalPesos =
        (body.peso_cualitativos || 0) +
        (body.peso_conflictos || 0) +
        (body.peso_cuantitativos || 0);
      if (Math.abs(totalPesos - 1) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: `Los pesos deben sumar 100%. Actual: ${Math.round(totalPesos * 100)}%`,
          },
          { status: 400 }
        );
      }

      const config = await EvaluacionRiesgoService.getById(body.id as string);
      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Configuracion no encontrada' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (config as any).organization_id &&
        (config as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      if (
        !(await hasCrmRiskScoringCapability((config as any).organization_id || ''))
      ) {
        return NextResponse.json(
          { success: false, error: CRM_RISK_SCORING_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      await EvaluacionRiesgoService.updateConfig(body.id, {
        peso_cualitativos: body.peso_cualitativos,
        peso_conflictos: body.peso_conflictos,
        peso_cuantitativos: body.peso_cuantitativos,
        tier_a_min_score: body.tier_a_min_score,
        tier_a_max_patrimonio: body.tier_a_max_patrimonio,
        tier_b_min_score: body.tier_b_min_score,
        tier_b_max_patrimonio: body.tier_b_max_patrimonio,
        tier_c_min_score: body.tier_c_min_score,
        tier_c_max_patrimonio: body.tier_c_max_patrimonio,
        frecuencia_actualizacion_meses: body.frecuencia_actualizacion_meses,
      });

      return NextResponse.json({
        success: true,
        message: 'Configuracion actualizada',
      });
    } catch (error: any) {
      console.error('Error in PATCH /api/crm/config/scoring:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error al actualizar' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'super_admin'] }
);
