/** @jest-environment node */

const mockAuth = {
  role: 'admin',
  organizationId: 'org-1',
  uid: 'user-1',
};

const mockGetByOrganization = jest.fn();
const mockGetByOrganizacionCRM = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/api/withAuth', () => ({
  withAuth:
    (handler: any) =>
    async (request: Request, context: any = {}) =>
      handler(request, context, mockAuth),
}));

jest.mock('@/services/crm/ContactoCRMService', () => ({
  ContactoCRMService: {
    getByOrganization: (...args: any[]) => mockGetByOrganization(...args),
    getByOrganizacionCRM: (...args: any[]) => mockGetByOrganizacionCRM(...args),
    create: (...args: any[]) => mockCreate(...args),
  },
}));

import { GET, POST } from '@/app/api/crm/contactos/route';

describe('API /crm/contactos', () => {
  const asNextRequest = (request: Request) => request as any;
  const emptyContext = { params: Promise.resolve({}) };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.role = 'admin';
    mockAuth.organizationId = 'org-1';
  });

  it('returns success true and data array on valid GET', async () => {
    mockGetByOrganization.mockResolvedValue([
      { id: 'contacto-1', nombre: 'Juan', telefono: '5491111111111' },
    ]);

    const request = new Request('http://localhost/api/crm/contactos');
    const response = await GET(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(mockGetByOrganization).toHaveBeenCalledWith('org-1');
  });

  it('returns 400 when organization_id is missing', async () => {
    mockAuth.organizationId = undefined as any;

    const request = new Request('http://localhost/api/crm/contactos');
    const response = await GET(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('organization_id');
  });

  it('creates a contacto on valid POST', async () => {
    mockCreate.mockResolvedValue({
      id: 'contacto-new',
      nombre: 'Maria',
      telefono: '5491111111111',
    });

    const request = new Request('http://localhost/api/crm/contactos', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Maria',
        telefono: '5491111111111',
        email: 'maria@test.com',
      }),
    });

    const response = await POST(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('contacto-new');
    expect(mockCreate).toHaveBeenCalled();
  });
});
