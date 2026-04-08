/** @jest-environment node */

const mockProcessWebhook = jest.fn();

jest.mock('@/services/billing/OrganizationBillingWebhookService', () => ({
  processOrganizationBillingWebhook: (...args: unknown[]) =>
    mockProcessWebhook(...args),
}));

import { GET, POST } from '@/app/api/billing/mobbex/webhook/route';

const makeWebhookRequest = (
  body: string,
  headers: Record<string, string> = {}
) => {
  return new Request('http://localhost/api/billing/mobbex/webhook', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }) as unknown as Parameters<typeof POST>[0];
};

const VALID_BODY = JSON.stringify({
  type: 'subscription:active',
  data: {
    payment: { id: 'pay-1', status: { code: '200', text: 'Aprobado' }, total: 1000, reference: 'orgsub_org-1_123' },
    subscriber: { uid: 'user-1', email: 'owner@test.com' },
  },
});

describe('POST /api/billing/mobbex/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when x-mobbex-signature header is missing', async () => {
    const req = makeWebhookRequest(VALID_BODY);
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.processed).toBe(false);
    expect(body.error).toMatch(/signature/i);
    expect(mockProcessWebhook).not.toHaveBeenCalled();
  });

  it('returns 401 when processWebhook reports invalid signature', async () => {
    mockProcessWebhook.mockResolvedValue({
      received: true,
      processed: false,
      error: 'Invalid signature',
    });

    const req = makeWebhookRequest(VALID_BODY, { 'x-mobbex-signature': 'bad-sig' });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns 200 on successful processing', async () => {
    mockProcessWebhook.mockResolvedValue({
      received: true,
      processed: true,
      organizationId: 'org-1',
      ownerUserId: 'user-1',
      status: 'active',
      signatureValid: true,
      replayKey: 'key-abc',
    });

    const req = makeWebhookRequest(VALID_BODY, { 'x-mobbex-signature': 'valid-sig' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(true);
    expect(body.organizationId).toBe('org-1');
  });

  it('returns 200 for duplicate webhook (idempotencia)', async () => {
    mockProcessWebhook.mockResolvedValue({
      received: true,
      processed: true,
      duplicate: true,
      replayKey: 'key-abc',
    });

    const req = makeWebhookRequest(VALID_BODY, { 'x-mobbex-signature': 'valid-sig' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
  });

  it('returns 200 cuando organizationId no se encontro en la referencia (warning sin error)', async () => {
    mockProcessWebhook.mockResolvedValue({
      received: true,
      processed: false,
      warning: 'organizationId not found',
    });

    const req = makeWebhookRequest(VALID_BODY, { 'x-mobbex-signature': 'valid-sig' });
    const res = await POST(req);

    // warning sin error => pasa, el webhook se acepto aunque no se proceso del todo
    expect(res.status).toBe(200);
  });

  it('returns 400 when processing returns an unexpected error', async () => {
    mockProcessWebhook.mockResolvedValue({
      received: true,
      processed: false,
      error: 'Firestore unavailable',
    });

    const req = makeWebhookRequest(VALID_BODY, { 'x-mobbex-signature': 'valid-sig' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Firestore unavailable');
  });

  it('llama a processOrganizationBillingWebhook con rawBody y signature', async () => {
    mockProcessWebhook.mockResolvedValue({
      received: true,
      processed: true,
      organizationId: 'org-1',
    });

    const req = makeWebhookRequest(VALID_BODY, { 'x-mobbex-signature': 'sig-xyz' });
    await POST(req);

    expect(mockProcessWebhook).toHaveBeenCalledWith(VALID_BODY, 'sig-xyz');
  });

  it('acepta x-signature como header alternativo', async () => {
    mockProcessWebhook.mockResolvedValue({
      received: true,
      processed: true,
      organizationId: 'org-1',
    });

    const req = makeWebhookRequest(VALID_BODY, { 'x-signature': 'alt-sig' });
    await POST(req);

    expect(mockProcessWebhook).toHaveBeenCalledWith(VALID_BODY, 'alt-sig');
  });
});

describe('GET /api/billing/mobbex/webhook', () => {
  it('returns service status', async () => {
    const req = new Request('http://localhost/api/billing/mobbex/webhook', {
      method: 'GET',
    }) as unknown as Parameters<typeof GET>[0];

    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.service).toBe('mobbex-webhook');
    expect(body.status).toBe('active');
    expect(body.timestamp).toBeDefined();
  });
});
