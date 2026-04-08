import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentQueueService } from '@/services/agents/AgentQueueService';
import { SagaService } from '@/services/agents/SagaService';
import { SagaRun } from '@/types/sagas';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/services/agents/AgentQueueService', () => ({
  AgentQueueService: {
    enqueueJob: jest.fn(),
  },
}));

describe('SagaService.evaluateSagaProgress', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;
  const mockEnqueueJob = AgentQueueService.enqueueJob as jest.MockedFunction<
    typeof AgentQueueService.enqueueJob
  >;

  const sagaId = 'saga-eval-1';
  let sagaState: SagaRun;

  beforeEach(() => {
    sagaState = {
      id: sagaId,
      organization_id: 'org-1',
      user_id: 'user-1',
      goal: 'Evaluar flujo',
      status: 'running',
      current_step_index: 0,
      context: { seed: true },
      steps: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockDb = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ id: sagaId })),
      })),
      runTransaction: jest.fn(async (callback: any) => {
        const tx = {
          get: jest.fn(async () => ({
            exists: true,
            data: () => sagaState,
          })),
          update: jest.fn((_: unknown, data: Record<string, unknown>) => {
            sagaState = { ...sagaState, ...data } as SagaRun;
          }),
        };

        return callback(tx);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb as any);
    mockEnqueueJob.mockClear();
    mockEnqueueJob.mockResolvedValue('job-queued-1');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not dispatch when dependencies are not met', async () => {
    sagaState.steps = [
      {
        id: 'step-1',
        intent: 'doc.review',
        payload: {},
        status: 'pending',
        depends_on: ['step-2'],
      },
      {
        id: 'step-2',
        intent: 'audit.checklist.generate',
        payload: {},
        status: 'pending',
        depends_on: ['step-1'],
      },
    ];

    await SagaService.evaluateSagaProgress(sagaId);

    expect(mockEnqueueJob).not.toHaveBeenCalled();
    expect(sagaState.steps[0].status).toBe('pending');
    expect(sagaState.steps[1].status).toBe('pending');
  });

  it('does not dispatch when saga is paused', async () => {
    sagaState.status = 'paused';
    sagaState.steps = [
      {
        id: 'step-1',
        intent: 'doc.review',
        payload: {},
        status: 'pending',
      },
    ];

    await SagaService.evaluateSagaProgress(sagaId);

    expect(mockEnqueueJob).not.toHaveBeenCalled();
    expect(sagaState.steps[0].status).toBe('pending');
  });

  it('dispatches runnable steps and links resulting job_id', async () => {
    mockEnqueueJob.mockResolvedValue('job-dispatched-99');
    sagaState.steps = [
      {
        id: 'step-1',
        intent: 'doc.review',
        payload: { a: 1 },
        status: 'completed',
      },
      {
        id: 'step-2',
        intent: 'audit.checklist.generate',
        payload: { b: 2 },
        status: 'pending',
        depends_on: ['step-1'],
      },
    ];

    await SagaService.evaluateSagaProgress(sagaId);

    expect(mockEnqueueJob).toHaveBeenCalledTimes(1);
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        user_id: 'user-1',
        intent: 'audit.checklist.generate',
        workflow_id: sagaId,
        payload: expect.objectContaining({
          b: 2,
          _saga_context: { seed: true },
        }),
      }),
      'auto'
    );
    expect(sagaState.steps[1].status).toBe('running');
    expect(sagaState.steps[1].job_id).toBe('job-dispatched-99');
  });
});
