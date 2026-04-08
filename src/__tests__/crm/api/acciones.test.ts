/** @jest-environment node */

const mockAuth = {
  role: 'admin',
  organizationId: 'org-1',
  uid: 'user-1',
};

const mockAccionesGet = jest.fn();
const mockAccionAdd = jest.fn();
const mockEnqueueJob = jest.fn();

const accionesQuery: any = {
  orderBy: jest.fn(() => accionesQuery),
  limit: jest.fn(() => accionesQuery),
  where: jest.fn(() => accionesQuery),
  get: mockAccionesGet,
  add: mockAccionAdd,
};

const mockDb = {
  collection: jest.fn((name: string) => {
    if (name !== 'organizations') {
      throw new Error(`Unexpected collection: ${name}`);
    }

    return {
      doc: jest.fn(() => ({
        collection: jest.fn(() => accionesQuery),
      })),
    };
  }),
};

jest.mock('@/lib/api/withAuth', () => ({
  withAuth:
    (handler: any) =>
    async (request: Request, context: any = {}) =>
      handler(request, context, mockAuth),
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => mockDb,
}));

jest.mock('@/services/agents/AgentQueueService', () => ({
  AgentQueueService: {
    enqueueJob: (...args: any[]) => mockEnqueueJob(...args),
  },
}));

import { GET, POST } from '@/app/api/crm/acciones/route';

describe('API /crm/acciones', () => {
  const asNextRequest = (request: Request) => request as any;
  const emptyContext = { params: Promise.resolve({}) };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.role = 'admin';
    mockAuth.organizationId = 'org-1';

    mockAccionesGet.mockResolvedValue({
      docs: [
        {
          id: 'accion-1',
          data: () => ({ titulo: 'Llamada', estado: 'programada' }),
        },
      ],
    });

    mockAccionAdd.mockResolvedValue({ id: 'accion-new' });
    mockEnqueueJob.mockResolvedValue({ id: 'job-1' });
  });

  it('returns success true and data array on valid GET', async () => {
    const request = new Request('http://localhost/api/crm/acciones?limit=10');
    const response = await GET(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].id).toBe('accion-1');
  });

  it('returns 400 when organization_id is missing', async () => {
    mockAuth.organizationId = undefined as any;

    const request = new Request('http://localhost/api/crm/acciones');
    const response = await GET(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('organization_id');
  });

  it('creates accion and enqueues task.assign when vendedor_phone is present', async () => {
    const request = new Request('http://localhost/api/crm/acciones', {
      method: 'POST',
      body: JSON.stringify({
        titulo: 'Visita cliente',
        tipo: 'visita',
        vendedor_phone: '+5491111111111',
        vendedor_id: 'seller-1',
      }),
    });

    const response = await POST(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('accion-new');
    expect(mockAccionAdd).toHaveBeenCalled();
    expect(mockEnqueueJob).toHaveBeenCalled();
  });
});
