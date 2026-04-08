jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockResolveAuthorizedOrganizationId = jest.fn();
const mockDbCollection = jest.fn();

jest.mock('@/middleware/verifyOrganization', () => ({
  resolveAuthorizedOrganizationId: (...args: unknown[]) =>
    mockResolveAuthorizedOrganizationId(...args),
}));

jest.mock('@/services/context/UserContextService', () => ({
  UserContextService: {
    getUserFullContext: jest.fn(),
  },
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: (...args: unknown[]) => mockDbCollection(...args),
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

import { GET } from '@/app/api/mi-sgc/resumen-usuarios/route';

describe('M6 resumen-usuarios API security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-1',
    });
    mockDbCollection.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      collection: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    }));
  });

  it('devuelve 401 sin autenticacion', async () => {
    const response = await GET(
      {
        __unauth: true,
        url: 'http://localhost/api/mi-sgc/resumen-usuarios',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
    expect(mockDbCollection).not.toHaveBeenCalled();
  });

  it('bloquea rol no autorizado (operario) con 403', async () => {
    const response = await GET(
      {
        __role: 'operario',
        url: 'http://localhost/api/mi-sgc/resumen-usuarios',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Sin permisos');
    expect(mockDbCollection).not.toHaveBeenCalled();
  });

  it('bloquea query organization_id cross-tenant para admin', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await GET(
      {
        __role: 'admin',
        __orgId: 'org-1',
        url: 'http://localhost/api/mi-sgc/resumen-usuarios?organization_id=org-2',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockDbCollection).not.toHaveBeenCalled();
  });

  it('bloquea query organizationId (alias) cross-tenant para admin', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await GET(
      {
        __role: 'admin',
        __orgId: 'org-1',
        url: 'http://localhost/api/mi-sgc/resumen-usuarios?organizationId=org-2',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockDbCollection).not.toHaveBeenCalled();
  });

  it('propaga status/mensaje del helper cuando falta organization_id efectivo', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 400,
      error: 'organization_id es requerido',
    });

    const response = await GET(
      {
        __role: 'super_admin',
        __orgId: null,
        url: 'http://localhost/api/mi-sgc/resumen-usuarios',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('organization_id es requerido');
    expect(mockDbCollection).not.toHaveBeenCalled();
  });
});
