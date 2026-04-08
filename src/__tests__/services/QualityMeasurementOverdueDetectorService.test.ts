jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/services/agents/AgentQueueService', () => ({
  AgentQueueService: {
    enqueueJob: jest.fn(),
  },
}));

import {
  QualityMeasurementOverdueDetectorService,
  buildQualityMeasurementOverdueIdempotencyKey,
  evaluateOverdueMeasurementDetection,
  normalizeIndicatorSchedule,
} from '@/services/agents/QualityMeasurementOverdueDetectorService';
import type { CreateAgentJobRequest } from '@/types/agents';

describe('QualityMeasurementOverdueDetectorService - reglas de deteccion', () => {
  const now = new Date('2026-02-23T12:00:00.000Z');

  it('detecta medicion vencida para indicador mensual con ultima medicion antigua', () => {
    const indicator = normalizeIndicatorSchedule({
      id: 'ind-1',
      organization_id: 'org-1',
      name: 'Tiempo de entrega',
      frequency: 'monthly',
      owner: 'user-1',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    expect(indicator).not.toBeNull();

    const evaluation = evaluateOverdueMeasurementDetection({
      indicator: indicator!,
      now,
      measurements: [
        {
          id: 'm-1',
          indicatorId: 'ind-1',
          date: new Date('2026-01-10T10:00:00.000Z'),
        },
      ],
    });

    expect(evaluation).not.toBeNull();
    expect(evaluation?.detectionKind).toBe('overdue');
    expect(evaluation?.daysOverdue).toBe(14);
    expect(evaluation?.priority).toBe('normal');
    expect(evaluation?.notificationStage).toBe('reminder');
  });

  it('detecta faltante cuando no hay mediciones y la primera ventana ya vencio', () => {
    const indicator = normalizeIndicatorSchedule({
      id: 'ind-2',
      organization_id: 'org-1',
      name: 'Calibracion diaria',
      frequency: 'diaria',
      owner: 'user-2',
      createdAt: new Date('2026-02-20T00:00:00.000Z'),
    });

    const evaluation = evaluateOverdueMeasurementDetection({
      indicator: indicator!,
      now,
      measurements: [],
    });

    expect(evaluation).not.toBeNull();
    expect(evaluation?.detectionKind).toBe('missing');
    expect(evaluation?.daysOverdue).toBe(2);
    expect(evaluation?.priority).toBe('high');
    expect(evaluation?.notificationStage).toBe('escalation');
  });

  it('no considera medicion rechazada como cierre del ciclo y eleva prioridad', () => {
    const indicator = normalizeIndicatorSchedule({
      id: 'ind-3',
      organization_id: 'org-1',
      name: 'Merma semanal',
      frequency: 'weekly',
      owner: 'user-3',
      createdAt: new Date('2025-12-01T00:00:00.000Z'),
    });

    const evaluation = evaluateOverdueMeasurementDetection({
      indicator: indicator!,
      now,
      measurements: [
        {
          id: 'm-rejected',
          indicatorId: 'ind-3',
          date: new Date('2026-02-18T00:00:00.000Z'),
          validation_status: 'rechazado',
        },
        {
          id: 'm-ok-old',
          indicatorId: 'ind-3',
          date: new Date('2026-02-01T00:00:00.000Z'),
          validation_status: 'validado',
        },
      ],
    });

    expect(evaluation).not.toBeNull();
    expect(evaluation?.detectionKind).toBe('overdue');
    expect(evaluation?.daysOverdue).toBe(15);
    expect(evaluation?.latestRejectedMeasurementDate?.toISOString()).toBe(
      '2026-02-18T00:00:00.000Z'
    );
    expect(evaluation?.priority).toBe('high');
    expect(evaluation?.notificationStage).toBe('escalation');
  });
});

describe('QualityMeasurementOverdueDetectorService - enqueue idempotente', () => {
  it('genera misma idempotency_key y obtiene mismo job_id en re-ejecuciones', async () => {
    const queuedByKey = new Map<string, string>();
    const enqueueCalls: Array<{
      request: CreateAgentJobRequest;
      agentInstanceId: string;
    }> = [];
    let seq = 1;

    const service = new QualityMeasurementOverdueDetectorService({
      now: () => new Date('2026-02-23T12:00:00.000Z'),
      listIndicators: async () => [
        {
          id: 'ind-1',
          organization_id: 'org-1',
          name: 'Tiempo de ciclo',
          frequency: 'weekly',
          owner: 'user-1',
          isActive: true,
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
      ],
      listMeasurementsForIndicator: async () => [
        {
          id: 'm-1',
          indicatorId: 'ind-1',
          date: new Date('2026-02-01T00:00:00.000Z'),
        },
      ],
      enqueueJob: async (request, agentInstanceId) => {
        enqueueCalls.push({ request, agentInstanceId });
        const key = String(request.idempotency_key);
        if (!queuedByKey.has(key)) {
          queuedByKey.set(key, `job-${seq++}`);
        }
        return queuedByKey.get(key)!;
      },
    });

    const firstRun = await service.detectAndEnqueue({
      organizationId: 'org-1',
    });
    const secondRun = await service.detectAndEnqueue({
      organizationId: 'org-1',
    });

    expect(firstRun.jobs).toHaveLength(1);
    expect(secondRun.jobs).toHaveLength(1);
    expect(firstRun.jobs[0].idempotency_key).toBe(
      secondRun.jobs[0].idempotency_key
    );
    expect(firstRun.jobs[0].job_id).toBe(secondRun.jobs[0].job_id);
    expect(firstRun.jobs[0].job_id).toBe('job-1');
    expect(enqueueCalls).toHaveLength(2);
    expect(enqueueCalls[0].request.intent).toBe(
      'quality.measurement.overdue.notify'
    );
    expect(enqueueCalls[0].request.idempotency_key).toBe(
      enqueueCalls[1].request.idempotency_key
    );
    expect(enqueueCalls[0].request.payload).toEqual(
      expect.objectContaining({
        indicator_id: 'ind-1',
        detection_kind: 'overdue',
      })
    );
    expect(enqueueCalls[0].agentInstanceId).toBe('user-1');
  });

  it('builds deterministic idempotency key by org-indicator-stage-dueDate', () => {
    const key = buildQualityMeasurementOverdueIdempotencyKey({
      organizationId: 'org-1',
      indicatorId: 'ind-9',
      notificationStage: 'reminder',
      dueDate: new Date('2026-02-15T00:00:00.000Z'),
    });

    expect(key).toBe(
      'quality-measurement-overdue:org-1:ind-9:reminder:2026-02-15'
    );
  });
});
