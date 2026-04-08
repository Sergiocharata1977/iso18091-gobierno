jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any, _options?: { roles?: string[] }) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) =>
      handler(request, context, {
        uid: 'super-admin-1',
        role: 'super_admin',
        organizationId: null,
        email: 'super@test.com',
        user: {
          id: 'super-admin-1',
          email: 'super@test.com',
          rol: 'super_admin',
          organization_id: null,
          personnel_id: null,
          activo: true,
          status: 'active',
        },
      });
  },
}));

const mockGetConfig = jest.fn();
const mockCheckBudget = jest.fn();

jest.mock('@/services/ai-core/AIPricingService', () => ({
  AIPricingService: {
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
    checkBudget: (...args: unknown[]) => mockCheckBudget(...args),
  },
}));

const mockDbFactory = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => mockDbFactory(),
}));

import { GET } from '@/app/api/super-admin/ai-pricing/stats/route';

function createUsageDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  } as FirebaseFirestore.QueryDocumentSnapshot;
}

describe('GET /api/super-admin/ai-pricing/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConfig.mockResolvedValue({
      providers: {
        groq_llama_70b: {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          label: 'Groq Llama 70B',
          cost_input_per_million: 0.59,
          cost_output_per_million: 0.79,
          enabled: true,
        },
      },
      plans: {
        starter: {
          id: 'starter',
          label: 'Starter',
          description: 'Plan base',
          allowed_provider_keys: ['groq_llama_70b'],
          markup_pct: 40,
          monthly_usd_limit: 5,
          daily_token_limit: null,
          hard_stop: true,
          enabled: true,
        },
      },
      default_plan_id: 'starter',
      updated_by: 'system',
    });
  });

  it('retorna detalle por organizacion con remaining_usd null cuando no hay limite', async () => {
    mockCheckBudget.mockResolvedValue({
      allowed: true,
      warning: false,
      remaining_usd: Number.POSITIVE_INFINITY,
      plan_id: 'starter',
    });

    const organizationDoc = {
      exists: true,
      id: 'org-1',
      data: () => ({
        name: 'Org Uno',
        ai_plan_id: 'starter',
      }),
    };
    const usageDocs = [
      createUsageDoc('u1', {
        organization_id: 'org-1',
        ai_plan_id: 'starter',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        fecha: { toDate: () => new Date('2026-04-02T10:00:00.000Z') },
        cost_actual_usd: 0.2,
        cost_billing_usd: 0.3,
        tokens_input_real: 100,
        tokens_output_real: 50,
      }),
    ];

    const usageQuery = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: usageDocs }),
    };

    mockDbFactory.mockReturnValue({
      collection: jest.fn((name: string) => {
        if (name === 'organizations') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(organizationDoc),
            })),
          };
        }

        if (name === 'uso_claude') {
          return usageQuery;
        }

        throw new Error(`Unexpected collection ${name}`);
      }),
    });

    const response = await GET(
      {
        nextUrl: new URL('https://example.com/api/super-admin/ai-pricing/stats?orgId=org-1'),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.organizationId).toBe('org-1');
    expect(body.data.summary.costo_total).toBe(0.3);
    expect(body.data.budget.remaining_usd).toBeNull();
  });

  it('retorna overview global con warning cuando un tenant supera 80%', async () => {
    const usageDocs = [
      createUsageDoc('u1', {
        organization_id: 'org-1',
        ai_plan_id: 'starter',
        provider: 'groq',
        fecha: { toDate: () => new Date() },
        cost_actual_usd: 1,
        cost_billing_usd: 4.5,
        tokens_input_real: 100,
        tokens_output_real: 50,
      }),
    ];

    mockDbFactory.mockReturnValue({
      collection: jest.fn((name: string) => {
        if (name === 'organizations') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  id: 'org-1',
                  data: () => ({
                    name: 'Org Uno',
                    ai_plan_id: 'starter',
                  }),
                },
              ],
            }),
          };
        }

        if (name === 'uso_claude') {
          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: usageDocs }),
          };
        }

        throw new Error(`Unexpected collection ${name}`);
      }),
    });

    const response = await GET(
      {
        nextUrl: new URL('https://example.com/api/super-admin/ai-pricing/stats'),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.overview.totalCostMonth).toBe(4.5);
    expect(body.data.warnings).toHaveLength(1);
    expect(body.data.topOrganizations[0].usagePctOfLimit).toBe(90);
  });
});
