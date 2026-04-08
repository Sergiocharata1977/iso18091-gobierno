import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentQueueService } from '@/services/agents/AgentQueueService';
import { AgentJob } from '@/types/agents';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

const sagaHooks = {
  onJobPendingApproval: jest.fn(),
  onJobApprovalResolved: jest.fn(),
  onJobFailed: jest.fn(),
};

jest.mock('@/services/agents/SagaService', () => ({
  SagaService: sagaHooks,
}));

function applyPatch(target: Record<string, any>, patch: Record<string, any>) {
  for (const [key, value] of Object.entries(patch)) {
    if (!key.includes('.')) {
      target[key] = value;
      continue;
    }

    const parts = key.split('.');
    let cursor = target;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!cursor[part] || typeof cursor[part] !== 'object') {
        cursor[part] = {};
      }
      cursor = cursor[part];
    }
    cursor[parts[parts.length - 1]] = value;
  }
}

describe('AgentQueueService - saga hooks', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;

  let jobStore: Record<string, AgentJob>;

  beforeEach(() => {
    jest.clearAllMocks();

    jobStore = {
      'job-1': {
        id: 'job-1',
        organization_id: 'org-1',
        user_id: 'user-1',
        agent_instance_id: 'agent-1',
        intent: 'doc.review',
        payload: {},
        workflow_id: 'saga-1',
        status: 'running',
        priority: 'normal',
        attempts: 0,
        max_attempts: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
    };

    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn((id: string) => ({
          id,
          update: jest.fn(async (data: Record<string, any>) => {
            applyPatch(jobStore[id], data);
          }),
          get: jest.fn(async () => ({
            id,
            exists: !!jobStore[id],
            data: () => jobStore[id],
          })),
        })),
      })),
      runTransaction: jest.fn(async (callback: any) => {
        const tx = {
          get: jest.fn(async (ref: { id: string }) => ({
            id: ref.id,
            exists: !!jobStore[ref.id],
            data: () => jobStore[ref.id],
          })),
          update: jest.fn((ref: { id: string }, data: Record<string, any>) => {
            applyPatch(jobStore[ref.id], data);
          }),
        };

        return callback(tx);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(db as any);
  });

  it('requestApproval sets pending_approval and notifies saga hook', async () => {
    await AgentQueueService.requestApproval('job-1', {
      description: 'Confirmar paso',
      required_role: 'gerente',
    });

    expect(jobStore['job-1'].status).toBe('pending_approval');
    expect(jobStore['job-1'].approval_metadata?.status).toBe('pending');
    expect(sagaHooks.onJobPendingApproval).toHaveBeenCalledTimes(1);
    expect(sagaHooks.onJobPendingApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-1',
        workflow_id: 'saga-1',
      })
    );
  });

  it('approveJob(true) requeues and notifies approval resolved', async () => {
    jobStore['job-1'].status = 'pending_approval';
    jobStore['job-1'].approval_metadata = {
      requested_at: new Date(),
      status: 'pending',
    };

    await AgentQueueService.approveJob('job-1', 'approver-1', true, 'ok');

    expect(jobStore['job-1'].status).toBe('queued');
    expect(jobStore['job-1'].approval_metadata?.status).toBe('approved');
    expect(sagaHooks.onJobApprovalResolved).toHaveBeenCalledTimes(1);
    expect(sagaHooks.onJobApprovalResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-1',
        workflow_id: 'saga-1',
      }),
      true,
      'ok'
    );
  });

  it('approveJob(false) cancels and notifies rejection', async () => {
    jobStore['job-1'].status = 'pending_approval';
    jobStore['job-1'].approval_metadata = {
      requested_at: new Date(),
      status: 'pending',
    };

    await AgentQueueService.approveJob(
      'job-1',
      'approver-2',
      false,
      'rechazado'
    );

    expect(jobStore['job-1'].status).toBe('cancelled');
    expect(jobStore['job-1'].approval_metadata?.status).toBe('rejected');
    expect(sagaHooks.onJobApprovalResolved).toHaveBeenCalledTimes(1);
    expect(sagaHooks.onJobApprovalResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-1',
        workflow_id: 'saga-1',
      }),
      false,
      'rechazado'
    );
  });

  it('failJob definitive notifies onJobFailed', async () => {
    jobStore['job-1'].status = 'running';
    jobStore['job-1'].attempts = 2;
    jobStore['job-1'].max_attempts = 3;

    const error = new Error('fallo definitivo');
    error.name = 'EXEC_ERROR';

    await AgentQueueService.failJob('job-1', error);

    expect(jobStore['job-1'].status).toBe('failed');
    expect(jobStore['job-1'].attempts).toBe(3);
    expect(sagaHooks.onJobFailed).toHaveBeenCalledTimes(1);
    expect(sagaHooks.onJobFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'job-1',
        workflow_id: 'saga-1',
        status: 'failed',
      }),
      {
        code: 'EXEC_ERROR',
        message: 'fallo definitivo',
      }
    );
  });
});

