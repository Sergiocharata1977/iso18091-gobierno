jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
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

jest.mock('firebase-admin', () => ({
  apps: [{}],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    })),
  })),
}));

const mockListTrainings = jest.fn();
const mockCreateTraining = jest.fn();

jest.mock('@/lib/sdk/modules/rrhh', () => ({
  TrainingService: jest.fn().mockImplementation(() => ({
    list: mockListTrainings,
    getByPersonnel: jest.fn(),
    getByCompetence: jest.fn(),
    createAndReturnId: mockCreateTraining,
  })),
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ organization_id: 'org-1' }),
        }),
      })),
    })),
  })),
}));

const mockRecentActivity = jest.fn();
jest.mock('@/services/agents/AgentMetricsService', () => ({
  AgentMetricsService: {
    getRecentActivity: (...args: unknown[]) => mockRecentActivity(...args),
  },
}));

const mockValidateWebhookSignature = jest.fn();
const mockParseWebhookPayload = jest.fn();
jest.mock('@/services/billing/MobbexService', () => ({
  mobbexService: {
    validateWebhookSignature: (...args: unknown[]) =>
      mockValidateWebhookSignature(...args),
    parseWebhookPayload: (...args: unknown[]) =>
      mockParseWebhookPayload(...args),
  },
}));

jest.mock('@/firebase/config', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'now'),
}));

import { GET as LeadsGet } from '@/app/api/landing/leads/route';
import { POST as TrainingsPost } from '@/app/api/sdk/rrhh/trainings/route';
import { GET as McpJobsGet } from '@/app/api/mcp/jobs/route';
import { POST as MobbexWebhookPost } from '@/app/api/billing/mobbex/webhook/route';

describe('P08 security hotfixes M1-M4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('M1: denies unauthenticated access to landing leads', async () => {
    const response = await LeadsGet(
      { __unauth: true } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
  });

  it('M2: denies cross-org create on rrhh trainings', async () => {
    const response = await TrainingsPost(
      {
        __orgId: 'org-1',
        json: async () => ({
          organization_id: 'org-2',
          title: 'Formacion',
          description: 'Descripcion valida de entrenamiento de ejemplo',
          personnelId: '11111111-1111-1111-1111-111111111111',
          competencyId: '22222222-2222-2222-2222-222222222222',
          startDate: '2026-02-17T10:00:00.000Z',
          endDate: '2026-02-17T12:00:00.000Z',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Acceso denegado');
    expect(mockCreateTraining).not.toHaveBeenCalled();
  });

  it('M3: rejects billing webhook with invalid signature', async () => {
    mockValidateWebhookSignature.mockReturnValue(false);

    const response = await MobbexWebhookPost({
      headers: {
        get: (key: string) =>
          key.toLowerCase() === 'x-mobbex-signature' ? 'bad-signature' : null,
      },
      text: async () =>
        JSON.stringify({
          data: { payment: { id: 'tx-1', status: { code: '200' } } },
        }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid signature');
    expect(mockParseWebhookPayload).not.toHaveBeenCalled();
  });

  it('M4: denies org tampering in mcp jobs query', async () => {
    const response = await McpJobsGet(
      {
        url: 'http://localhost/api/mcp/jobs?organizationId=org-2&limit=10',
        __orgId: 'org-1',
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden organization');
    expect(mockRecentActivity).not.toHaveBeenCalled();
  });
});
