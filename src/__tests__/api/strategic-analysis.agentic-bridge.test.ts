import { Timestamp } from 'firebase-admin/firestore';
import { StrategicAnalysisToCaseBridge } from '@/services/agentic-center/StrategicAnalysisToCaseBridge';

describe('StrategicAnalysisToCaseBridge', () => {
  const bridge = new StrategicAnalysisToCaseBridge();

  function buildReport(overrides: Record<string, unknown> = {}) {
    return {
      id: 'report-1',
      created_at: new Date('2026-04-01T10:00:00.000Z').toISOString(),
      confidence_level: 'bajo' as const,
      norm_gaps: [],
      priorities: [],
      executive_alerts: [],
      ...overrides,
    };
  }

  it('convierte una brecha normativa severa en un caso trazable con source_id correcto', () => {
    const cases = bridge.toBridgedCases(
      buildReport({
        norm_gaps: [
          {
            id: 'gap-1',
            norma: 'ISO 9001',
            clausula: '8.4',
            severidad: 'critical',
            titulo: 'Control de proveedores',
            descripcion: 'No hay evidencia consistente.',
            evidencia: [],
            recomendacion: 'Corregir',
            sourceDimension: 'governance',
            area: 'Compras',
            score: 35,
            gap_description: 'Brecha severa en control de proveedores',
          },
        ],
      }),
      'org-1'
    );

    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      type: 'brecha_normativa',
      source_id: 'report-1',
      org_id: 'org-1',
      requires_human_decision: true,
    });
  });

  it('devuelve un array vacio cuando no hay brechas severas', () => {
    const cases = bridge.toBridgedCases(
      buildReport({
        norm_gaps: [
          {
            id: 'gap-1',
            norma: 'ISO 9001',
            clausula: '7.5',
            severidad: 'medium',
            titulo: 'Documentacion',
            descripcion: 'Brecha menor',
            evidencia: [],
            recomendacion: 'Corregir',
            sourceDimension: 'documentation',
            score: 55,
          },
        ],
      }),
      'org-1'
    );

    expect(cases).toEqual([]);
  });

  it('marca requires_human_decision en casos criticos originados por alertas ejecutivas', () => {
    const cases = bridge.toBridgedCases(
      buildReport({
        executive_alerts: [
          {
            id: 'alert-1',
            severity: 'critica',
            source: 'strategic_analysis',
            title: 'Escalada ejecutiva',
            description: 'Hace falta definicion inmediata.',
            requires_human_decision: true,
            created_at: Timestamp.now(),
            org_id: 'org-1',
          },
        ],
      }),
      'org-1'
    );

    expect(cases).toHaveLength(1);
    expect(cases[0].requires_human_decision).toBe(true);
  });
});
