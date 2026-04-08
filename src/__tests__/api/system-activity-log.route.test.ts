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
const mockGetByOrganization = jest.fn();

jest.mock('@/middleware/verifyOrganization', () => ({
  resolveAuthorizedOrganizationId: (...args: unknown[]) =>
    mockResolveAuthorizedOrganizationId(...args),
  toOrganizationApiError: (...args: unknown[]) =>
    mockToOrganizationApiError(...args),
}));

jest.mock('@/services/system/SystemActivityLogService', () => ({
  SystemActivityLogService: {
    getByOrganization: (...args: unknown[]) => mockGetByOrganization(...args),
  },
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

import { GET } from '@/app/api/admin/system-activity-log/route';

function createRequest(url: string, overrides: Record<string, unknown> = {}) {
  return {
    nextUrl: new URL(url),
    ...overrides,
  } as any;
}

describe('GET /api/admin/system-activity-log', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: true,
      organizationId: 'org-1',
    });
    mockToOrganizationApiError.mockImplementation((result: any) => ({
      status: result?.status ?? 403,
      error: result?.error ?? 'Acceso denegado',
      errorCode: result?.errorCode ?? 'ORG_ERROR',
    }));
  });

  it('retorna 200 con filtros validos y respeta el scope de organizacion', async () => {
    mockGetByOrganization.mockResolvedValue([
      {
        id: 'activity-1',
        organization_id: 'org-1',
        actor_type: 'user',
        actor_user_id: 'user-1',
        actor_display_name: 'Usuario Test',
        actor_role: 'admin',
        actor_department_id: 'dep-1',
        actor_department_name: 'Calidad',
        occurred_at: new Date('2026-03-10T10:00:00.000Z'),
        recorded_at: new Date('2026-03-10T10:05:00.000Z'),
        source_module: 'audits',
        source_submodule: 'close',
        channel: 'web',
        entity_type: 'audit',
        entity_id: 'AUD-1',
        entity_code: 'AUD-1',
        action_type: 'update',
        action_label: 'Audit Updated',
        description: 'Audit updated.',
        status: 'success',
        severity: 'info',
        related_entities: [],
        evidence_refs: [],
        correlation_id: null,
      },
    ]);

    const response = await GET(
      createRequest(
        'https://example.com/api/admin/system-activity-log?start_date=2026-03-01&end_date=2026-03-10&source_module=audits&actor_user_id=user-1&department_id=dep-1&entity_type=audit&entity_id=AUD-1&status=success&limit=25'
      ),
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockResolveAuthorizedOrganizationId).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      { requireOrg: true }
    );
    expect(mockGetByOrganization).toHaveBeenCalledWith('org-1', {
      occurred_from: new Date('2026-03-01T00:00:00.000Z'),
      occurred_to: new Date('2026-03-10T23:59:59.999Z'),
      source_module: 'audits',
      actor_user_id: 'user-1',
      actor_department_id: 'dep-1',
      entity_type: 'audit',
      entity_id: 'AUD-1',
      status: 'success',
      limit: 25,
    });
    expect(body.success).toBe(true);
    expect(body.pagination).toEqual({
      limit: 25,
      returned: 1,
      has_more: false,
    });
  });

  it('retorna 400 cuando la query es invalida', async () => {
    const response = await GET(
      createRequest(
        'https://example.com/api/admin/system-activity-log?start_date=2026-03-10&end_date=2026-03-01'
      ),
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('INVALID_QUERY');
    expect(body.details.fieldErrors.end_date).toContain(
      'end_date debe ser igual o posterior a start_date'
    );
    expect(mockResolveAuthorizedOrganizationId).not.toHaveBeenCalled();
    expect(mockGetByOrganization).not.toHaveBeenCalled();
  });

  it('rechaza el acceso cross-org cuando el scope autorizado falla', async () => {
    mockResolveAuthorizedOrganizationId.mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });
    mockToOrganizationApiError.mockReturnValue({
      status: 403,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });

    const response = await GET(
      createRequest('https://example.com/api/admin/system-activity-log'),
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: 'Acceso denegado',
      errorCode: 'ORGANIZATION_MISMATCH',
    });
    expect(mockGetByOrganization).not.toHaveBeenCalled();
  });
});
