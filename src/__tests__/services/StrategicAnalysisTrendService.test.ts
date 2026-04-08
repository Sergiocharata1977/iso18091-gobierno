import { StrategicAnalysisTrendService } from '@/services/strategic-analysis/StrategicAnalysisTrendService';

describe('StrategicAnalysisTrendService', () => {
  const service = new StrategicAnalysisTrendService();

  it('detecta una tendencia empeorando cuando el score actual cae contra el promedio historico', () => {
    const result = service.analyzeTrend({
      current_score: 60,
      previous_reports: [
        { global_score: 70 },
        { global_score: 65 },
        { global_score: 68 },
      ],
    });

    expect(result.periods_analyzed).toBe(3);
    expect(result.score_delta).toBeLessThan(0);
    expect(result.trend_direction).toBe('empeorando');
  });

  it('no falla y devuelve cero periodos cuando no hay historial', () => {
    const result = service.analyzeTrend({
      current_score: 60,
      previous_reports: [],
    });

    expect(result.periods_analyzed).toBe(0);
    expect(result.average_previous_score).toBeNull();
    expect(result.trend_direction).toBe('estable');
  });

  it('detecta una mejora cuando el delta positivo supera 10 puntos', () => {
    const result = service.analyzeTrend({
      current_score: 80,
      previous_reports: [{ global_score: 60 }],
    });

    expect(result.score_delta).toBeGreaterThan(10);
    expect(result.trend_direction).toBe('mejorando');
  });
});
