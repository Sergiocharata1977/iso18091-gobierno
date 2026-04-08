jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockResolveAuthorizedOrganizationId = jest.fn();
const mockToOrganizationApiError = jest.fn();
const mockGetAdminFirestore = jest.fn();

jest.mock('@/middleware/verifyOrganization', () => ({
  resolveAuthorizedOrganizationId: (...args: unknown[]) =>
    mockResolveAuthorizedOrganizationId(...args),
  toOrganizationApiError: (...args: unknown[]) => mockToOrganizationApiError(...args),
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => mockGetAdminFirestore(),
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any, options?: { roles?: string[] }) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) => {
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

import { GET } from '@/app/api/agentic-center/summary/route';

function createSummaryDb(sizes: {
  directActions?: number;
  sagasPaused?: number;
  jobsQueued?: number;
  jobsRunning?: number;
  terminalsPending?: number;
  failCollections?: string[];
}) {
  const failCollections = new Set(sizes.failCollections ?? []);

  return {
    collection: jest.fn((name: string) => {
      const filters: Array<{ field: string; value: string }> = [];

      return {
        where(field: string, _operator: string, value: string) {
          filters.push({ field, value });
          return this;
        },
        async get() {
          if (failCollections.has(name)) {
            throw new Error(`query failed for ${name}`);
          }

          if (name === 'direct_action_confirmations') {
            return { size: sizes.directActions ?? 0 };
          }

          if (name === 'agent_sagas') {
            return { size: sizes.sagasPaused ?? 0 };
          }

          if (name === 'agent_jobs') {
            const status = filters.find(filter => filter.field === 'status')?.value;
            if (status === 'queued') {
              return { size: sizes.jobsQueued ?? 0 };
            }
            if (status === 'running') {
              return { size: sizes.jobsRunning ?? 0 };
            }
          }

          if (name === 'terminales') {
            return { size: sizes.terminalsPending ?? 0 };
          }

          return { size: 0 };
        },
      };
    }),
  };
}

describe('GET /api/agentic-center/summary', () => {
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
  });

  it('devuelve el resumen agregado con personas impactadas derivadas', async () => {
    mockGetAdminFirestore.mockReturnValue(
      createSummaryDb({
        directActions: 2,
        sagasPaused: 3,
        jobsQueued: 1,
        jobsRunning: 4,
        terminalsPending: 5,
      })
    );

    const response = await GET({} as any, { params: Promise.resolve({}) } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        jobs_activos: 5,
        sagas_pausadas: 3,
        direct_actions_pendientes: 2,
        terminales_con_aprobacion: 5,
        personas_impactadas: 5,
      },
    });
  });

  it('degrada a cero los contadores cuyos queries fallan', async () => {
    mockGetAdminFirestore.mockReturnValue(
      createSummaryDb({
        directActions: 9,
        sagasPaused: 2,
        jobsQueued: 5,
        jobsRunning: 6,
        terminalsPending: 1,
        failCollections: ['direct_action_confirmations', 'agent_jobs'],
      })
    );

    const response = await GET({} as any, { params: Promise.resolve({}) } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      jobs_activos: 0,
      sagas_pausadas: 2,
      direct_actions_pendientes: 0,
      terminales_con_aprobacion: 1,
      personas_impactadas: 2,
    });
  });

  it('propaga el error de organizacion cuando el scope no es valido', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await GET({} as any, { params: Promise.resolve({}) } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });
});
