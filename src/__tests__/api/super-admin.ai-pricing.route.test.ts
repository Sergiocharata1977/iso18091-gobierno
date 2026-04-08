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

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  set: mockSet,
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
}));
const mockGetAdminFirestore = jest.fn(() => ({
  collection: mockCollection,
}));

const mockGetConfig = jest.fn();
const mockInvalidateCache = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => mockGetAdminFirestore(),
}));

jest.mock('@/services/ai-core/AIPricingService', () => ({
  AIPricingService: {
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
    invalidateCache: () => mockInvalidateCache(),
  },
}));

import { GET, PUT } from '@/app/api/super-admin/ai-pricing/route';

describe('GET /api/super-admin/ai-pricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna la configuracion y marca source=fallback cuando el doc no existe', async () => {
    mockGet.mockResolvedValue({ exists: false });
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

    const response = await GET({} as any, { params: Promise.resolve({}) } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.source).toBe('fallback');
    expect(body.data.default_plan_id).toBe('starter');
  });
});

describe('PUT /api/super-admin/ai-pricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persiste una configuracion valida e invalida cache', async () => {
    const payload = {
      providers: {
        groq_llama_70b: {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          label: 'Groq Llama 70B',
          cost_input_per_million: 0.59,
          cost_output_per_million: 0.79,
          enabled: true,
          updated_at: { seconds: 1 },
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
      updated_by: 'frontend',
    };

    const response = await PUT(
      {
        json: async () => payload,
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockInvalidateCache).toHaveBeenCalledTimes(1);
    expect(mockSet.mock.calls[0][0].updated_by).toBe('super-admin-1');
  });
});