describe('AgentQueueService - anti-duplicados y retry', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enqueueJob returns existing job when idempotency key already exists', async () => {
    const collectionRef: any = {
      where: jest.fn(() => ({
        limit: jest.fn(() => ({ type: 'idempotency-query' })),
      })),
      doc: jest.fn(() => ({ id: 'job-new' })),
      add: jest.fn(),
    };

    const txSet = jest.fn();
    const db = {
      collection: jest.fn(() => collectionRef),
      runTransaction: jest.fn(async (callback: any) => {
        const tx = {
          get: jest.fn(async () => ({
            empty: false,
            docs: [{ id: 'job-existing' }],
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
        user_id: 'user-1',
        intent: 'audit.checklist.generate',
        payload: { a: 1 },
        workflow_id: 'saga-1',
        step_index: 1,
      },
      'agent-1'
    );

    expect(jobId).toBe('job-existing');
    expect(txSet).not.toHaveBeenCalled();
    expect(collectionRef.add).not.toHaveBeenCalled();
  });

  it('getQueuedJobs skips queued jobs with next_retry in the future', async () => {
    const now = Date.now();
    const collectionRef: any = {
      where: jest.fn(() => collectionRef),
      orderBy: jest.fn(() => collectionRef),
      limit: jest.fn(() => collectionRef),
      get: jest.fn(async () => ({
        docs: [
          {
            id: 'job-ready',
            data: () => ({
              status: 'queued',
              next_retry: new Date(now - 60_000),
            }),
          },
          {
            id: 'job-wait',
            data: () => ({
              status: 'queued',
              next_retry: {
                toDate: () => new Date(now + 60_000),
              },
            }),
          },
        ],
      })),
    };

    const db = {
      collection: jest.fn(() => collectionRef),
    };

    mockGetAdminFirestore.mockReturnValue(db as any);

    const jobs = await AgentQueueService.getQueuedJobs(10);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('job-ready');
  });
});

describe('AgentQueueService - lease, heartbeat y reclaim', () => {
  const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<
    typeof getAdminFirestore
  >;

  let jobStore: Record<string, AgentJob>;

  beforeEach(() => {
    jest.clearAllMocks();
    jobStore = {
      'job-lease': {
        id: 'job-lease',
        organization_id: 'org-1',
        user_id: 'user-1',
        agent_instance_id: 'agent-1',
        intent: 'doc.review',
        payload: {},
        workflow_id: 'saga-1',
        status: 'queued',
        priority: 'normal',
        attempts: 0,
        max_attempts: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
    };

    const db = {
      collection: jest.fn(() => ({
        doc: jest.fn((id: string) => ({
          id,
          update: jest.fn(async (data: Record<string, any>) => {
            applyPatch(jobStore[id], data);
          }),
          get: jest.fn(async () => ({
            id,
            exists: !!jobStore[id],
            data: () => jobStore[id],
          })),
        })),
      })),
      runTransaction: jest.fn(async (callback: any) => {
        const tx = {
          get: jest.fn(async (ref: { id: string }) => ({
            id: ref.id,
            exists: !!jobStore[ref.id],
            data: () => jobStore[ref.id],
          })),
          update: jest.fn((ref: { id: string }, data: Record<string, any>) => {
            applyPatch(jobStore[ref.id], data);
          }),
        };
        return callback(tx);
      }),
    };

    mockGetAdminFirestore.mockReturnValue(db as any);
  });

  it('lockJob acquires queued job and sets lease metadata', async () => {
    const locked = await AgentQueueService.lockJob('job-lease', 'worker-a', 3);

    expect(locked).toBe(true);
    expect(jobStore['job-lease'].status).toBe('running');
    expect(jobStore['job-lease'].lease_owner).toBe('worker-a');
    expect(jobStore['job-lease'].lease_expires_at).toBeInstanceOf(Date);
    expect(jobStore['job-lease'].lease_heartbeat_at).toBeInstanceOf(Date);
  });

  it('lockJob does not steal active lease from another worker', async () => {
    const future = new Date(Date.now() + 120_000);
    jobStore['job-lease'].status = 'running';
    jobStore['job-lease'].lease_owner = 'worker-a';
    jobStore['job-lease'].lease_expires_at = future;

    const locked = await AgentQueueService.lockJob('job-lease', 'worker-b', 3);

    expect(locked).toBe(false);
    expect(jobStore['job-lease'].lease_owner).toBe('worker-a');
  });

  it('lockJob reclaims running job when lease is expired', async () => {
    const past = new Date(Date.now() - 120_000);
    jobStore['job-lease'].status = 'running';
    jobStore['job-lease'].lease_owner = 'worker-a';
    jobStore['job-lease'].lease_expires_at = past;

    const locked = await AgentQueueService.lockJob('job-lease', 'worker-b', 3);

    expect(locked).toBe(true);
    expect(jobStore['job-lease'].status).toBe('running');
    expect(jobStore['job-lease'].lease_owner).toBe('worker-b');
    expect(jobStore['job-lease'].lease_expires_at).toBeInstanceOf(Date);
  });

  it('heartbeatJob renews lease only for current owner', async () => {
    jobStore['job-lease'].status = 'running';
    jobStore['job-lease'].lease_owner = 'worker-a';
    jobStore['job-lease'].lease_expires_at = new Date(Date.now() + 60_000);

    const ok = await AgentQueueService.heartbeatJob('job-lease', 'worker-a', 5);
    const denied = await AgentQueueService.heartbeatJob(
      'job-lease',
      'worker-b',
      5
    );

    expect(ok).toBe(true);
    expect(denied).toBe(false);
    expect(jobStore['job-lease'].lease_owner).toBe('worker-a');
    expect(jobStore['job-lease'].lease_heartbeat_at).toBeInstanceOf(Date);
  });
});
