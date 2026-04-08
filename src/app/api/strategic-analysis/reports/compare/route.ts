import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';
import { NextResponse } from 'next/server';

const READ_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const GET = withAuth(
  async (req, _context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(auth, auth.organizationId, {
        requireOrg: true,
      });
      if (!orgScope.ok || !orgScope.organizationId) {
        return NextResponse.json(
          { error: orgScope.error ?? 'Sin organizacion', errorCode: orgScope.errorCode },
          { status: orgScope.status ?? 403 }
        );
      }

      const { searchParams } = new URL(req.url);
      const baseId = searchParams.get('base');
      const targetId = searchParams.get('target');

      if (!baseId || !targetId) {
        return NextResponse.json({ error: 'Parametros base y target son obligatorios' }, { status: 400 });
      }

      const [base, target] = await Promise.all([
        StrategicAnalysisReportService.getById(orgScope.organizationId, baseId),
        StrategicAnalysisReportService.getById(orgScope.organizationId, targetId),
      ]);

      if (!base || !target) {
        return NextResponse.json({ error: 'Reporte base o target no encontrado' }, { status: 404 });
      }

      return NextResponse.json({
        base,
        target,
        diff: {
          global_score_delta: (target.global_score ?? 0) - (base.global_score ?? 0),
          norm_gaps_delta: target.norm_gaps.length - base.norm_gaps.length,
          priorities_delta: target.priorities.length - base.priorities.length,
          risks_alerts_delta: target.risks_alerts.length - base.risks_alerts.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: [...READ_ROLES] }
);
