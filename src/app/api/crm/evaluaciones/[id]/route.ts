import { withAuth } from '@/lib/api/withAuth';
import {
  CRM_RISK_SCORING_DISABLED_MESSAGE,
  hasCrmRiskScoringCapability,
} from '@/lib/plugins/crmRiskScoring';
import { EvaluacionRiesgoService } from '@/services/crm/EvaluacionRiesgoService';
import { NextResponse } from 'next/server';

function denied(auth: any, orgId?: string) {
  return (
    auth.role !== 'super_admin' &&
    auth.organizationId &&
    orgId &&
    orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const evaluacion = await EvaluacionRiesgoService.getById(id);
      if (!evaluacion)
        return NextResponse.json(
          { success: false, error: 'Evaluacion no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (evaluacion as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      if (
        !(await hasCrmRiskScoringCapability(
          (evaluacion as any).organization_id || ''
        ))
      ) {
        return NextResponse.json(
          { success: false, error: CRM_RISK_SCORING_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, data: evaluacion });
    } catch (error: any) {
      console.error('Error in GET /api/crm/evaluaciones/[id]:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await EvaluacionRiesgoService.getById(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Evaluacion no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      if (
        !(await hasCrmRiskScoringCapability((current as any).organization_id || ''))
      ) {
        return NextResponse.json(
          { success: false, error: CRM_RISK_SCORING_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      const body = await request.json();
      if (body.estado === 'aprobada') {
        if (!body.tier_asignado) {
          return NextResponse.json(
            {
              success: false,
              error: 'tier_asignado es requerido para aprobar',
            },
            { status: 400 }
          );
        }

        const resultado = await EvaluacionRiesgoService.aprobar(
          id,
          body.tier_asignado,
          body.limite_credito_asignado || 0
        );

        if (!resultado.success) {
          return NextResponse.json(
            { success: false, error: resultado.error },
            { status: 400 }
          );
        }
      } else if (body.estado === 'rechazada') {
        const resultado = await EvaluacionRiesgoService.rechazar(
          id,
          body.evaluacion_personal
        );

        if (!resultado.success) {
          return NextResponse.json(
            { success: false, error: resultado.error },
            { status: 400 }
          );
        }
      } else {
        await EvaluacionRiesgoService.update(id, body);
      }

      const evaluacion = await EvaluacionRiesgoService.getById(id);
      return NextResponse.json({ success: true, data: evaluacion });
    } catch (error: any) {
      console.error('Error in PATCH /api/crm/evaluaciones/[id]:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error al actualizar' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await EvaluacionRiesgoService.getById(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Evaluacion no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      if (
        !(await hasCrmRiskScoringCapability((current as any).organization_id || ''))
      ) {
        return NextResponse.json(
          { success: false, error: CRM_RISK_SCORING_DISABLED_MESSAGE },
          { status: 403 }
        );
      }

      await EvaluacionRiesgoService.delete(id);
      return NextResponse.json({
        success: true,
        message: 'Evaluacion eliminada exitosamente',
      });
    } catch (error: any) {
      console.error('Error in DELETE /api/crm/evaluaciones/[id]:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error al eliminar' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'super_admin'] }
);
