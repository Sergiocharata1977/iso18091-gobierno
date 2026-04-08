import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentQueueService } from '@/services/agents/AgentQueueService';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

describe('QA mediciones vencidas - idempotencia de cola', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('duplicado: reutiliza job existente para misma medicion vencida y paso de workflow', async () => {
    const collectionRef: any = {
      where: jest.fn(() => ({
        limit: jest.fn(() => ({ type: 'idempotency-query' })),
      })),
      doc: jest.fn(() => ({ id: 'job-new-should-not-be-used' })),
      add: jest.fn(),
    };

    const txSet = jest.fn();
    const db = {
      collection: jest.fn(() => collectionRef),
      runTransaction: jest.fn(async (callback: any) => {
        const tx = {
          get: jest.fn(async () => ({
            empty: false,
            docs: [{ id: 'job-overdue-measurement-existing' }],
          })),
          set: txSet,
        };
        return callback(tx);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(db as any);

    const jobId = await AgentQueueService.enqueueJob(
      {
        organization_id: 'org-1',
        user_id: 'user-qa',
        intent: 'task.reminder',
        payload: {
          use_case: 'mediciones-vencidas',
          measurement_id: 'm-001',
          responsable_phone: '+5215512345678',
        },
        workflow_id: 'wf-overdue-measurements',
        step_index: 1,
      },
      'agent-quality-ops'
    );

    expect(jobId).toBe('job-overdue-measurement-existing');
    expect(collectionRef.add).not.toHaveBeenCalled();
    expect(txSet).not.toHaveBeenCalled();
  });
});
