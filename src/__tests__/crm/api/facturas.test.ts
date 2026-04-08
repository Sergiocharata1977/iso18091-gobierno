/** @jest-environment node */

const mockAuth = {
  role: 'admin',
  organizationId: 'org-1',
  uid: 'user-1',
  email: 'admin@test.com',
};

const mockSet = jest.fn();
const mockEmitAccountingEvent = jest.fn();

const facturaDocRef = {
  id: 'factura-1',
  set: mockSet,
};

const mockDb = {
  collection: jest.fn((name: string) => {
    if (name === 'crm_facturas') {
      return {
        doc: jest.fn(() => facturaDocRef),
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

import { POST } from '@/app/api/crm/facturas/route';

describe('API /crm/facturas', () => {
  const asNextRequest = (request: Request) => request as any;
  const emptyContext = { params: Promise.resolve({}) };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmitAccountingEvent.mockResolvedValue({
      entry_id: 'entry-1',
      outbox_status: 'processed',
      attempts: 1,
    });
  });

  it('crea la factura y emite el evento contable crm_factura', async () => {
    const request = new Request('http://localhost/api/crm/facturas', {
      method: 'POST',
      body: JSON.stringify({
        cliente_id: 'cliente-1',
        fecha: '2026-03-26',
        importe_neto: 1000,
        importe_iva: 210,
        descripcion: 'Factura marzo',
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
        operation_type: 'crm_factura',
        documento_id: 'factura-1',
        importe_total: 1210,
        importe_capital: 1000,
        importe_iva: 210,
      })
    );
    expect(json.data.accounting_posted).toBe(true);
    expect(json.data.accounting_entry_id).toBe('entry-1');
  });
});
