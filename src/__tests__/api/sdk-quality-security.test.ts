import { GET, POST } from '@/app/api/sdk/quality/objectives/route';

const mockList = jest.fn();
const mockGetByStatus = jest.fn();
const mockCreateAndReturnId = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/sdk/modules/quality', () => ({
  QualityObjectiveService: jest.fn().mockImplementation(() => ({
    list: mockList,
    getByStatus: mockGetByStatus,
    createAndReturnId: mockCreateAndReturnId,
  })),
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any, options?: { roles?: string[] }) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) => {
      const role = request.__role || 'admin';
      const organizationId = request.__orgId || 'org-1';
      if (options?.roles?.length && !options.roles.includes(role)) {
        return {
          status: 403,
          json: async () => ({ error: 'Sin permisos' }),
        };
      }
      return handler(request, context, {
        uid: 'user-1',
        email: 'user@test.com',
        organizationId,
        role,
        user: {
          id: 'user-1',
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

describe('SDK Quality security: /api/sdk/quality/objectives', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('denies cross-org read when query organization_id differs from token org', async () => {
    const request = {
      url: 'http://localhost/api/sdk/quality/objectives?organization_id=org-2',
      __orgId: 'org-1',
    } as any;

    const response = await GET(request, { params: Promise.resolve({}) } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockList).not.toHaveBeenCalled();
    expect(mockGetByStatus).not.toHaveBeenCalled();
  });

  it('denies cross-org write when body organization_id differs from token org', async () => {
    const request = {
      url: 'http://localhost/api/sdk/quality/objectives',
      __orgId: 'org-1',
      json: async () => ({
        organization_id: 'org-2',
        title: 'Objetivo de prueba',
        description: 'Descripcion valida para el objetivo de prueba',
        targetValue: 100,
        unit: '%',
        startDate: '2026-02-12T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z',
        owner: '11111111-1111-1111-1111-111111111111',
      }),
    } as any;

    const response = await POST(request, {
      params: Promise.resolve({}),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockCreateAndReturnId).not.toHaveBeenCalled();
  });
});
