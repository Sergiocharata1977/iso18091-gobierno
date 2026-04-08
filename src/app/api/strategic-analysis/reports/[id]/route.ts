import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';
import { NextResponse } from 'next/server';

const READ_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

// GET /api/strategic-analysis/reports/[id]
export const GET = withAuth(
  async (_req, context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        auth.organizationId,
        { requireOrg: true }
      );
      if (!orgScope.ok || !orgScope.organizationId) {
        return NextResponse.json(
          { error: orgScope.error ?? 'Sin organización', errorCode: orgScope.errorCode },
          { status: orgScope.status ?? 403 }
        );
      }
      const orgId = orgScope.organizationId;

      const { id: reportId } = await context.params;
      if (!reportId) {
        return NextResponse.json({ error: 'ID de reporte requerido' }, { status: 400 });
      }

      const report = await StrategicAnalysisReportService.getById(orgId, reportId);
      if (!report) {
        return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
      }

      return NextResponse.json({ report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error interno';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: [...READ_ROLES] }
);
