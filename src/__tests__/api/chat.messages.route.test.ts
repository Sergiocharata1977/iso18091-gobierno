jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockTrackTelemetry = jest.fn();
jest.mock('@/ai/telemetry', () => ({
  aiTelemetry: {
    track: (...args: unknown[]) => mockTrackTelemetry(...args),
  },
}));

const mockLLMRouterChat = jest.fn();
jest.mock('@/ai/services/LLMRouter', () => ({
  LLMRouter: {
    chat: (...args: unknown[]) => mockLLMRouterChat(...args),
  },
}));

const mockToLegacyChatContext = jest.fn();
jest.mock('@/ai/services/ContextBuilder', () => ({
  ContextBuilder: {
    toLegacyChatContext: (...args: unknown[]) =>
      mockToLegacyChatContext(...args),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) =>
      handler(request, context, {
        uid: request.__uid || 'user-1',
        email: 'user@test.com',
        organizationId: request.__orgId || 'org-1',
        role: request.__role || 'admin',
        user: {
          id: request.__uid || 'user-1',
          email: 'user@test.com',
          rol: request.__role || 'admin',
          organization_id: request.__orgId || 'org-1',
          personnel_id: null,
          activo: true,
          status: 'active',
        },
      });
  },
}));

const mockChatGetSession = jest.fn();
const mockChatAddMessage = jest.fn();
const mockChatGetRecentMessages = jest.fn();
const mockChatGenerateTitle = jest.fn();
jest.mock('@/features/chat/services/ChatService', () => ({
  ChatService: {
    getSession: (...args: unknown[]) => mockChatGetSession(...args),
    addMessage: (...args: unknown[]) => mockChatAddMessage(...args),
    getRecentMessages: (...args: unknown[]) =>
      mockChatGetRecentMessages(...args),
    generateTitle: (...args: unknown[]) => mockChatGenerateTitle(...args),
  },
}));

const mockGetUnifiedContext = jest.fn();
const mockGenerateSystemPrompt = jest.fn();
jest.mock('@/features/chat/services/ContextService', () => ({
  ContextService: {
    getUnifiedContext: (...args: unknown[]) => mockGetUnifiedContext(...args),
    generateSystemPrompt: (...args: unknown[]) =>
      mockGenerateSystemPrompt(...args),
  },
}));

const mockGroqEnviarMensaje = jest.fn();
jest.mock('@/lib/groq/GroqService', () => ({
  GroqService: {
    enviarMensaje: (...args: unknown[]) => mockGroqEnviarMensaje(...args),
  },
}));

jest.mock('@/features/chat/tools/registry', () => ({
  TOOLS: [],
  GROQ_TOOLS: [],
}));

jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

const mockChatAdapterProcess = jest.fn();
jest.mock('@/services/ai-core/adapters/chatAdapter', () => ({
  ChatAdapter: {
    process: (...args: unknown[]) => mockChatAdapterProcess(...args),
  },
}));

import { POST } from '@/app/api/chat/messages/route';

