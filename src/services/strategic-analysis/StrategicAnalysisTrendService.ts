import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';

export interface AnalysisTrend {
  global_score_delta: number;
  dimension_deltas: Record<string, number>;
  trend_direction: 'mejorando' | 'estable' | 'empeorando';
  periods_analyzed: number;
  previous_report_date?: Date;
}

export class StrategicAnalysisTrendService {
  /**
   * Compara el reporte actual con los N reportes anteriores de la org
   * y retorna la tendencia por score global y por dimensión.
   */
  static async getTrend(
    orgId: string,
    currentReportId: string,
    lookback: number = 3
  ): Promise<AnalysisTrend> {
    // Cargar el reporte actual
    const [currentReport, allRecent] = await Promise.all([
      StrategicAnalysisReportService.getById(orgId, currentReportId),
      StrategicAnalysisReportService.list(orgId, { limit: lookback + 1 }),
    ]);

    if (!currentReport) {
      return {
        global_score_delta: 0,
        dimension_deltas: {},
        trend_direction: 'estable',
        periods_analyzed: 0,
      };
    }

    // Filtrar reportes anteriores al actual (excluir el propio currentReportId)
    const previousReports = allRecent
      .filter(r => r.id !== currentReportId)
      .slice(0, lookback);

    if (previousReports.length === 0) {
      return {
        global_score_delta: 0,
        dimension_deltas: {},
        trend_direction: 'estable',
        periods_analyzed: 0,
      };
    }

    // Score global: delta vs promedio de anteriores
    const previousScores = previousReports
      .map(r => r.global_score ?? 0)
      .filter(s => s > 0);

    const avgPrevious =
      previousScores.length > 0
        ? previousScores.reduce((a, b) => a + b, 0) / previousScores.length
        : 0;

    const currentScore = currentReport.global_score ?? 0;
    const globalDelta = Math.round((currentScore - avgPrevious) * 10) / 10;

    // Deltas por dimensión
    const dimensionDeltas: Record<string, number> = {};
    const currentDims = currentReport.dimension_scores ?? [];

    for (const { dimension, score: currentVal } of currentDims) {
      const prevVals = previousReports
        .map(r => {
          const entry = (r.dimension_scores ?? []).find(
            d => d.dimension === dimension
          );
          return entry?.score ?? null;
        })
        .filter((v): v is number => v !== null);

      if (prevVals.length > 0) {
        const avgPrevDim =
          prevVals.reduce((a, b) => a + b, 0) / prevVals.length;
        dimensionDeltas[dimension] =
          Math.round((currentVal - avgPrevDim) * 10) / 10;
      }
    }

    // Dirección general
    let trend_direction: 'mejorando' | 'estable' | 'empeorando' = 'estable';
    if (globalDelta > 5) trend_direction = 'mejorando';
    else if (globalDelta < -5) trend_direction = 'empeorando';

    // Fecha del reporte anterior más reciente
    const prevDate = previousReports[0]?.created_at;
    const previous_report_date = prevDate
      ? typeof (prevDate as unknown as { toDate?: () => Date }).toDate === 'function'
        ? (prevDate as unknown as { toDate: () => Date }).toDate()
        : new Date(prevDate as unknown as string)
      : undefined;

    return {
      global_score_delta: globalDelta,
      dimension_deltas: dimensionDeltas,
      trend_direction,
      periods_analyzed: previousReports.length,
      previous_report_date,
    };
  }
}
