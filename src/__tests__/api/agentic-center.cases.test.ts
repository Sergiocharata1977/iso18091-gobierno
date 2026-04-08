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

import { GET } from '@/app/api/agentic-center/cases/route';

function createCasesDb(options?: {
  pendingDocs?: Array<{
    id: string;
    data: Record<string, unknown>;
  }>;
  userOrgs?: Record<string, string>;
  failPendingQuery?: boolean;
}) {
  const pendingDocs = options?.pendingDocs ?? [];
  const userOrgs = options?.userOrgs ?? {};

  return {
    collection: jest.fn((name: string) => {
      if (name === 'direct_action_confirmations') {
        return {
          where() {
            return this;
          },
          limit() {
            return this;
          },
          async get() {
            if (options?.failPendingQuery) {
              throw new Error('pending query failed');
            }

            return {
              empty: pendingDocs.length === 0,
              docs: pendingDocs.map(doc => ({
                id: doc.id,
                data: () => doc.data,
              })),
            };
          },
        };
      }

      if (name === 'users') {
        return {
          doc(id: string) {
            return {
              async get() {
                const organizationId = userOrgs[id];
                return {
                  id,
                  exists: Boolean(organizationId),
                  data: () =>
                    organizationId
                      ? { organization_id: organizationId }
                      : undefined,
                };
              },
            };
          },
        };
      }

      throw new Error(`unexpected collection: ${name}`);
    }),
  };
}

describe('GET /api/agentic-center/cases', () => {
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

  it('incluye los casos demo y agrega un caso real filtrado por organizacion', async () => {
    mockGetAdminFirestore.mockReturnValue(
      createCasesDb({
        pendingDocs: [
          {
            id: 'action-1',
            data: {
              userId: 'user-1',
              sessionId: 'session-1',
              request: {
                type: 'ASSIGN',
                entity: 'finding',
                entityId: 'HAL-031',
                data: {
                  assignedTo: 'Ana Martinez',
                },
              },
              summary: 'Asignar HAL-031 a Ana Martinez',
              status: 'pending',
              confirmed: false,
              createdAt: new Date('2026-03-29T12:00:00.000Z'),
            },
          },
        ],
        userOrgs: {
          'user-1': 'org-1',
        },
      })
    );

    const response = await GET({} as any, { params: Promise.resolve({}) } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.organizationId).toBe('org-1');
    expect(body.data.casos).toHaveLength(5);
    expect(body.data.casos[4]).toMatchObject({
      id: 'real-action-1',
      titulo: 'Asignar HAL-031 a Ana Martinez',
      estado: 'esperando',
      accion_propuesta: {
        actionId: 'action-1',
        entidad: 'Hallazgo',
        tipo_operacion: 'Asignar responsable',
      },
      persona_target: {
        nombre: 'Ana Martinez',
        canal: 'email',
      },
    });
  });

  it('si Firestore falla devuelve solo los casos demo', async () => {
    mockGetAdminFirestore.mockReturnValue(
      createCasesDb({
        failPendingQuery: true,
      })
    );

    const response = await GET({} as any, { params: Promise.resolve({}) } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.casos).toHaveLength(4);
    expect(body.data.casos.map((item: { id: string }) => item.id)).toEqual([
      'demo-capacitacion-vencida',
      'demo-hallazgo-sin-responsable',
      'demo-nc-auditoria',
      'demo-aprobacion-terminal-pendiente',
    ]);
  });

  it('propaga el error de organizacion cuando el helper rechaza el scope', async () => {
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
