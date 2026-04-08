jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockResolveAuthorizedOrganizationId = jest.fn();
const mockComputeProgress = jest.fn();

jest.mock('@/middleware/verifyOrganization', () => ({
  resolveAuthorizedOrganizationId: (...args: unknown[]) =>
    mockResolveAuthorizedOrganizationId(...args),
}));

jest.mock('@/services/JourneyAutoProgressService', () => ({
  JourneyAutoProgressService: {
    computeProgress: (...args: unknown[]) => mockComputeProgress(...args),
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

import { POST } from '@/app/api/journey/auto-progress/route';

describe('POST /api/journey/auto-progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-1',
    });
    mockComputeProgress.mockResolvedValue([
      { phaseId: 1, porcentaje: 20, status: 'in_progress', tareasCompletadas: ['1.1'] },
    ]);
  });

  it('sin token devuelve 401', async () => {
    const response = await POST({ __unauth: true } as any, {
      params: Promise.resolve({}),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockComputeProgress).not.toHaveBeenCalled();
  });

  it('solo devuelve datos de la org autenticada', async () => {
    const response = await POST(
      { __orgId: 'org-auth', __role: 'manager' } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(mockResolveAuthorizedOrganizationId).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-auth' }),
      undefined,
      { requireOrg: true }
    );
    expect(mockComputeProgress).toHaveBeenCalledWith('org-1');
    expect(body).toEqual({
      ok: true,
      progress: [
        { phaseId: 1, porcentaje: 20, status: 'in_progress', tareasCompletadas: ['1.1'] },
      ],
    });
  });
});
