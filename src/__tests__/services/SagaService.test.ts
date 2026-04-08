import { getAdminFirestore } from '@/lib/firebase/admin';
import { SagaService } from '@/services/agents/SagaService';
import { AgentQueueService } from '@/services/agents/AgentQueueService';
import { AgentJob } from '@/types/agents';
import { SagaRun } from '@/types/sagas';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/services/agents/AgentQueueService', () => ({
  AgentQueueService: {
    enqueueJob: jest.fn(),
  },
}));

describe('SagaService', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;
  const mockEnqueueJob = AgentQueueService.enqueueJob as jest.MockedFunction<
    typeof AgentQueueService.enqueueJob
  >;

  const sagaId = 'saga-1';
  const sagaRef = { id: sagaId };
  let sagaState: SagaRun;
  let updates: Array<Record<string, unknown>>;

  const planJob: AgentJob = {
    id: 'job-plan',
    organization_id: 'org-1',
    user_id: 'user-1',
    agent_instance_id: 'supervisor',
    intent: 'saga.plan',
    payload: {},
    workflow_id: sagaId,
    status: 'completed',
    priority: 'high',
    attempts: 1,
    max_attempts: 3,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    updates = [];
    sagaState = {
      id: sagaId,
      organization_id: 'org-1',
      user_id: 'user-1',
      goal: 'Preparar auditoria interna',
      status: 'planning',
      current_step_index: 0,
      steps: [],
      context: {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockDb = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => sagaRef),
      })),
      runTransaction: jest.fn(async (callback: any) => {
        const tx = {
          get: jest.fn(async () => ({
            exists: true,
            data: () => sagaState,
          })),
          update: jest.fn((_: unknown, data: Record<string, unknown>) => {
            updates.push(data);
            sagaState = { ...sagaState, ...data } as SagaRun;
          }),
        };

        return callback(tx);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb as any);
    mockEnqueueJob.mockResolvedValue('job-exec-1');
    jest.spyOn(SagaService, 'evaluateSagaProgress').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fails planning when plan has duplicate step IDs', async () => {
    await SagaService.onJobComplete(planJob, {
      steps: [
        { id: 'step-1', intent: 'doc.review', status: 'running' },
        { id: 'step-1', intent: 'audit.checklist.generate', status: 'pending' },
      ],
    });

    expect(sagaState.status).toBe('failed');
    expect(sagaState.error?.code).toBe('PLANNING_FAILED');
    expect(sagaState.error?.message).toContain('Duplicate step id');
    expect(updates.some(update => update.status === 'failed')).toBe(true);
  });

  it('normalizes and stores a valid planned workflow', async () => {
    await SagaService.onJobComplete(planJob, {
      steps: [
        {
          id: ' step-1 ',
          intent: ' doc.review ',
          compensate_intent: ' doc.review.undo ',
          status: 'running',
        },
        {
          id: 'step-2',
          intent: 'audit.checklist.generate',
          depends_on: [' step-1 '],
          status: 'completed',
        },
      ],
    });

    expect(sagaState.status).toBe('running');
    expect(sagaState.steps).toHaveLength(2);
    expect(sagaState.steps[0]).toMatchObject({
      id: 'step-1',
      intent: 'doc.review',
      compensate_intent: 'doc.review.undo',
      status: 'pending',
    });
    expect(sagaState.steps[1]).toMatchObject({
      id: 'step-2',
      status: 'pending',
      depends_on: ['step-1'],
    });
  });

  it('cancels saga when approval is rejected', async () => {
    sagaState = {
      ...sagaState,
      status: 'paused',
      steps: [
        {
          id: 'step-approval',
          intent: 'calendar.event.create',
          payload: {},
          status: 'running',
          job_id: 'job-approval-1',
        },
      ],
    };

    const approvalJob: AgentJob = {
      ...planJob,
      id: 'job-approval-1',
      intent: 'calendar.event.create',
      status: 'cancelled',
    };

    await SagaService.onJobApprovalResolved(approvalJob, false, 'No aprobado');

    expect(sagaState.status).toBe('cancelled');
    expect(sagaState.error?.code).toBe('JOB_CANCELLED');
    expect(sagaState.steps[0].status).toBe('failed');
    expect(sagaState.steps[0].error).toBe('No aprobado');
  });

  it('registers manual compensation policy when a late step fails', async () => {
    sagaState = {
      ...sagaState,
      status: 'running',
      steps: [
        {
          id: 'step-1',
          intent: 'doc.review',
          compensate_intent: 'doc.review.undo',
          payload: {},
          status: 'completed',
          job_id: 'job-step-1',
        },
        {
          id: 'step-2',
          intent: 'audit.checklist.generate',
          payload: {},
          status: 'running',
          job_id: 'job-step-2',
        },
      ],
    };

    const failedJob: AgentJob = {
      ...planJob,
      id: 'job-step-2',
      intent: 'audit.checklist.generate',
      status: 'failed',
    };

    await SagaService.onJobFailed(failedJob, {
      code: 'STEP_EXECUTION_ERROR',
      message: 'Step 2 failed',
    });

    expect(sagaState.status).toBe('failed');
    expect(sagaState.error?.failed_step_id).toBe('step-2');
    expect(sagaState.error?.compensation).toEqual({
      policy: 'manual_per_step',
      reason: 'late_step_failure',
      pending_steps: [
        {
          step_id: 'step-1',
          compensate_intent: 'doc.review.undo',
        },
      ],
    });
  });
});
