jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockTrackEvent = jest.fn();
const mockGetOverview = jest.fn();
const mockResolveAuthorizedOrganizationId = jest.fn();
const mockDbGet = jest.fn();
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

jest.mock('@/services/onboarding/OnboardingMetricsService', () => ({
  OnboardingMetricsService: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    getOrganizationOverview: (...args: unknown[]) => mockGetOverview(...args),
  },
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

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn((name: string) => {
      if (name === 'platform_systems') {
        return { get: (...args: unknown[]) => mockDbGet(...args) };
      }
      return {
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({
            get: (...args: unknown[]) => mockDbGet(...args),
          })),
        })),
      };
    }),
  })),
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

import { GET as ContractedSystemsGet } from '@/app/api/onboarding/contracted-systems/route';
import {
  GET as MetricsGet,
  POST as MetricsPost,
} from '@/app/api/onboarding/metrics/route';

describe('M4 onboarding endpoints security org-scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockImplementation(
      (_auth: any, requestedOrgId?: string | null) => ({
        ok: true,
        organizationId: requestedOrgId || 'org-1',
      })
    );
    mockDbGet.mockResolvedValue({ docs: [] });
    mockGetOverview.mockResolvedValue({ total: 0 });
    mockTrackEvent.mockResolvedValue('metric-1');
  });

  it('GET contracted-systems: devuelve 401 sin autenticacion', async () => {
    const response = await ContractedSystemsGet(
      {
        __unauth: true,
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockDbGet).not.toHaveBeenCalled();
  });

  it('GET contracted-systems: bloquea org cruzada para admin', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await ContractedSystemsGet(
      {
        __role: 'admin',
        __orgId: 'org-1',
        nextUrl: {
          searchParams: new URLSearchParams('organization_id=org-2'),
        },
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(mockDbGet).not.toHaveBeenCalled();
  });

  it('POST metrics: bloquea org cruzada y no registra evento', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await MetricsPost(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          organization_id: 'org-2',
          session_id: 's-1',
          event_type: 'onboarding_started',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('GET metrics: bloquea org cruzada y no lee overview', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await MetricsGet(
      {
        __role: 'admin',
        __orgId: 'org-1',
        nextUrl: {
          searchParams: new URLSearchParams('organization_id=org-2&limit=10'),
        },
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(mockGetOverview).not.toHaveBeenCalled();
  });
});
