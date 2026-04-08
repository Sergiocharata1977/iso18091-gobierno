import { GET } from '@/app/api/norm-points/route';

const mockGetPaginated = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/services/normPoints/NormPointServiceAdmin', () => ({
  NormPointServiceAdmin: {
    getPaginated: (...args: unknown[]) => mockGetPaginated(...args),
  },
}));

jest.mock('@/services/normPoints/NormPointService', () => ({
  NormPointService: {
    create: jest.fn(),
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

describe('Core norm-points security: /api/norm-points', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPaginated.mockResolvedValue({ data: [], pagination: {} });
  });

  it('returns 401 when request has no auth context', async () => {
    const response = await GET(
      {
        __unauth: true,
        url: 'http://localhost:3000/api/norm-points',
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
  });

  it('returns 403 when query organization_id differs from token org', async () => {
    const response = await GET(
      {
        __orgId: 'org-1',
        url: 'http://localhost:3000/api/norm-points?organization_id=org-2',
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockGetPaginated).not.toHaveBeenCalled();
  });
});
