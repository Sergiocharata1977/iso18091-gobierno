jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any, options?: { roles?: string[] }) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) => {
      if (request.__unauth) {
        return {
          status: 401,
          json: async () => ({ error: 'No autorizado' }),
        };
      }

      const role = request.__role || 'admin';
      if (options?.roles?.length && !options.roles.includes(role)) {
        return {
          status: 403,
          json: async () => ({ error: 'Sin permisos' }),
        };
      }

      const organizationId = request.__orgId || 'org-1';
      return handler(request, context, {
        uid: request.__uid || 'user-1',
        email: 'user@test.com',
        organizationId,
        role,
        user: {
          id: request.__uid || 'user-1',
          email: 'user@test.com',
          rol: role,
          organization_id: organizationId,
          personnel_id: null,
          activo: true,
          status: 'active',
        },
      });
    };
  },
}));

const mockEnqueueJob = jest.fn();
jest.mock('@/services/agents/AgentQueueService', () => ({
  AgentQueueService: {
    enqueueJob: (...args: unknown[]) => mockEnqueueJob(...args),
  },
}));

const mockRequestStarted = jest.fn();
const mockRequestSucceeded = jest.fn();
const mockRequestFailed = jest.fn();
jest.mock('@/ai/telemetry', () => ({
  aiTelemetry: {
    requestStarted: (...args: unknown[]) => mockRequestStarted(...args),
    requestSucceeded: (...args: unknown[]) => mockRequestSucceeded(...args),
    requestFailed: (...args: unknown[]) => mockRequestFailed(...args),
  },
}));

const mockIndicatorsGet = jest.fn();
const mockCollection = jest.fn();
const mockGetAdminFirestore = jest.fn(() => ({
  collection: mockCollection,
}));
jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => mockGetAdminFirestore(),
}));

import { POST } from '@/app/api/agents/quality/overdue-measurements/route';

function setupIndicators(
  docs: Array<{ id: string; data: Record<string, unknown> }>
) {
  const query = {
    limit: jest.fn(() => ({
      get: mockIndicatorsGet,
    })),
  };
  mockCollection.mockReturnValue({
    where: jest.fn(() => query),
  });
  mockIndicatorsGet.mockResolvedValue({
    docs: docs.map(doc => ({
      id: doc.id,
      data: () => doc.data,
    })),
  });
  return query;
}

describe('POST /api/agents/quality/overdue-measurements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnqueueJob.mockResolvedValue('job-1');
  });

  it('rejects disallowed roles', async () => {
    const response = await POST(
      {
        __role: 'operario',
        url: 'http://localhost/api/agents/quality/overdue-measurements',
        json: async () => ({}),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Sin permisos');
  });

  it('rejects organization tampering for non-super-admin', async () => {
    setupIndicators([]);

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        url: 'http://localhost/api/agents/quality/overdue-measurements',
        json: async () => ({
          organizationId: 'org-2',
          dryRun: true,
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden organization');
    expect(mockEnqueueJob).not.toHaveBeenCalled();
  });

  it('returns dry-run summary without enqueuing jobs', async () => {
    const now = Date.now();
    setupIndicators([
      {
        id: 'ind-overdue',
        data: {
          responsible_user_id: 'resp-1',
          measurement_frequency: 'mensual',
          status: 'activo',
          is_active: true,
          last_measurement_date: new Date(now - 45 * 86400000).toISOString(),
        },
      },
      {
        id: 'ind-missing-last',
        data: {
          responsible_user_id: 'resp-2',
          measurement_frequency: 'semanal',
          status: 'activo',
          is_active: true,
        },
      },
      {
        id: 'ind-future',
        data: {
          responsible_user_id: 'resp-3',
          measurement_frequency: 'mensual',
          status: 'activo',
          is_active: true,
          last_measurement_date: new Date(now - 5 * 86400000).toISOString(),
        },
      },
      {
        id: 'ind-no-responsible',
        data: {
          measurement_frequency: 'mensual',
          status: 'activo',
          is_active: true,
          last_measurement_date: new Date(now - 45 * 86400000).toISOString(),
        },
      },
    ]);

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        __uid: 'trigger-user',
        url: 'http://localhost/api/agents/quality/overdue-measurements',
        json: async () => ({
          dryRun: true,
          source: 'manual',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.summary).toMatchObject({
      scannedIndicators: 4,
      detectedCandidates: 2,
      queuedJobs: 0,
      failedJobs: 0,
      skippedNoResponsible: 1,
    });
    expect(body.sample.map((s: any) => s.indicatorId)).toEqual(
      expect.arrayContaining(['ind-overdue', 'ind-missing-last'])
    );
    expect(mockEnqueueJob).not.toHaveBeenCalled();
    expect(mockRequestStarted).toHaveBeenCalledTimes(1);
    expect(mockRequestSucceeded).toHaveBeenCalledTimes(1);
  });

  it('enqueues candidates and reports enqueue failures in production mode', async () => {
    setupIndicators([
      {
        id: 'ind-1',
        data: {
          responsible_user_id: 'resp-1',
          measurement_frequency: 'mensual',
          status: 'activo',
          is_active: true,
          last_measurement_date: new Date(
            Date.now() - 60 * 86400000
          ).toISOString(),
        },
      },
      {
        id: 'ind-2',
        data: {
          responsible_user_id: 'resp-2',
          measurement_frequency: 'mensual',
          status: 'activo',
          is_active: true,
          last_measurement_date: new Date(
            Date.now() - 60 * 86400000
          ).toISOString(),
        },
      },
    ]);

    mockEnqueueJob
      .mockResolvedValueOnce('job-1')
      .mockRejectedValueOnce(new Error('Queue offline'));

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        __uid: 'trigger-user',
        url: 'http://localhost/api/agents/quality/overdue-measurements',
        json: async () => ({
          dryRun: false,
          enqueueLimit: 10,
          source: 'cron',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dryRun).toBe(false);
    expect(body.summary.queuedJobs).toBe(1);
    expect(body.summary.failedJobs).toBe(1);
    expect(mockEnqueueJob).toHaveBeenCalledTimes(2);
    expect(mockEnqueueJob.mock.calls[0][1]).toBe('resp-1');
    expect(mockRequestFailed).toHaveBeenCalled();
  });
});
