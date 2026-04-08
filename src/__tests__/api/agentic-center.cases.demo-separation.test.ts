describe('GET /api/agentic-center/cases demo separation', () => {
  const mockResolveAuthorizedOrganizationId = jest.fn();
  const mockToOrganizationApiError = jest.fn();
  const mockMapRealCases = jest.fn();
  const mockGetLatestReport = jest.fn();

  async function loadRoute(nodeEnv: string) {
    jest.resetModules();
    process.env.NODE_ENV = nodeEnv;

    jest.doMock('next/server', () => ({
      NextResponse: {
        json: (body: unknown, init?: { status?: number }) => ({
          status: init?.status ?? 200,
          json: async () => body,
        }),
      },
    }));

    jest.doMock('@/middleware/verifyOrganization', () => ({
      resolveAuthorizedOrganizationId: (...args: unknown[]) =>
        mockResolveAuthorizedOrganizationId(...args),
      toOrganizationApiError: (...args: unknown[]) => mockToOrganizationApiError(...args),
    }));

    jest.doMock('@/lib/firebase/admin', () => ({
      getAdminFirestore: () => ({}),
    }));

    jest.doMock('@/lib/api/withAuth', () => ({
      withAuth: (handler: any, options?: { roles?: string[] }) => {
        return (request: any, context: any = { params: Promise.resolve({}) }) => {
          if (request.__authenticated === false) {
            return {
              status: 401,
              json: async () => ({ error: 'Unauthorized' }),
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

    jest.doMock('@/services/agentic-center/AgenticCenterCaseMapper', () => ({
      AgenticCenterCaseMapper: jest.fn().mockImplementation(() => ({
        mapRealCases: (...args: unknown[]) => mockMapRealCases(...args),
      })),
    }));

    jest.doMock('@/services/strategic-analysis/StrategicAnalysisReportService', () => ({
      StrategicAnalysisReportService: {
        getLatestReport: (...args: unknown[]) => mockGetLatestReport(...args),
      },
    }));

    return import('@/app/api/agentic-center/cases/route');
  }

  function createRequest(query = '', overrides: Record<string, unknown> = {}) {
    return {
      nextUrl: {
        searchParams: new URLSearchParams(query),
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-1',
    });
    mockToOrganizationApiError.mockImplementation((result: any) => ({
      status: result.status ?? 403,
      error: result.error ?? 'Acceso denegado',
      errorCode: result.errorCode ?? 'ORG_ERROR',
    }));
    mockMapRealCases.mockResolvedValue([]);
    mockGetLatestReport.mockResolvedValue(null);
  });

  it('en production no devuelve demos aunque llegue demo=true', async () => {
    const { GET } = await loadRoute('production');
    const response = await GET(createRequest('demo=true') as any, {} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.meta.demo_mode).toBe(false);
    expect(body.data.meta.demo_count).toBe(0);
    expect(body.data.casos).toEqual([]);
  });

  it('en test incluye demos cuando llega demo=true', async () => {
    const { GET } = await loadRoute('test');
    const response = await GET(createRequest('demo=true') as any, {} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.meta.demo_mode).toBe(true);
    expect(body.data.meta.demo_count).toBe(4);
    expect(body.data.casos.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([
        'demo-capacitacion-vencida',
        'demo-hallazgo-sin-responsable',
        'demo-nc-auditoria',
        'demo-aprobacion-terminal-pendiente',
      ])
    );
  });

  it('sin token devuelve 401', async () => {
    const { GET } = await loadRoute('test');
    const response = await GET(
      createRequest('', { __authenticated: false }) as any,
      {} as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('no mezcla casos entre organizaciones distintas', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-a',
    });
    mockMapRealCases.mockImplementation(async (orgId: string) => [
      { id: `real-${orgId}`, org_id: orgId },
    ]);

    const { GET } = await loadRoute('test');
    const response = await GET(
      createRequest('', { __orgId: 'org-a' }) as any,
      {} as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockMapRealCases).toHaveBeenCalledWith('org-a', {});
    expect(body.data.organizationId).toBe('org-a');
    expect(body.data.casos).toEqual(
      expect.arrayContaining([expect.objectContaining({ org_id: 'org-a' })])
    );
    expect(body.data.casos).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ org_id: 'org-b' })])
    );
  });
});
