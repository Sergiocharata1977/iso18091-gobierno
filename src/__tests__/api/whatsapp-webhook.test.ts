/** @jest-environment node */

import crypto from 'crypto';

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/services/ai-core/adapters/whatsappAdapter', () => ({
  WhatsAppAdapter: {
    processIncoming: jest.fn(),
  },
}));

jest.mock('@/services/whatsapp', () => ({
  handleIncomingMessage: jest.fn(),
  handleStatusUpdate: jest.fn(),
}));

jest.mock('@/services/whatsapp/TwilioClient', () => ({
  emptyTwiMLResponse: jest.fn(() => '<Response />'),
  validateWebhookSignature: jest.fn(() => true),
}));

import { POST } from '@/app/api/whatsapp/webhook/route';

describe('API /whatsapp/webhook', () => {
  const asNextRequest = (request: Request) =>
    request as unknown as Parameters<typeof POST>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WHATSAPP_APP_SECRET = 'test-app-secret';
  });

  it('rejects requests without a valid signature', async () => {
    const request = new Request('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      body: JSON.stringify({ object: 'whatsapp_business_account' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(asNextRequest(request));

    expect(response.status).toBe(401);
  });

  it('rejects requests with an invalid Meta signature', async () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account' });
    const request = new Request('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=invalid',
      },
    });

    const response = await POST(asNextRequest(request));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Invalid signature');
  });

  it('accepts requests with a valid Meta signature', async () => {
    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [],
    });
    const signature =
      'sha256=' +
      crypto
        .createHmac('sha256', process.env.WHATSAPP_APP_SECRET as string)
        .update(body)
        .digest('hex');

    const request = new Request('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
      },
    });

    const response = await POST(asNextRequest(request));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
