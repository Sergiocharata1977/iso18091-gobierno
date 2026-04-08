jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockResolveAuthorizedOrganizationId = jest.fn();
const mockGetBadgesForOrg = jest.fn();

jest.mock('@/middleware/verifyOrganization', () => ({
  resolveAuthorizedOrganizationId: (...args: unknown[]) =>
    mockResolveAuthorizedOrganizationId(...args),
}));

jest.mock('@/services/JourneyStrategicBadgeService', () => ({
  JourneyStrategicBadgeService: {
    getBadgesForOrg: (...args: unknown[]) => mockGetBadgesForOrg(...args),
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

      const organizationId = request.__orgId ?? 'org-1';
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

import { GET } from '@/app/api/journey/strategic-badges/route';

describe('GET /api/journey/strategic-badges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-auth',
    });
    mockGetBadgesForOrg.mockResolvedValue([
      {
        phaseId: 5,
        level: 'critical',
        count: 1,
        topFinding: 'Auditoria critica',
        reportId: 'report-1',
      },
    ]);
  });

  it('sin token devuelve 401', async () => {
    const response = await GET(
      { __unauth: true, nextUrl: new URL('http://localhost/api/journey/strategic-badges') } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockGetBadgesForOrg).not.toHaveBeenCalled();
  });

  it('solo devuelve datos de la org autenticada', async () => {
    const response = await GET(
      {
        __orgId: 'org-auth',
        nextUrl: new URL(
          'http://localhost/api/journey/strategic-badges?organization_id=org-2'
        ),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(mockResolveAuthorizedOrganizationId).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-auth' }),
      'org-2',
      { requireOrg: true }
    );
    expect(mockGetBadgesForOrg).toHaveBeenCalledWith('org-auth');
    expect(body.badges).toEqual([
      {
        phaseId: 5,
        level: 'critical',
        count: 1,
        topFinding: 'Auditoria critica',
        reportId: 'report-1',
      },
    ]);
  });
});
