jest.mock('@/services/strategic-analysis/StrategicAnalysisReportService', () => ({
  StrategicAnalysisReportService: {
    list: jest.fn(),
  },
}));

import { JourneyStrategicBadgeService } from '@/services/JourneyStrategicBadgeService';
import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';
import type { StrategicAnalysisReport, StrategicFinding } from '@/types/strategic-analysis';

function buildFinding(
  overrides: Partial<StrategicFinding>
): StrategicFinding {
  return {
    id: overrides.id ?? 'finding-1',
    category: overrides.category ?? 'strategic',
    dimension: overrides.dimension ?? 'processes',
    level: overrides.level ?? 'critical',
    titulo: overrides.titulo ?? 'Hallazgo',
    descripcion: overrides.descripcion ?? 'Descripcion',
    evidencia: overrides.evidencia ?? [],
    ...overrides,
  };
}

function buildReport(
  overrides: Partial<StrategicAnalysisReport>
): StrategicAnalysisReport {
  return {
    id: overrides.id ?? 'report-1',
    organization_id: overrides.organization_id ?? 'org-1',
    created_at: overrides.created_at ?? new Date().toISOString(),
    created_by: overrides.created_by ?? 'user-1',
    created_for_role: overrides.created_for_role ?? 'admin',
    title: overrides.title ?? 'Reporte',
    status: overrides.status ?? 'analyzed',
    analysis_scope: overrides.analysis_scope ?? 'organization_general',
    reading_orientation: overrides.reading_orientation ?? 'direccion',
    plugin_scope: overrides.plugin_scope ?? [],
    horizon: overrides.horizon ?? '30d',
    executive_summary: overrides.executive_summary ?? '',
    dimension_scores: overrides.dimension_scores ?? [],
    norm_gaps: overrides.norm_gaps ?? [],
    strategic_findings: overrides.strategic_findings ?? [],
    operational_findings: overrides.operational_findings ?? [],
    risks_alerts: overrides.risks_alerts ?? [],
    opportunities: overrides.opportunities ?? [],
    priorities: overrides.priorities ?? [],
    suggested_actions: overrides.suggested_actions ?? [],
    raw_context_snapshot:
      overrides.raw_context_snapshot ??
      ({
        organizationId: 'org-1',
        generatedAt: new Date().toISOString(),
        generatedForUserId: 'user-1',
        generatedForRole: 'admin',
        analysisScope: 'organization_general',
        installedPlugins: [],
        organization: {},
        executiveIndicators: {},
        operationalMetrics: {},
        pluginContexts: {},
        evidenceSummary: {},
        sourceRefs: [],
      } as StrategicAnalysisReport['raw_context_snapshot']),
    ai_metadata: overrides.ai_metadata ?? {},
  };
}

describe('JourneyStrategicBadgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin reporte devuelve array vacio', async () => {
    (StrategicAnalysisReportService.list as jest.Mock).mockResolvedValue([]);

    await expect(
      JourneyStrategicBadgeService.getBadgesForOrg('org-empty')
    ).resolves.toEqual([]);
  });

  it('hallazgo critical en processes genera badge en fase 3 con level critical', async () => {
    (StrategicAnalysisReportService.list as jest.Mock).mockResolvedValue([
      buildReport({
        strategic_findings: [
          buildFinding({
            dimension: 'processes',
            level: 'critical',
            titulo: 'Proceso critico',
          }),
        ],
      }),
    ]);

    const badges = await JourneyStrategicBadgeService.getBadgesForOrg('org-1');

    expect(badges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phaseId: 3,
          level: 'critical',
          count: 1,
          topFinding: 'Proceso critico',
          reportId: 'report-1',
        }),
      ])
    );
  });

  it('hallazgo warning en audits genera badge en fase 5 con level warning', async () => {
    (StrategicAnalysisReportService.list as jest.Mock).mockResolvedValue([
      buildReport({
        risks_alerts: [
          buildFinding({
            id: 'finding-audit',
            category: 'alert',
            dimension: 'audits',
            level: 'high',
            titulo: 'Auditoria demorada',
          }),
        ],
      }),
    ]);

    const badges = await JourneyStrategicBadgeService.getBadgesForOrg('org-1');

    expect(badges).toEqual([
      {
        phaseId: 5,
        level: 'warning',
        count: 1,
        topFinding: 'Auditoria demorada',
        reportId: 'report-1',
      },
    ]);
  });

  it('hallazgos low o medium no generan badges', async () => {
    (StrategicAnalysisReportService.list as jest.Mock).mockResolvedValue([
      buildReport({
        strategic_findings: [
          buildFinding({ id: 'low', dimension: 'processes', level: 'low' }),
          buildFinding({ id: 'medium', dimension: 'audits', level: 'medium' }),
        ],
      }),
    ]);

    const badges = await JourneyStrategicBadgeService.getBadgesForOrg('org-1');

    expect(badges).toEqual([]);
  });
});
