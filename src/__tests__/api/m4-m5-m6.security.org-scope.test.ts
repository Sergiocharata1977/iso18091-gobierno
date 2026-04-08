jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockResolveAuthorizedOrganizationId = jest.fn();
const mockVerifyTargetUserOrganizationScope = jest.fn();
const mockToOrganizationApiError = jest.fn();

jest.mock('@/middleware/verifyOrganization', () => ({
  resolveAuthorizedOrganizationId: (...args: unknown[]) =>
    mockResolveAuthorizedOrganizationId(...args),
  verifyTargetUserOrganizationScope: (...args: unknown[]) =>
    mockVerifyTargetUserOrganizationScope(...args),
  toOrganizationApiError: (...args: unknown[]) =>
    mockToOrganizationApiError(...args),
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

      const organizationId = Object.prototype.hasOwnProperty.call(
        request,
        '__orgId'
      )
        ? request.__orgId
        : 'org-1';
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
          organization_id: organizationId || null,
          personnel_id: null,
          activo: true,
          status: 'active',
        },
      });
    };
  },
}));

const mockTrackEvent = jest.fn();
const mockGetOverview = jest.fn();
jest.mock('@/services/onboarding/OnboardingMetricsService', () => ({
  OnboardingMetricsService: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    getOrganizationOverview: (...args: unknown[]) => mockGetOverview(...args),
  },
}));

const mockGetUserFullContext = jest.fn();
const mockGetUserContextLight = jest.fn();
const mockRefreshContext = jest.fn();
jest.mock('@/services/context/UserContextService', () => ({
  UserContextService: {
    getUserFullContext: (...args: unknown[]) => mockGetUserFullContext(...args),
    getUserContextLight: (...args: unknown[]) =>
      mockGetUserContextLight(...args),
    refreshContext: (...args: unknown[]) => mockRefreshContext(...args),
  },
}));

const mockChatGetSession = jest.fn();
const mockChatDeleteSession = jest.fn();
const mockChatGetSessions = jest.fn();
const mockChatCreateSession = jest.fn();
const mockChatGetMessages = jest.fn();
jest.mock('@/features/chat/services/ChatService', () => ({
  ChatService: {
    getSession: (...args: unknown[]) => mockChatGetSession(...args),
    deleteSession: (...args: unknown[]) => mockChatDeleteSession(...args),
    getSessions: (...args: unknown[]) => mockChatGetSessions(...args),
    createSession: (...args: unknown[]) => mockChatCreateSession(...args),
    getMessages: (...args: unknown[]) => mockChatGetMessages(...args),
  },
}));

jest.mock('@/features/chat/services/ContextService', () => ({
  ContextService: {
    getContext: jest.fn(),
  },
}));

const mockGetAdminFirestore = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: (...args: unknown[]) => mockGetAdminFirestore(...args),
}));

import {
  GET as OnboardingMetricsGet,
  POST as OnboardingMetricsPost,
} from '@/app/api/onboarding/metrics/route';
import { GET as ContextUserGet } from '@/app/api/context/user/route';
import { DELETE as ChatSessionsDelete } from '@/app/api/chat/sessions/route';
import { GET as ChatSessionGet } from '@/app/api/chat/sessions/[sessionId]/route';
import { GET as ResumenUsuariosGet } from '@/app/api/mi-sgc/resumen-usuarios/route';

describe('M4/M5/M6 API security org-scope regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-1',
    });
    mockVerifyTargetUserOrganizationScope.mockResolvedValue({ ok: true });
    mockToOrganizationApiError.mockImplementation(
      (result: any, options?: any) => ({
        status: result?.status ?? options?.defaultStatus ?? 403,
        error: result?.error ?? options?.defaultError ?? 'Acceso denegado',
        errorCode: result?.errorCode ?? 'FORBIDDEN',
      })
    );
    mockGetOverview.mockResolvedValue({});
  });

  it('M4 onboarding metrics POST returns 401 when unauthenticated', async () => {
    const response = await OnboardingMetricsPost(
      { __unauth: true } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('M4 onboarding metrics GET blocks cross-org access (403)', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await OnboardingMetricsGet(
      {
        nextUrl: {
          searchParams: new URLSearchParams('organization_id=org-2'),
        },
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(mockGetOverview).not.toHaveBeenCalled();
  });

  it('M5 context/user denies cross-org target user before loading context', async () => {
    mockVerifyTargetUserOrganizationScope.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
    });

    const response = await ContextUserGet(
      {
        url: 'http://localhost/api/context/user?userId=user-2',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockGetUserFullContext).not.toHaveBeenCalled();
    expect(mockGetUserContextLight).not.toHaveBeenCalled();
    expect(mockRefreshContext).not.toHaveBeenCalled();
  });

  it('M5 chat/sessions DELETE rejects organizationId tampering (403)', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await ChatSessionsDelete(
      {
        url: 'http://localhost/api/chat/sessions?sessionId=s1&organizationId=org-2',
        __orgId: 'org-1',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockChatGetSession).not.toHaveBeenCalled();
    expect(mockChatDeleteSession).not.toHaveBeenCalled();
  });

  it('M5 chat/sessions/[sessionId] GET rejects organizationId tampering (403)', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await ChatSessionGet(
      {
        url: 'http://localhost/api/chat/sessions/s1?organizationId=org-2',
        __orgId: 'org-1',
      } as any,
      { params: Promise.resolve({ sessionId: 's1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockChatGetSession).not.toHaveBeenCalled();
    expect(mockChatGetMessages).not.toHaveBeenCalled();
  });

  it('M6 resumen-usuarios returns 401 when unauthenticated', async () => {
    const response = await ResumenUsuariosGet(
      { __unauth: true } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
  });

  it('M6 resumen-usuarios blocks cross-org query param (403)', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await ResumenUsuariosGet(
      {
        url: 'http://localhost/api/mi-sgc/resumen-usuarios?organization_id=org-2',
        __orgId: 'org-1',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });
});
