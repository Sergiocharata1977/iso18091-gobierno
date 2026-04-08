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
  withAuth: (handler: any) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) => {
      if (request.__unauth) {
        return {
          status: 401,
          json: async () => ({ error: 'No autorizado' }),
        };
      }

      const organizationId = request.__orgId ?? 'org-1';
      const role = request.__role ?? 'admin';
      return handler(request, context, {
        uid: request.__uid || 'user-1',
        email: 'usuario@acme.com',
        organizationId,
        role,
        user: {
          id: request.__uid || 'user-1',
          email: 'usuario@acme.com',
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

import { GET } from '@/app/api/journey/snapshot/route';

function qs(items: Array<Record<string, unknown>>) {
  return {
    size: items.length,
    empty: items.length === 0,
    docs: items.map((item, index) => ({
      id: item.id ?? `doc-${index}`,
      data: () => item,
    })),
  };
}

function doc(data?: Record<string, unknown> | null) {
  return {
    exists: data != null,
    data: () => data ?? undefined,
  };
}

function createSnapshotDb() {
  const topLevel: Record<string, Array<Record<string, unknown>>> = {
    hallazgos: [
      { id: 'h1', organization_id: 'org-auth', status: 'open' },
      { id: 'h2', organization_id: 'org-2', status: 'open' },
    ],
    findings: [],
    acciones: [
      {
        id: 'a1',
        organization_id: 'org-auth',
        status: 'pending',
        fecha_vencimiento: new Date(Date.now() - 86_400_000).toISOString(),
      },
      {
        id: 'a2',
        organization_id: 'org-2',
        status: 'pending',
        fecha_vencimiento: new Date(Date.now() - 86_400_000).toISOString(),
      },
    ],
    actions: [],
    auditorias: [{ id: 'audit-1', organization_id: 'org-auth', status: 'planned' }],
    capacitaciones: [],
    trainings: [],
    direct_action_confirmations: [
      { id: 'da-1', organization_id: 'org-auth', status: 'pending' },
      { id: 'da-2', organization_id: 'org-2', status: 'pending' },
    ],
  };

  const orgCollections: Record<string, Record<string, Array<Record<string, unknown>>>> = {
    'org-auth': {
      strategic_analysis_reports: [
        {
          id: 'report-1',
          created_at: new Date(Date.now() - 45 * 86_400_000).toISOString(),
        },
      ],
      journey: [
        {
          id: 'progress',
          fases: [
            { phaseId: 3, porcentaje: 50, status: 'in_progress' },
            { phaseId: 4, porcentaje: 0, status: 'locked' },
          ],
        },
      ],
    },
    'org-2': {
      journey: [
        {
          id: 'progress',
          fases: [{ phaseId: 5, porcentaje: 100, status: 'completed' }],
        },
      ],
    },
  };

  function createRef(path: string[], filters: Array<{ field: string; value: unknown }> = []) {
    return {
      doc(id: string) {
        const nextPath = [...path, id];
        return {
          ...createRef(nextPath, filters),
          async get() {
            if (nextPath.length === 2 && nextPath[0] === 'organizations') {
              return doc(
                id === 'org-auth'
                  ? { organization_name: 'Org Auth' }
                  : { organization_name: 'Org Other' }
              );
            }

            if (nextPath.length === 4 && nextPath[0] === 'organizations') {
              const [, orgId, collectionName, docId] = nextPath;
              const found = (orgCollections[orgId]?.[collectionName] ?? []).find(
                item => item.id === docId
              );
              return doc(found ?? null);
            }

            return doc(null);
          },
          collection(name: string) {
            return createRef([...nextPath, name]);
          },
        };
      },
      collection(name: string) {
        return createRef([...path, name]);
      },
      where(field: string, _operator: string, value: unknown) {
        return createRef(path, [...filters, { field, value }]);
      },
      orderBy() {
        return this;
      },
      limit() {
        return this;
      },
      async get() {
        if (path.length === 1) {
          let items = [...(topLevel[path[0]] ?? [])];
          for (const filter of filters) {
            items = items.filter(item => item[filter.field] === filter.value);
          }
          return qs(items);
        }

        if (path.length === 3 && path[0] === 'organizations') {
          const [, orgId, collectionName] = path;
          let items = [...(orgCollections[orgId]?.[collectionName] ?? [])];
          for (const filter of filters) {
            items = items.filter(item => item[filter.field] === filter.value);
          }
          return qs(items);
        }

        return qs([]);
      },
    };
  }

  return {
    collection(name: string) {
      return createRef([name]);
    },
  };
}

describe('GET /api/journey/snapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-auth',
    });
    mockToOrganizationApiError.mockImplementation((result: any) => ({
      status: result.status ?? 403,
      error: result.error ?? 'Acceso denegado',
      errorCode: result.errorCode ?? 'FORBIDDEN',
    }));
    mockGetAdminFirestore.mockReturnValue(createSnapshotDb());
  });

  it('sin token devuelve 401', async () => {
    const response = await GET({ __unauth: true } as any, {
      params: Promise.resolve({}),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
  });

  it('solo devuelve datos de la org autenticada', async () => {
    const response = await GET(
      { __orgId: 'org-auth', url: 'http://localhost/api/journey/snapshot' } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot).toEqual(
      expect.objectContaining({
        hallazgosAbiertos: 1,
        accionesPendientes: 1,
        accionesVencidas: 1,
        auditoriasPlaneadas: 1,
        directActionsPendientes: 1,
        diasSinAnalisisEstrategico: 45,
        faseActual: 3,
        porcentajeFaseActual: 50,
        nombreOrg: 'Org Auth',
      })
    );
  });
});
