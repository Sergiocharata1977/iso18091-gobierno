jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockVerifyTargetUserOrganizationScope = jest.fn();
const mockToOrganizationApiError = jest.fn();
const mockGetUserFullContext = jest.fn();
const mockGetUserContextLight = jest.fn();
const mockRefreshContext = jest.fn();
const mockGetTaskStats = jest.fn();
const mockGetUserTasks = jest.fn();

jest.mock('@/middleware/verifyOrganization', () => ({
  verifyTargetUserOrganizationScope: (...args: unknown[]) =>
    mockVerifyTargetUserOrganizationScope(...args),
  toOrganizationApiError: (...args: unknown[]) =>
    mockToOrganizationApiError(...args),
}));

jest.mock('@/services/context/UserContextService', () => ({
  UserContextService: {
    getUserFullContext: (...args: unknown[]) => mockGetUserFullContext(...args),
    getUserContextLight: (...args: unknown[]) =>
      mockGetUserContextLight(...args),
    refreshContext: (...args: unknown[]) => mockRefreshContext(...args),
  },
}));

jest.mock('@/services/user-tasks', () => ({
  getTaskStats: (...args: unknown[]) => mockGetTaskStats(...args),
  getUserTasks: (...args: unknown[]) => mockGetUserTasks(...args),
  createUserTask: jest.fn(),
  updateUserTask: jest.fn(),
  deleteUserTask: jest.fn(),
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    })),
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

import { GET as ContextUserGet } from '@/app/api/context/user/route';
import { GET as UserDashboardGet } from '@/app/api/users/[id]/dashboard/route';
import { GET as UserTasksGet } from '@/app/api/users/[id]/tasks/route';

describe('M5 Mi Panel API security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyTargetUserOrganizationScope.mockResolvedValue({
      ok: true,
      organizationId: 'org-1',
    });
    mockToOrganizationApiError.mockImplementation(
      (result: any, options?: any) => ({
        status: result?.status ?? options?.defaultStatus ?? 403,
        error: result?.error ?? options?.defaultError ?? 'Acceso denegado',
        errorCode: result?.errorCode ?? 'FORBIDDEN',
      })
    );
    mockGetUserFullContext.mockResolvedValue({
      user: { organization_id: 'org-1' },
    });
    mockGetUserContextLight.mockResolvedValue({
      user: { organization_id: 'org-1' },
    });
    mockRefreshContext.mockResolvedValue({
      user: { organization_id: 'org-1' },
    });
    mockGetTaskStats.mockResolvedValue({ pending: 0 });
    mockGetUserTasks.mockResolvedValue([]);
  });

  it('GET /api/context/user devuelve 401 sin autenticacion', async () => {
    const response = await ContextUserGet(
      { __unauth: true, url: 'http://localhost/api/context/user' } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockGetUserFullContext).not.toHaveBeenCalled();
  });

  it('GET /api/context/user bloquea target user cross-org', async () => {
    mockVerifyTargetUserOrganizationScope.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await ContextUserGet(
      {
        __role: 'gerente',
        __uid: 'manager-1',
        __orgId: 'org-1',
        url: 'http://localhost/api/context/user?userId=user-foreign',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockGetUserFullContext).not.toHaveBeenCalled();
  });

  it('GET /api/users/[id]/dashboard bloquea admin cross-org', async () => {
    mockVerifyTargetUserOrganizationScope.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await UserDashboardGet(
      {} as any,
      { params: Promise.resolve({ id: 'foreign-user' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockGetTaskStats).not.toHaveBeenCalled();
    expect(mockGetUserTasks).not.toHaveBeenCalled();
  });

  it('GET /api/users/[id]/dashboard devuelve 404 si usuario objetivo no existe', async () => {
    mockVerifyTargetUserOrganizationScope.mockResolvedValue({
      ok: false,
      status: 404,
      error: 'Usuario no encontrado',
      errorCode: 'USER_NOT_FOUND',
    });

    const response = await UserDashboardGet(
      {
        __role: 'admin',
        __uid: 'admin-1',
        __orgId: 'org-1',
      } as any,
      { params: Promise.resolve({ id: 'missing-user' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Usuario no encontrado');
    expect(mockGetTaskStats).not.toHaveBeenCalled();
    expect(mockGetUserTasks).not.toHaveBeenCalled();
  });

  it('GET /api/users/[id]/dashboard bloquea rol insuficiente para ver panel ajeno', async () => {
    const response = await UserDashboardGet(
      {
        __role: 'gerente',
        __uid: 'manager-1',
        __orgId: 'org-1',
      } as any,
      { params: Promise.resolve({ id: 'user-2' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('No autorizado');
    expect(mockVerifyTargetUserOrganizationScope).not.toHaveBeenCalled();
    expect(mockGetTaskStats).not.toHaveBeenCalled();
  });

  it('GET /api/users/[id]/tasks bloquea admin cross-org', async () => {
    mockVerifyTargetUserOrganizationScope.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await UserTasksGet(
      { url: 'http://localhost/api/users/foreign-user/tasks' } as any,
      { params: Promise.resolve({ id: 'foreign-user' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockGetUserTasks).not.toHaveBeenCalled();
  });

  it('GET /api/users/[id]/tasks devuelve 404 si usuario objetivo no existe', async () => {
    mockVerifyTargetUserOrganizationScope.mockResolvedValue({
      ok: false,
      status: 404,
      error: 'Usuario no encontrado',
      errorCode: 'USER_NOT_FOUND',
    });

    const response = await UserTasksGet(
      {
        __role: 'admin',
        __uid: 'admin-1',
        __orgId: 'org-1',
        url: 'http://localhost/api/users/missing-user/tasks',
      } as any,
      { params: Promise.resolve({ id: 'missing-user' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Usuario no encontrado');
    expect(mockGetUserTasks).not.toHaveBeenCalled();
  });

  it('GET /api/users/[id]/tasks bloquea rol insuficiente para ver tareas ajenas', async () => {
    const response = await UserTasksGet(
      {
        __role: 'gerente',
        __uid: 'manager-1',
        __orgId: 'org-1',
        url: 'http://localhost/api/users/user-2/tasks',
      } as any,
      { params: Promise.resolve({ id: 'user-2' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('No autorizado');
    expect(mockVerifyTargetUserOrganizationScope).not.toHaveBeenCalled();
    expect(mockGetUserTasks).not.toHaveBeenCalled();
  });

  it('GET /api/users/[id]/dashboard devuelve 401 sin autenticacion', async () => {
    const response = await UserDashboardGet(
      { __unauth: true } as any,
      { params: Promise.resolve({ id: 'user-1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockGetTaskStats).not.toHaveBeenCalled();
  });

  it('GET /api/users/[id]/tasks devuelve 401 sin autenticacion', async () => {
    const response = await UserTasksGet(
      { __unauth: true, url: 'http://localhost/api/users/user-1/tasks' } as any,
      { params: Promise.resolve({ id: 'user-1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockGetUserTasks).not.toHaveBeenCalled();
  });
});
