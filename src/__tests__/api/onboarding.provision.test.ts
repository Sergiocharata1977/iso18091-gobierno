jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockProvision = jest.fn();
const mockTrackEvent = jest.fn();
const mockResolveAuthorizedOrganizationId = jest.fn();
const mockValidateOnboardingPhase = jest.fn();
const mockTransitionOrganizationOnboardingPhase = jest.fn();
const mockEnsureTenantSetupCapabilities = jest.fn();
const mockToOrganizationApiError = jest.fn((result: any, options?: any) => {
  const errorCode =
    result?.errorCode ??
    (result?.status === 400
      ? 'ORGANIZATION_REQUIRED'
      : result?.status === 404
        ? 'USER_NOT_FOUND'
        : result?.status === 401
          ? 'UNAUTHORIZED'
          : 'FORBIDDEN');
  return {
    status: result?.status ?? options?.defaultStatus ?? 403,
    error:
      options?.messageOverrides?.[errorCode] ||
      result?.error ||
      options?.defaultError ||
      'Acceso denegado',
    errorCode,
  };
});

jest.mock('@/services/onboarding/ISOTemplateProvisionService', () => ({
  ISOTemplateProvisionService: {
    provision: (...args: unknown[]) => mockProvision(...args),
  },
}));

jest.mock('@/services/onboarding/OnboardingMetricsService', () => ({
  OnboardingMetricsService: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  },
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({})),
}));

jest.mock('@/lib/onboarding/validatePhase', () => ({
  ensureTenantSetupCapabilities: (...args: unknown[]) =>
    mockEnsureTenantSetupCapabilities(...args),
  validateOnboardingPhase: (...args: unknown[]) =>
    mockValidateOnboardingPhase(...args),
  transitionOrganizationOnboardingPhase: (...args: unknown[]) =>
    mockTransitionOrganizationOnboardingPhase(...args),
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

import { POST } from '@/app/api/onboarding/provision/route';

describe('POST /api/onboarding/provision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackEvent.mockResolvedValue('metric-1');
    mockValidateOnboardingPhase.mockResolvedValue({
      valid: true,
      currentPhase: 'systems_selected',
    });
    mockEnsureTenantSetupCapabilities.mockResolvedValue({
      tenantType: 'iso_puro',
      crmInstalled: false,
      crmAlreadyInstalled: false,
    });
    mockTransitionOrganizationOnboardingPhase.mockResolvedValue({
      previousPhase: 'systems_selected',
      currentPhase: 'provisioning',
    });
    mockResolveAuthorizedOrganizationId.mockImplementation(
      (_auth: any, requestedOrgId?: string | null) => ({
        ok: true,
        organizationId: requestedOrgId || 'org-1',
      })
    );
  });

  it('sin autenticacion: retorna 401 por withAuth', async () => {
    const response = await POST(
      {
        __unauth: true,
        json: async () => ({ process_keys: ['compras'] }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockProvision).not.toHaveBeenCalled();
  });

  it('caso OK: provisiona procesos para la organizacion del token', async () => {
    mockProvision.mockResolvedValue({
      createdProcesses: 2,
      skippedProcesses: 1,
      createdNormPoints: 3,
      skippedNormPoints: 0,
      processIds: ['proc-1', 'proc-2'],
    });

    const response = await POST(
      {
        __uid: 'user-123',
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          norm: 'iso_9001',
          process_keys: ['compras', 'rrhh'],
          company: { name: 'Acme SA', sector: 'Agro' },
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.organization_id).toBe('org-1');
    expect(body.data.norm).toBe('iso_9001');
    expect(body.data.company).toEqual({ name: 'Acme SA', sector: 'Agro' });
    expect(mockProvision).toHaveBeenCalledWith({
      organizationId: 'org-1',
      processKeys: ['compras', 'rrhh'],
      createdBy: 'user-123',
      systemId: 'iso9001',
    });
    expect(mockEnsureTenantSetupCapabilities).toHaveBeenCalledWith({
      orgId: 'org-1',
      adminDb: {},
      userId: 'user-123',
      systemId: 'iso9001',
      tenantType: undefined,
    });
    expect(mockTransitionOrganizationOnboardingPhase).toHaveBeenCalledTimes(2);
  });

  it('payload invalido: retorna 400 y no llama al servicio', async () => {
    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          norm: 'iso_9001',
          process_keys: [],
          company: { name: '' },
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Payload invalido');
    expect(Array.isArray(body.details)).toBe(true);
    expect(mockProvision).not.toHaveBeenCalled();
  });

  it('rol sin permisos: retorna 403 por withAuth', async () => {
    const response = await POST(
      {
        __role: 'operario',
        __orgId: 'org-1',
        json: async () => ({
          process_keys: ['compras'],
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Sin permisos');
    expect(mockProvision).not.toHaveBeenCalled();
  });

  it('org cruzada: bloquea cuando organization_id difiere del token', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 403,
      errorCode: 'ORGANIZATION_MISMATCH',
      error: 'Acceso denegado',
    });

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          organization_id: 'org-2',
          process_keys: ['compras'],
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('No puedes provisionar otra organizacion');
    expect(mockProvision).not.toHaveBeenCalled();
  });

  it('retorna 409 si la organizacion esta en una fase incorrecta', async () => {
    mockValidateOnboardingPhase.mockResolvedValue({
      valid: false,
      currentPhase: 'started',
    });

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          process_keys: ['compras'],
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/systems_selected/);
    expect(mockProvision).not.toHaveBeenCalled();
  });
});
