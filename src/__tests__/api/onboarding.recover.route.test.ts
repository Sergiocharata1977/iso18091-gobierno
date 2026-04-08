jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockResolveAuthorizedOrganizationId = jest.fn();
const mockValidateOnboardingPhase = jest.fn();
const mockTransitionOrganizationOnboardingPhase = jest.fn();
const mockToOrganizationApiError = jest.fn((result: any, options?: any) => ({
  status: result?.status ?? options?.defaultStatus ?? 403,
  error: result?.error || options?.defaultError || 'Acceso denegado',
  errorCode: result?.errorCode || 'FORBIDDEN',
}));

jest.mock('@/middleware/verifyOrganization', () => ({
  resolveAuthorizedOrganizationId: (
    auth: unknown,
    requestedOrgId?: unknown,
    options?: unknown
  ) => mockResolveAuthorizedOrganizationId(auth, requestedOrgId, options),
  toOrganizationApiError: (result: unknown, options?: unknown) =>
    mockToOrganizationApiError(result, options),
}));

jest.mock('@/lib/onboarding/validatePhase', () => ({
  validateOnboardingPhase: (...args: unknown[]) =>
    mockValidateOnboardingPhase(...args),
  transitionOrganizationOnboardingPhase: (...args: unknown[]) =>
    mockTransitionOrganizationOnboardingPhase(...args),
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({})),
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
      const uid = request.__uid || 'user-1';

      return handler(request, context, {
        uid,
        email: 'user@test.com',
        organizationId,
        role,
        user: {
          id: uid,
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

import { POST } from '@/app/api/onboarding/recover/route';

describe('POST /api/onboarding/recover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-1',
    });
    mockValidateOnboardingPhase.mockResolvedValue({
      valid: true,
      currentPhase: 'provisioning',
    });
    mockTransitionOrganizationOnboardingPhase.mockResolvedValue({
      previousPhase: 'provisioning',
      currentPhase: 'not_started',
    });
  });

  it('recupera una org trabada en provisioning', async () => {
    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          organization_id: 'org-1',
          reason: 'retry_after_failure',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.previous_phase).toBe('provisioning');
    expect(body.data.current_phase).toBe('not_started');
  });

  it('retorna 409 si la org no esta en provisioning', async () => {
    mockValidateOnboardingPhase.mockResolvedValue({
      valid: false,
      currentPhase: 'provisioned',
    });

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          organization_id: 'org-1',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/provisioning/);
    expect(mockTransitionOrganizationOnboardingPhase).not.toHaveBeenCalled();
  });
});
