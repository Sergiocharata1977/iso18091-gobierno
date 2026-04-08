jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) =>
      handler(request, context, {
        uid: request.__uid || 'user-1',
        email: 'user@test.com',
        organizationId: request.__orgId || 'org-1',
        role: request.__role || 'operario',
        user: {
          id: request.__uid || 'user-1',
          email: 'user@test.com',
          rol: request.__role || 'operario',
          organization_id: request.__orgId || 'org-1',
          activo: true,
          status: 'active',
        },
      });
  },
}));

const mockConversationGet = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn((name: string) => {
      if (name !== 'ai_conversations') {
        throw new Error(`Unexpected collection ${name}`);
      }
      return {
        doc: jest.fn(() => ({
          get: (...args: unknown[]) => mockConversationGet(...args),
        })),
      };
    }),
  })),
}));

const mockGetHistory = jest.fn();
jest.mock('@/services/ai-core/conversationStore', () => ({
  AIConversationStore: {
    getHistory: (...args: unknown[]) => mockGetHistory(...args),
  },
}));

import { GET } from '@/app/api/ai/conversations/[id]/history/route';

describe('GET /api/ai/conversations/[id]/history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHistory.mockResolvedValue([
      {
        id: 'm1',
        role: 'user',
        channel: 'chat',
        content: 'Hola',
        timestamp: '2026-02-25T10:00:00.000Z',
      },
    ]);
  });

  it('returns history for conversation owner', async () => {
    mockConversationGet.mockResolvedValue({
      exists: true,
      id: 'conv-1',
      data: () => ({
        userId: 'user-1',
        organizationId: 'org-1',
        channels: ['chat'],
        status: 'active',
      }),
    });

    const response = await GET(
      {
        __uid: 'user-1',
        __orgId: 'org-1',
        __role: 'operario',
        url: 'http://localhost/api/ai/conversations/conv-1/history?limit=25',
      } as any,
      { params: Promise.resolve({ id: 'conv-1' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.conversation).toMatchObject({
      id: 'conv-1',
      userId: 'user-1',
      organizationId: 'org-1',
      channels: ['chat'],
      status: 'active',
    });
    expect(body.total).toBe(1);
    expect(mockGetHistory).toHaveBeenCalledWith('conv-1', 25);
  });

  it('blocks cross-organization access even for elevated roles', async () => {
    mockConversationGet.mockResolvedValue({
      exists: true,
      id: 'conv-2',
      data: () => ({
        userId: 'user-2',
        organizationId: 'org-2',
        channels: ['chat', 'whatsapp'],
        status: 'active',
      }),
    });

    const response = await GET(
      {
        __uid: 'admin-1',
        __orgId: 'org-1',
        __role: 'admin',
        url: 'http://localhost/api/ai/conversations/conv-2/history',
      } as any,
      { params: Promise.resolve({ id: 'conv-2' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/alcance de la organizacion/i);
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it('returns 404 when conversation does not exist', async () => {
    mockConversationGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    const response = await GET(
      {
        __uid: 'user-1',
        __orgId: 'org-1',
        __role: 'operario',
        url: 'http://localhost/api/ai/conversations/missing/history',
      } as any,
      { params: Promise.resolve({ id: 'missing' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toMatch(/no encontrada/i);
    expect(mockGetHistory).not.toHaveBeenCalled();
  });
});
