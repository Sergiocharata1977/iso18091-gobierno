/** @jest-environment node */

const mockAuth = {
  role: 'admin',
  organizationId: 'org-1',
  uid: 'user-1',
  email: 'admin@test.com',
};

const mockSet = jest.fn();
const mockEmitAccountingEvent = jest.fn();

const cobroDocRef = {
  id: 'cobro-1',
  set: mockSet,
};

const mockDb = {
  collection: jest.fn((name: string) => {
    if (name === 'crm_cobros') {
      return {
        doc: jest.fn(() => cobroDocRef),
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

jest.mock('@/lib/accounting/emitEvent', () => ({
  emitAccountingEvent: (payload: unknown) => mockEmitAccountingEvent(payload),
}));

import { POST } from '@/app/api/crm/cobros/route';

describe('API /crm/cobros', () => {
  const asNextRequest = (request: Request) => request as any;
  const emptyContext = { params: Promise.resolve({}) };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmitAccountingEvent.mockResolvedValue({
      entry_id: 'entry-2',
      outbox_status: 'processed',
      attempts: 1,
    });
  });

  it('crea el cobro y emite el evento contable crm_cobro', async () => {
    const request = new Request('http://localhost/api/crm/cobros', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: 'cliente-1',
        factura_id: 'factura-1',
        fecha: '2026-03-26',
        importe_total: 1210,
      }),
    });

    const response = await POST(asNextRequest(request), emptyContext);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockEmitAccountingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        plugin_id: 'crm',
        operation_type: 'crm_cobro',
        documento_id: 'cobro-1',
        importe_total: 1210,
      })
    );
    expect(json.data.accounting_posted).toBe(true);
    expect(json.data.accounting_entry_id).toBe('entry-2');
  });
});
