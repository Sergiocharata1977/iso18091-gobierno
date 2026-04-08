import { StrategicAnalysisConfidenceService } from '@/services/strategic-analysis/StrategicAnalysisConfidenceService';
import type { StrategicAnalysisContext } from '@/types/strategic-analysis';

function buildContext(
  overrides: Partial<StrategicAnalysisContext> = {}
): StrategicAnalysisContext {
  return {
    organizationId: 'org-1',
    generatedAt: '2026-04-03T00:00:00.000Z',
    generatedForUserId: 'user-1',
    generatedForRole: 'admin',
    analysisScope: 'organization_general',
    installedPlugins: [],
    organization: {
      name: 'Org test',
      employeeCount: 120,
    },
    executiveIndicators: {},
    operationalMetrics: {},
    pluginContexts: {},
    evidenceSummary: {
      auditsTotal: 4,
      findingsOpen: 0,
      actionsOpen: 3,
      documentsPending: 1,
      trainingsPending: 2,
      processesTotal: 5,
    },
    sourceRefs: [],
    compliance: {
      globalPercentage: 81,
    },
    maturity: {
      globalScore: 74,
      byDimension: [],
    },
    ...overrides,
  };
}

describe('StrategicAnalysisConfidenceService', () => {
  const service = new StrategicAnalysisConfidenceService();

  it('calcula confianza alta cuando todas las fuentes esperadas estan presentes', () => {
    const result = service.computeConfidence(buildContext());

    expect(result.confidence_level).toBe('alto');
    expect(result.context_completeness_pct).toBeGreaterThan(75);
    expect(result.missing_sources).toEqual([]);
    expect(result.dimension_coverage.gobernanza).toEqual(
      expect.arrayContaining(['compliance', 'audits', 'maturity', 'personnel'])
    );
  });

  it('marca compliance y maturity como faltantes cuando no vienen en el contexto', () => {
    const result = service.computeConfidence(
      buildContext({
        compliance: undefined,
        maturity: undefined,
      })
    );

    expect(result.missing_sources).toEqual(
      expect.arrayContaining(['compliance', 'maturity'])
    );
  });

  it('devuelve confianza baja para un contexto vacio', () => {
    const result = service.computeConfidence(
      buildContext({
        organization: {},
        compliance: undefined,
        maturity: undefined,
        evidenceSummary: {},
      })
    );

    expect(result.context_completeness_pct).toBe(0);
    expect(result.confidence_level).toBe('bajo');
  });
});
