jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) =>
      handler(request, context, {
        uid: request.__uid || 'user-1',
        email: 'user@test.com',
        organizationId: request.__orgId || 'org-1',
        role: request.__role || 'admin',
        user: {
          id: request.__uid || 'user-1',
          email: 'user@test.com',
          rol: request.__role || 'admin',
          organization_id: request.__orgId || 'org-1',
          personnel_id: request.__personnelId || null,
          activo: true,
          status: 'active',
        },
      });
  },
}));

const mockResolveAuthorizedOrganizationId = jest.fn();
const mockToOrganizationApiError = jest.fn();
jest.mock('@/middleware/verifyOrganization', () => ({
  resolveAuthorizedOrganizationId: (...args: unknown[]) =>
    mockResolveAuthorizedOrganizationId(...args),
  toOrganizationApiError: (...args: unknown[]) =>
    mockToOrganizationApiError(...args),
}));

const mockUnifiedConverse = jest.fn();
jest.mock('@/services/ai-core/UnifiedConverseService', () => ({
  UnifiedConverseService: {
    converse: (...args: unknown[]) => mockUnifiedConverse(...args),
  },
}));

const mockGet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();
const mockGetAdminFirestore = jest.fn(() => ({
  collection: mockCollection,
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => mockGetAdminFirestore(),
}));

import { POST } from '@/app/api/ai/converse/route';

describe('POST /api/ai/converse', () => {
  function buildRequest(overrides: Record<string, unknown>) {
    return {
      headers: {
        get: () => null,
      },
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-1',
    });
    mockUnifiedConverse.mockResolvedValue({
      reply: 'Respuesta desde Don Candido',
      sessionId: 'session-1',
      tokensUsed: 321,
    });
    mockCollection.mockImplementation(() => ({
      doc: mockDoc,
    }));
    mockDoc.mockImplementation(() => ({
      get: mockGet,
    }));
    mockGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });
  });

  it('returns the unified converse contract for authenticated channels', async () => {
    const response = await POST(
      buildRequest({
        json: async () => ({
          channel: 'chat',
          message: 'Como funciona auditorias?',
          sessionId: 'session-1',
          organizationId: 'org-1',
          pathname: '/auditorias',
        }),
      }),
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
      reply: 'Respuesta desde Don Candido',
      sessionId: 'session-1',
      tokensUsed: 321,
      })
    );
    expect(mockUnifiedConverse).toHaveBeenCalledWith({
      channel: 'chat',
      message: 'Como funciona auditorias?',
      sessionId: 'session-1',
      organizationId: 'org-1',
      userId: 'user-1',
      userRole: 'admin',
      pathname: '/auditorias',
      departmentContext: undefined,
    });
  });

  it('adds department context when the user has linked personnel', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        organization_id: 'org-1',
        departamento_id: 'dept-1',
        departamento_nombre: 'Comercial',
        cargo: 'Gerente Comercial',
      }),
    });

    const response = await POST(
      buildRequest({
        __uid: 'user-1',
        __orgId: 'org-1',
        __role: 'gerente',
        __personnelId: 'personnel-1',
        json: async () => ({
          channel: 'chat',
          message: 'Como esta mi departamento?',
          sessionId: 'session-1',
          organizationId: 'org-1',
        }),
      }),
      { params: Promise.resolve({}) } as any
    );

    expect(response.status).toBe(200);
    expect(mockUnifiedConverse).toHaveBeenCalledWith({
      channel: 'chat',
      message: 'Como esta mi departamento?',
      sessionId: 'session-1',
      organizationId: 'org-1',
      userId: 'user-1',
      userRole: 'gerente',
      pathname: undefined,
      departmentContext: {
        departmentId: 'dept-1',
        departmentName: 'Comercial',
        jobTitle: 'Gerente Comercial',
      },
    });
  });

  it('rejects cross-organization access', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });
    mockToOrganizationApiError.mockReturnValue({
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await POST(
      buildRequest({
        json: async () => ({
          channel: 'voice',
          message: 'Necesito ayuda',
          sessionId: 'session-1',
          organizationId: 'org-2',
        }),
      }),
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });
    expect(mockUnifiedConverse).not.toHaveBeenCalled();
  });

  it('returns 429 when the AI plan budget is exhausted', async () => {
    const error = new Error('Limite mensual de IA alcanzado para el plan starter');
    error.name = 'AIBudgetExceededError';
    (error as Error & { code?: string }).code = 'AI_BUDGET_EXCEEDED';
    mockUnifiedConverse.mockRejectedValue(error);

    const response = await POST(
      buildRequest({
        json: async () => ({
          channel: 'chat',
          message: 'Necesito ayuda',
          sessionId: 'session-1',
          organizationId: 'org-1',
        }),
      }),
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: 'Limite mensual de IA alcanzado',
      message: 'Limite mensual de IA alcanzado para el plan starter',
    });
  });
});
