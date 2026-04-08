jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockResolveAuthorizedOrganizationId = jest.fn();
const mockToOrganizationApiError = jest.fn((result: any, options?: any) => ({
  status: result?.status ?? options?.defaultStatus ?? 403,
  error: result?.error || options?.defaultError || 'Acceso denegado',
  errorCode: result?.errorCode || 'FORBIDDEN',
}));
const mockGetOnboardingState = jest.fn();
const mockMarkOnboardingPhase = jest.fn();
const mockGenerateDrafts = jest.fn();
const mockTrackEvent = jest.fn();
const mockEvaluateStrategyCompleteness = jest.fn();
const mockDbGet = jest.fn();
const mockValidateOnboardingPhase = jest.fn();
const mockTransitionOrganizationOnboardingPhase = jest.fn();

jest.mock('@/middleware/verifyOrganization', () => ({
  resolveAuthorizedOrganizationId: (
    auth: unknown,
    requestedOrgId?: unknown,
    options?: unknown
  ) => mockResolveAuthorizedOrganizationId(auth, requestedOrgId, options),
  toOrganizationApiError: (result: unknown, options?: unknown) =>
    mockToOrganizationApiError(result, options),
}));

jest.mock('@/services/onboarding/OrganizationOnboardingService', () => ({
  OrganizationOnboardingService: {
    getOrganizationOnboardingState: (...args: unknown[]) =>
      mockGetOnboardingState(...args),
    markOnboardingPhase: (...args: unknown[]) =>
      mockMarkOnboardingPhase(...args),
  },
}));

jest.mock('@/services/onboarding/StrategyDrivenDraftGenerationService', () => ({
  StrategyDrivenDraftGenerationService: {
    generateDraftsFromStrategy: (...args: unknown[]) =>
      mockGenerateDrafts(...args),
  },
}));

jest.mock('@/services/onboarding/OnboardingMetricsService', () => ({
  OnboardingMetricsService: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  },
}));

jest.mock('@/lib/onboarding/validatePhase', () => ({
  validateOnboardingPhase: (...args: unknown[]) =>
    mockValidateOnboardingPhase(...args),
  transitionOrganizationOnboardingPhase: (...args: unknown[]) =>
    mockTransitionOrganizationOnboardingPhase(...args),
}));

jest.mock('@/lib/onboarding/strategyCompleteness', () => ({
  evaluateStrategyCompleteness: (...args: unknown[]) =>
    mockEvaluateStrategyCompleteness(...args),
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      where: () => ({
        get: () => mockDbGet(),
      }),
    }),
  }),
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

import { POST } from '@/app/api/onboarding/generate-drafts-from-strategy/route';

describe('POST /api/onboarding/generate-drafts-from-strategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-1',
    });
    mockDbGet.mockResolvedValue({ docs: [] });
    mockTrackEvent.mockResolvedValue('metric-1');
    mockMarkOnboardingPhase.mockResolvedValue({});
    mockValidateOnboardingPhase.mockResolvedValue({
      valid: true,
      currentPhase: 'provisioned',
    });
    mockTransitionOrganizationOnboardingPhase.mockResolvedValue({
      previousPhase: 'provisioned',
      currentPhase: 'completed',
    });
    mockGenerateDrafts.mockResolvedValue({
      summary: {
        created: ['proceso:gestion_documental'],
        skipped: [],
        errors: [],
      },
      generatedAt: '2026-02-24T10:00:00.000Z',
    });
    mockEvaluateStrategyCompleteness.mockReturnValue({
      percent: 100,
      items: [],
      missingRequired: [],
      canGenerateDrafts: true,
    });
  });

  it('retorna 409 si ya hay una generacion corriendo', async () => {
    mockGetOnboardingState.mockResolvedValue({
      onboarding_phase: 'draft_generation_running',
      owner: { user_id: 'user-1' },
    });

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          organization_id: 'org-1',
          system_id: 'iso9001',
          mode: 'draft',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(mockGenerateDrafts).not.toHaveBeenCalled();
  });

  it('retorna 400 si la estrategia no esta completa', async () => {
    mockGetOnboardingState.mockResolvedValue({
      onboarding_phase: 'strategy_in_progress',
      owner: { user_id: 'user-1' },
    });
    mockEvaluateStrategyCompleteness.mockReturnValue({
      percent: 60,
      items: [],
      missingRequired: [{ code: 'identidad.mision' }],
      canGenerateDrafts: false,
    });

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          organization_id: 'org-1',
          system_id: 'iso9001',
          mode: 'draft',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/estrategia no esta completa/i);
    expect(mockGenerateDrafts).not.toHaveBeenCalled();
  });

  it('retorna 409 si la org todavia no llego a provisioned', async () => {
    mockValidateOnboardingPhase.mockResolvedValue({
      valid: false,
      currentPhase: 'systems_selected',
    });

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          organization_id: 'org-1',
          system_id: 'iso9001',
          mode: 'draft',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/provisioned/);
    expect(mockGenerateDrafts).not.toHaveBeenCalled();
  });

  it('caso OK: genera borradores, actualiza fase y registra metricas', async () => {
    mockGetOnboardingState.mockResolvedValue({
      onboarding_phase: 'strategy_complete',
      owner: { user_id: 'user-1' },
    });

    const response = await POST(
      {
        __uid: 'user-1',
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          organization_id: 'org-1',
          system_id: 'iso9001',
          mode: 'draft',
          force_regenerate: false,
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.onboardingPhase).toBe('drafts_generated');
    expect(mockMarkOnboardingPhase).toHaveBeenCalledTimes(2);
    expect(mockGenerateDrafts).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockTransitionOrganizationOnboardingPhase).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        nextPhase: 'completed',
      })
    );
  });
});
