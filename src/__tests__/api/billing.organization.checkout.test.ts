/** @jest-environment node */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockCreateOrganizationCheckout = jest.fn();

jest.mock('@/lib/billing/organizationBillingApi', () => ({
  createOrganizationCheckout: (...args: unknown[]) =>
    mockCreateOrganizationCheckout(...args),
}));

jest.mock('@/lib/billing/mobbexPlans', () => ({
  MOBBEX_PLANS: {
    premium: { name: 'Premium', price: 1000 },
  },
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({})),
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: unknown, options?: { roles?: string[] }) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) => {
      if (request.__unauth) {
        return { status: 401, json: async () => ({ error: 'No autorizado' }) };
      }
      const role = request.__role || 'admin';
      if (options?.roles?.length && !options.roles.includes(role)) {
        return { status: 403, json: async () => ({ error: 'Sin permisos' }) };
      }
      const organizationId = request.__orgId || 'org-1';
      const uid = request.__uid || 'user-1';
      return (handler as any)(request, context, {
        uid,
        email: 'owner@test.com',
        organizationId,
        role,
        user: {
          id: uid,
          email: 'owner@test.com',
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

import { POST } from '@/app/api/billing/organization/checkout/route';

const makeRequest = (body: unknown, overrides?: Record<string, unknown>) => {
  const req = new Request('http://localhost/api/billing/organization/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  return Object.assign(req, overrides ?? {}) as any;
};

describe('POST /api/billing/organization/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const req = makeRequest({ planCode: 'premium' }, { __unauth: true });
    const res = await POST(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(401);
  });

  it('returns 403 when role is operario', async () => {
    const req = makeRequest({ planCode: 'premium' }, { __role: 'operario' });
    const res = await POST(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(403);
  });

  it('returns 403 when role is auditor', async () => {
    const req = makeRequest({ planCode: 'premium' }, { __role: 'auditor' });
    const res = await POST(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(403);
  });

  it('returns 400 when planCode is missing', async () => {
    mockCreateOrganizationCheckout.mockRejectedValue(
      new Error('Missing required field: planCode')
    );

    const req = makeRequest({});
    const res = await POST(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing required field/);
  });

  it('returns 400 when planCode is invalid', async () => {
    mockCreateOrganizationCheckout.mockRejectedValue(
      new Error('Invalid planCode. Valid options: premium')
    );

    const req = makeRequest({ planCode: 'unknown_plan' });
    const res = await POST(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid planCode/);
  });

  it('returns 200 with checkoutUrl on success (admin)', async () => {
    mockCreateOrganizationCheckout.mockResolvedValue({
      success: true,
      checkoutUrl: 'https://pay.mobbex.com/checkout/abc123',
      checkoutId: 'chk-123',
      organizationId: 'org-1',
      reference: 'orgsub_org-1_12345',
      plan: { name: 'Premium', price: 1000 },
    });

    const req = makeRequest({ planCode: 'premium' }, { __role: 'admin' });
    const res = await POST(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toBe('https://pay.mobbex.com/checkout/abc123');
    expect(body.organizationId).toBe('org-1');
  });

  it('returns 200 with checkoutUrl on success (gerente)', async () => {
    mockCreateOrganizationCheckout.mockResolvedValue({
      success: true,
      checkoutUrl: 'https://pay.mobbex.com/checkout/def456',
      checkoutId: 'chk-456',
      organizationId: 'org-2',
      reference: 'orgsub_org-2_67890',
      plan: { name: 'Premium', price: 1000 },
    });

    const req = makeRequest({ planCode: 'premium' }, { __role: 'gerente', __orgId: 'org-2' });
    const res = await POST(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toBeDefined();
  });

  it('la referencia del checkout empieza con orgsub_ (es org-centrica)', async () => {
    mockCreateOrganizationCheckout.mockResolvedValue({
      success: true,
      checkoutUrl: 'https://pay.mobbex.com/checkout/xyz',
      checkoutId: 'chk-789',
      organizationId: 'org-1',
      reference: 'orgsub_org-1_99999',
      plan: { name: 'Premium', price: 1000 },
    });

    const req = makeRequest({ planCode: 'premium' });
    const res = await POST(req, { params: Promise.resolve({}) } as any);

    const body = await res.json();
    expect(body.reference).toMatch(/^orgsub_/);
  });

  it('returns 500 on unexpected internal error', async () => {
    mockCreateOrganizationCheckout.mockRejectedValue(
      new Error('Firestore connection failed')
    );

    const req = makeRequest({ planCode: 'premium' });
    const res = await POST(req, { params: Promise.resolve({}) } as any);

    expect(res.status).toBe(500);
  });
});
