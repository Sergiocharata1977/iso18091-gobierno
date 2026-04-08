jest.mock('next/server', () => ({
  NextResponse: {
    json: (
      body: unknown,
      init?: { status?: number; headers?: Record<string, string> }
    ) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) => {
      if (request.__unauth) {
        return {
          status: 401,
          json: async () => ({ error: 'No autorizado' }),
        };
      }

      return handler(request, context, {
        uid: request.__uid || 'user-1',
        organizationId: request.__orgId || 'org-1',
        role: request.__role || 'admin',
        email: 'user@test.com',
        user: {
          id: request.__uid || 'user-1',
          email: 'user@test.com',
          rol: request.__role || 'admin',
          organization_id: request.__orgId || 'org-1',
          personnel_id: null,
          activo: true,
          status: 'active',
        },
      });
    };
  },
}));

jest.mock('@/services/agents/AgentWorkerService', () => ({
  AgentWorkerService: {
    processPendingJobs: jest.fn(),
  },
}));

import { POST } from '@/app/api/agents/process/route';
import { AgentWorkerService } from '@/services/agents/AgentWorkerService';

describe('QA mediciones vencidas - /api/agents/process', () => {
  const mockProcessPendingJobs =
    AgentWorkerService.processPendingJobs as jest.MockedFunction<
      typeof AgentWorkerService.processPendingJobs
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('happy path: procesa lote controlado de recordatorios de mediciones vencidas', async () => {
    mockProcessPendingJobs.mockResolvedValueOnce(1);

    const response = await POST(
      {
        json: async () => ({
          limit: 5,
          useCase: 'mediciones-vencidas',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.limit).toBe(5);
    expect(mockProcessPendingJobs).toHaveBeenCalledWith(5);
    expect(typeof body.timestamp).toBe('string');
  });

  it('no autorizado: bloquea ejecucion del procesamiento', async () => {
    const response = await POST(
      {
        __unauth: true,
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockProcessPendingJobs).not.toHaveBeenCalled();
  });
});
