/** @jest-environment node */

const mockAuth = {
  role: 'admin',
  organizationId: 'org-1',
  uid: 'user-1',
  email: 'admin@test.com',
};

const mockParse = jest.fn((value: unknown) => value);

const mockClientesGet = jest.fn();
const mockEstadosGet = jest.fn();
const mockClienteAdd = jest.fn();

const makeWhereQuery = (getFn: jest.Mock) => {
  const query: any = {
    where: jest.fn(() => query),
    get: getFn,
  };
  return query;
};

const clientesQuery = makeWhereQuery(mockClientesGet);
const estadosQuery = makeWhereQuery(mockEstadosGet);

const mockDb = {
  collection: jest.fn((name: string) => {
    if (name === 'crm_organizaciones') {
      return {
        where: jest.fn(() => clientesQuery),
        add: mockClienteAdd,
      };
    }

    if (name === 'crm_kanban_estados') {
      return {
        where: jest.fn(() => estadosQuery),
      };
    }

    throw new Error(`Unexpected collection: ${name}`);
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

jest.mock('@/lib/schemas/crm-schemas', () => ({
  createClienteCRMSchema: {
    parse: (value: unknown) => mockParse(value),
  },
}));

import { GET, POST } from '@/app/api/crm/clientes/route';

describe('API /crm/clientes', () => {
  const asNextRequest = (request: Request) => request as any;
  const emptyContext = { params: Promise.resolve({}) };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.role = 'admin';
    mockAuth.organizationId = 'org-1';

    mockClientesGet.mockResolvedValue({
      docs: [
        {
          id: 'cliente-1',
          data: () => ({ razon_social: 'Acme SA', organization_id: 'org-1' }),
        },
      ],
    });

    mockEstadosGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'estado-1',
          data: () => ({ nombre: 'Prospecto', orden: 0 }),
        },
      ],
    });

    mockClienteAdd.mockResolvedValue({ id: 'cliente-new' });
  });

  it('returns success true and data array on valid GET', async () => {
    const request = new Request('http://localhost/api/crm/clientes');
    const response = await GET(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0].id).toBe('cliente-1');
  });

  it('returns 400 when organization_id is missing', async () => {
    mockAuth.organizationId = undefined as any;

    const request = new Request('http://localhost/api/crm/clientes');
    const response = await GET(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('organization_id');
  });

  it('creates a cliente on valid POST', async () => {
    const request = new Request('http://localhost/api/crm/clientes', {
      method: 'POST',
      body: JSON.stringify({
        razon_social: 'Nuevo Cliente',
        cuit_cuil: '20-12345678-9',
        tipo_cliente: 'posible_cliente',
      }),
    });

    const response = await POST(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('cliente-new');
    expect(mockParse).toHaveBeenCalled();
    expect(mockClienteAdd).toHaveBeenCalled();
  });
});
