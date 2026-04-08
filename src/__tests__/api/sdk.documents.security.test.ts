import { GET, POST } from '@/app/api/sdk/documents/route';

const mockGetRecentDocuments = jest.fn();
const mockCreateAndReturnId = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/sdk/modules/documents', () => ({
  DocumentService: jest.fn().mockImplementation(() => ({
    getRecentDocuments: mockGetRecentDocuments,
    createAndReturnId: mockCreateAndReturnId,
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

      const organizationId = request.__orgId || 'org-1';

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

describe('SDK documents security: /api/sdk/documents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRecentDocuments.mockResolvedValue([]);
    mockCreateAndReturnId.mockResolvedValue('doc-1');
  });

  it('returns 401 when request has no auth context', async () => {
    const response = await GET(
      {
        __unauth: true,
        nextUrl: { searchParams: new URLSearchParams() },
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
  });

  it('denies cross-org read when query organization_id differs from token org', async () => {
    const response = await GET(
      {
        __orgId: 'org-1',
        nextUrl: {
          searchParams: new URLSearchParams('organization_id=org-2'),
        },
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockGetRecentDocuments).not.toHaveBeenCalled();
  });

  it('denies cross-org write when body organization_id differs from token org', async () => {
    const response = await POST(
      {
        __orgId: 'org-1',
        nextUrl: { searchParams: new URLSearchParams() },
        json: async () => ({
          organization_id: 'org-2',
          title: 'Doc de prueba',
          description: 'Documento de prueba con descripcion valida',
          content: 'Contenido de prueba del documento para validacion',
          category: 'general',
          tags: ['prueba'],
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockCreateAndReturnId).not.toHaveBeenCalled();
  });
});
