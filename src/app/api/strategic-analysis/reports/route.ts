import { withAuth } from '@/lib/api/withAuth';
import { strategicAnalysisRequestSchema } from '@/lib/validations/strategic-analysis';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { StrategicAnalysisContextBuilder } from '@/services/strategic-analysis/StrategicAnalysisContextBuilder';
import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';
import { StrategicAnalysisService } from '@/services/strategic-analysis/StrategicAnalysisService';
import { NextResponse } from 'next/server';

const WRITE_ROLES = ['admin', 'gerente', 'super_admin'] as const;
const READ_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

// POST /api/strategic-analysis/reports
// Genera contexto + persiste el reporte (status: context_ready)
export const POST = withAuth(
  async (req, _context, auth) => {
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

      const body: unknown = await req.json();
      const parsed = strategicAnalysisRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Datos de solicitud inválidos', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const context = await StrategicAnalysisContextBuilder.build({
        organizationId: orgId,
        userId: auth.uid,
        userRole: auth.role,
        scope: parsed.data.scope,
        targetId: parsed.data.target_id,
        targetType: parsed.data.target_type,
        includePlugins: parsed.data.include_plugins,
      });

      // Crear stub del reporte (context_ready)
      const stub = await StrategicAnalysisReportService.create(
        orgId,
        auth.uid,
        auth.role,
        parsed.data,
        context
      );

      // Ola 2 — análisis IA + scoring determinístico (sync)
      const analysisResult = await StrategicAnalysisService.analyze(
        context,
        parsed.data.reading_orientation
      );
      const report = await StrategicAnalysisReportService.updateAnalysis(
        orgId,
        stub.id,
        analysisResult
      );

      return NextResponse.json({ report }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error interno';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: [...WRITE_ROLES] }
);

// GET /api/strategic-analysis/reports
// Lista reportes del tenant con filtros opcionales: ?scope=&limit=&cursor=
export const GET = withAuth(
  async (req, _context, auth) => {
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

      const { searchParams } = new URL(req.url);
      const scope = searchParams.get('scope') ?? undefined;
      const limit = Math.min(
        parseInt(searchParams.get('limit') ?? '10', 10),
        50
      );
      const cursor = searchParams.get('cursor') ?? undefined;

      const reports = await StrategicAnalysisReportService.list(orgId, {
        scope,
        limit,
        cursor,
      });

      return NextResponse.json({ reports, total: reports.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error interno';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: [...READ_ROLES] }
);