describe('POST /api/chat/messages route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ENABLE_UNIFIED_AI_CHAT_CORE;

    mockChatGetSession.mockResolvedValue({
      id: 's1',
      userId: 'user-1',
      organizationId: 'org-1',
      messageCount: 0,
      title: 'Nueva conversacion',
    });

    mockChatGetRecentMessages.mockResolvedValue([]);
    mockGetUnifiedContext.mockResolvedValue({ meta: {}, org: {}, user: {} });
    mockToLegacyChatContext.mockReturnValue({
      organization: { id: 'org-1', name: 'Org Test' },
      user: { id: 'user-1', email: 'user@test.com', role: 'admin' },
    });
    mockGenerateSystemPrompt.mockReturnValue('SYSTEM PROMPT');

    mockChatAddMessage.mockImplementation(
      async (
        sessionId: string,
        organizationId: string,
        role: 'user' | 'assistant',
        content: string,
        inputType: string,
        metadata?: Record<string, unknown>
      ) => ({
        id: role === 'user' ? 'm-user' : 'm-assistant',
        sessionId,
        organizationId,
        role,
        content,
        inputType,
        metadata,
        createdAt: new Date(),
      })
    );
  });

  it('uses unified AI core as primary path when feature flag is enabled', async () => {
    process.env.ENABLE_UNIFIED_AI_CHAT_CORE = 'true';
    mockChatAdapterProcess.mockResolvedValue({
      traceId: 'trace-1',
      conversationId: 'conv-1',
      messages: [
        {
          role: 'user',
          content: 'Mostrame mis tareas pendientes',
        },
        {
          role: 'assistant',
          content:
            'Recibido por IA Core (MVP OLA 1): Mostrame mis tareas pendientes',
        },
      ],
      actions: [],
      uiCommands: [],
    });

    const response = await POST(
      {
        json: async () => ({
          sessionId: 's1',
          content: 'Mostrame mis tareas pendientes',
          mode: 'fast',
          clientMessageId: 'msg-1',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.unifiedCore).toBe(true);
    expect(body.provider).toBe('unified-ai-core');
    expect(mockChatAdapterProcess).toHaveBeenCalledTimes(1);
    expect(mockLLMRouterChat).not.toHaveBeenCalled();
    expect(mockGroqEnviarMensaje).not.toHaveBeenCalled();
  });

  it('uses LLMRouter in quality mode and stores enriched metadata', async () => {
    mockLLMRouterChat.mockResolvedValue({
      content: 'Esta es una respuesta valida y util para el usuario.',
      metadata: {
        provider: 'claude',
        model: 'claude-test-model',
        capability: 'chat_general',
        mode: 'quality',
        latencyMs: 42,
        fallbackUsed: false,
        attempts: [
          {
            provider: 'claude',
            model: 'claude-test-model',
            capability: 'chat_general',
            mode: 'quality',
            success: true,
            latencyMs: 42,
          },
        ],
      },
    });

    const response = await POST(
      {
        json: async () => ({
          sessionId: 's1',
          content: 'Analiza el proceso',
          mode: 'quality',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.capability).toBe('chat_quality');
    expect(mockLLMRouterChat).toHaveBeenCalledTimes(1);

    const assistantAddCall = mockChatAddMessage.mock.calls.find(
      (call: unknown[]) => call[2] === 'assistant'
    );
    expect(assistantAddCall).toBeTruthy();
    expect(assistantAddCall?.[5]).toMatchObject({
      provider: 'claude',
      model: 'claude-test-model',
      capability: 'chat_quality',
      routerCapability: 'chat_general',
      mode: 'quality',
      latencyMs: 42,
      fallbackUsed: false,
    });
  });

  it('preserves fast mode Groq path without invoking LLMRouter when no tool calls are needed', async () => {
    mockGroqEnviarMensaje.mockResolvedValue({
      role: 'assistant',
      content: 'Respuesta rapida valida para el usuario dentro del sistema.',
      tool_calls: [],
    });

    const response = await POST(
      {
        json: async () => ({
          sessionId: 's1',
          content: 'Como uso auditorias internas?',
          mode: 'fast',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provider).toBe('groq');
    expect(body.capability).toBe('chat_general');
    expect(mockGroqEnviarMensaje).toHaveBeenCalledTimes(1);
    expect(mockLLMRouterChat).not.toHaveBeenCalled();
  });

  it('rejects organizationId tampering in POST body', async () => {
    const response = await POST(
      {
        __orgId: 'org-1',
        json: async () => ({
          sessionId: 's1',
          content: 'Hola',
          mode: 'quality',
          organizationId: 'org-2',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/organizationId/i);
    expect(mockChatGetSession).not.toHaveBeenCalled();
  });

  it('accepts short conversational replies in quality mode without validation fallback', async () => {
    mockLLMRouterChat.mockResolvedValue({
      content: 'Si, claro. Te ayudo.',
      metadata: {
        provider: 'claude',
        model: 'claude-test-model',
        capability: 'chat_general',
        mode: 'quality',
        latencyMs: 30,
        fallbackUsed: false,
        attempts: [],
      },
    });

    const response = await POST(
      {
        json: async () => ({
          sessionId: 's1',
          content: 'Ahora me puedes responder?',
          mode: 'quality',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.assistantMessage.content).toBe('Si, claro. Te ayudo.');

    const assistantAddCall = mockChatAddMessage.mock.calls.find(
      (call: unknown[]) => call[2] === 'assistant'
    );
    expect(assistantAddCall?.[5]).toMatchObject({
      fallbackUsed: false,
    });
  });
});
