import { Timestamp } from 'firebase-admin/firestore';
import { ExecutiveAlertRules } from '@/services/executive-alerts/ExecutiveAlertRules';

describe('ExecutiveAlertRules', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-03T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('genera alerta de confianza cuando el analisis tiene nivel bajo', () => {
    const alerts = ExecutiveAlertRules.alertsFromStrategicAnalysis({
      id: 'report-1',
      org_id: 'org-1',
      confidence_level: 'bajo',
      created_at: Timestamp.now(),
    });

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'confidence',
          source_ref_id: 'report-1',
          requires_human_decision: true,
        }),
      ])
    );
  });

  it('genera alerta estrategica cuando detecta una brecha normativa severa', () => {
    const alerts = ExecutiveAlertRules.alertsFromStrategicAnalysis({
      id: 'report-1',
      org_id: 'org-1',
      norm_gaps: [{ area: 'clausula 8.4', score: 30 }],
      created_at: Timestamp.now(),
    });

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'strategic_analysis',
          affected_entity: 'clausula 8.4',
        }),
      ])
    );
  });

  it('genera alerta por backlog envejecido cuando supera el maximo de dias', () => {
    const alerts = ExecutiveAlertRules.alertsFromAgingBacklog({
      org_id: 'org-1',
      max_days_before_alert: 7,
      pending_approvals: [
        {
          id: 'approval-1',
          created_at: Timestamp.fromDate(new Date('2026-03-26T11:00:00.000Z')),
          entity_description: 'Aprobacion de cambio critico',
        },
      ],
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      source: 'aging',
      source_ref_id: 'approval-1',
    });
  });

  it('genera alerta para sagas pausadas por mas de 7 dias', () => {
    const alerts = ExecutiveAlertRules.alertsFromBlockedSagas({
      org_id: 'org-1',
      blocked_sagas: [
        {
          id: 'saga-1',
          name: 'Contencion de proveedor',
          status: 'paused',
          paused_at: Timestamp.fromDate(new Date('2026-03-24T09:00:00.000Z')),
        },
      ],
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      source: 'agentic_center',
      source_ref_id: 'saga-1',
    });
  });
});
