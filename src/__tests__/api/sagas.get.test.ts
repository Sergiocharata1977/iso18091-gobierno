import { GET } from '@/app/api/mcp/sagas/[id]/route';
import { SagaService } from '@/services/agents/SagaService';
import { SagaRun } from '@/types/sagas';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const authBase = {
  uid: 'user-1',
  email: 'user@test.com',
  organizationId: 'org-1',
  role: 'admin',
  user: {
    id: 'user-1',
    email: 'user@test.com',
    rol: 'admin',
    organization_id: 'org-1',
    personnel_id: null,
    activo: true,
    status: 'active',
  },
} as any;

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => {
    return (request: any, context: any) => handler(request, context, authBase);
  },
}));

jest.mock('@/services/agents/SagaService', () => ({
  SagaService: {
    getSagaById: jest.fn(),
  },
}));

describe('GET /api/mcp/sagas/[id]', () => {
  const mockGetSagaById = SagaService.getSagaById as jest.MockedFunction<
    typeof SagaService.getSagaById
  >;

  const sagaFixture: SagaRun = {
    id: 'saga-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    goal: 'Preparar auditoria',
    status: 'running',
    current_step_index: 1,
    steps: [
      {
        id: 'step-1',
        intent: 'doc.review',
        payload: {},
        status: 'completed',
      },
      {
        id: 'step-2',
        intent: 'audit.checklist.generate',
        payload: {},
        status: 'running',
        error: 'warning temporal',
      },
    ],
    context: { step_1: { done: true } },
    created_at: new Date('2026-02-12T10:00:00.000Z'),
    updated_at: new Date('2026-02-12T10:05:00.000Z'),
    completed_at: undefined,
    error: {
      code: 'PARTIAL_WARNING',
      message: 'Paso en curso con advertencias',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when saga does not exist', async () => {
    mockGetSagaById.mockResolvedValue(null);

    const response = await GET(
      {} as any,
      { params: Promise.resolve({ id: 'missing-saga' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Saga no encontrada');
  });

  it('returns 403 when saga belongs to another organization', async () => {
    mockGetSagaById.mockResolvedValue({
      ...sagaFixture,
      organization_id: 'org-2',
    });

    const response = await GET(
      {} as any,
      { params: Promise.resolve({ id: 'saga-1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
  });

  it('returns 200 with saga timeline payload', async () => {
    mockGetSagaById.mockResolvedValue(sagaFixture);

    const response = await GET(
      {} as any,
      { params: Promise.resolve({ id: 'saga-1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('saga-1');
    expect(body.status).toBe('running');
    expect(body.steps).toHaveLength(2);
    expect(body.created_at).toBeDefined();
    expect(body.updated_at).toBeDefined();
    expect(body.error).toEqual({
      code: 'PARTIAL_WARNING',
      message: 'Paso en curso con advertencias',
    });
  });
});
