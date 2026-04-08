import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { PlanificacionRevisionV2Service } from '@/services/planificacion-revision-direccion/PlanificacionRevisionV2Service';
import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';
import type { RiesgoOportunidad } from '@/types/planificacion-revision-direccion-v2';
import type { StrategicAnalysisReport } from '@/types/strategic-analysis';
import { NextResponse } from 'next/server';

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function toQuarterPeriod(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
}

function mapRiesgos(
  reportId: string,
  report: StrategicAnalysisReport
): RiesgoOportunidad[] {

  const risks = report.risks_alerts.slice(0, 5).map(item => ({
    id: `${reportId}-risk-${item.id}`,
    tipo: 'riesgo' as const,
    fuente: 'auditoria' as const,
    titulo: item.titulo,
    descripcion: item.descripcion,
    probabilidad: 'media' as const,
    impacto: (item.level === 'critical' ? 'muy_alto' : 'alto') as
      | 'muy_alto'
      | 'alto',
    nivel_riesgo: (item.level === 'critical' ? 'critico' : 'alto') as
      | 'critico'
      | 'alto',
    acciones_planificadas: [],
    estado: 'identificado' as const,
    fecha_identificacion: new Date().toISOString(),
    fecha_ultima_revision: new Date().toISOString(),
    notas: `Fuente: analisis estrategico ${reportId}`,
  }));

  const opportunities = report.opportunities.slice(0, 3).map(item => ({
    id: `${reportId}-opp-${item.id}`,
    tipo: 'oportunidad' as const,
    fuente: 'contexto_interno' as const,
    titulo: item.titulo,
    descripcion: item.descripcion,
    probabilidad: 'media' as const,
    impacto: 'medio' as const,
    nivel_riesgo: 'medio' as const,
    acciones_planificadas: [],
    estado: 'identificado' as const,
    fecha_identificacion: new Date().toISOString(),
    fecha_ultima_revision: new Date().toISOString(),
    notas: `Fuente: analisis estrategico ${reportId}`,
  }));

  return [...risks, ...opportunities];
}

export const POST = withAuth(
  async (_req, context, auth) => {
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

      const { id: reportId } = await context.params;
      if (!reportId) {
        return NextResponse.json({ error: 'ID de reporte requerido' }, { status: 400 });
      }

      const report = await StrategicAnalysisReportService.getById(orgScope.organizationId, reportId);
      if (!report) {
        return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
      }

      const now = new Date();
      const revision = await PlanificacionRevisionV2Service.createRevision({
        created_by: auth.uid,
        fecha_revision: now.toISOString().slice(0, 10),
        periodo: toQuarterPeriod(now),
        IdentidadOrganizacional: {
          NOMBRE_ORGANIZACION: report.raw_context_snapshot.organization.name || '',
          SECTOR: report.raw_context_snapshot.organization.sector || '',
          DESCRIPCION: report.executive_summary || '',
          TOTAL_EMPLEADOS: report.raw_context_snapshot.organization.employeeCount || 0,
          EMPLEADOS_CON_ACCESO: report.raw_context_snapshot.organization.employeeCount || 0,
          MISION: '',
          VISION: '',
        },
        Contexto: {
          FECHA_ANALISIS: now.toISOString().slice(0, 10),
          FRECUENCIA_REVISION: 'semestral',
          CUESTIONES_EXTERNAS: [],
          CUESTIONES_INTERNAS: report.strategic_findings.slice(0, 5).map(item => ({
            tipo: 'recursos' as const,
            descripcion: item.titulo,
            estado_actual: item.descripcion,
            fortaleza_debilidad: item.level === 'low' ? 'fortaleza' : 'debilidad',
          })),
        },
        RiesgosOportunidades: mapRiesgos(reportId, report),
      });

      return NextResponse.json({
        revision,
        source_report_id: report.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: [...WRITE_ROLES] }
);
