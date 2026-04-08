const mockGetOrCreateConversation = jest.fn();
const mockGetHistory = jest.fn();
const mockAppendMessage = jest.fn();
const mockDetectVoiceIntent = jest.fn();
const mockLLMRouterChat = jest.fn();
const mockGetUnifiedContext = jest.fn();
const mockGetExternalChannelContext = jest.fn();
const mockGenerateSystemPrompt = jest.fn();
const mockToLegacyChatContext = jest.fn();
const mockBuildDocumentationContext = jest.fn();
const mockGetOrgPlan = jest.fn();
const mockCheckBudget = jest.fn();
const mockRegistrarUsage = jest.fn();

jest.mock('@/services/ai-core/conversationStore', () => ({
  AIConversationStore: {
    getOrCreateConversation: (...args: unknown[]) =>
      mockGetOrCreateConversation(...args),
    getHistory: (...args: unknown[]) => mockGetHistory(...args),
    appendMessage: (...args: unknown[]) => mockAppendMessage(...args),
  },
}));

jest.mock('@/services/ai-core/voiceIntentDetector', () => ({
  detectVoiceIntent: (...args: unknown[]) => mockDetectVoiceIntent(...args),
}));

jest.mock('@/ai/services/LLMRouter', () => ({
  LLMRouter: {
    chat: (...args: unknown[]) => mockLLMRouterChat(...args),
  },
}));

jest.mock('@/features/chat/services/ContextService', () => ({
  ContextService: {
    getUnifiedContext: (...args: unknown[]) => mockGetUnifiedContext(...args),
    getExternalChannelContext: (...args: unknown[]) =>
      mockGetExternalChannelContext(...args),
    generateSystemPrompt: (...args: unknown[]) =>
      mockGenerateSystemPrompt(...args),
  },
}));

jest.mock('@/services/ai-core/AIPricingService', () => ({
  AIPricingService: {
    getOrgPlan: (...args: unknown[]) => mockGetOrgPlan(...args),
    checkBudget: (...args: unknown[]) => mockCheckBudget(...args),
  },
}));

jest.mock('@/services/tracking/UsageTrackingService', () => ({
  UsageTrackingService: {
    registrar: (...args: unknown[]) => mockRegistrarUsage(...args),
  },
}));

jest.mock('@/ai/services/ContextBuilder', () => ({
  ContextBuilder: {
    toLegacyChatContext: (...args: unknown[]) => mockToLegacyChatContext(...args),
    buildDocumentationContext: (...args: unknown[]) =>
      mockBuildDocumentationContext(...args),
  },
}));

import { UnifiedConverseService } from '@/services/ai-core/UnifiedConverseService';

describe('UnifiedConverseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'trace-1',
      },
      configurable: true,
    });

    mockGetOrCreateConversation.mockResolvedValue({ id: 'session-1' });
    mockGetHistory.mockResolvedValue([]);
    mockDetectVoiceIntent.mockResolvedValue(undefined);
    mockGetUnifiedContext.mockResolvedValue({ org: { name: 'Org Test' } });
    mockToLegacyChatContext.mockReturnValue({ orgName: 'Org Test' });
    mockGenerateSystemPrompt.mockReturnValue('system prompt');
    mockBuildDocumentationContext.mockReturnValue('');
    mockGetOrgPlan.mockResolvedValue({
      id: 'starter',
      allowed_provider_keys: ['groq_llama_70b'],
    });
    mockCheckBudget.mockResolvedValue({
      allowed: true,
      warning: false,
      remaining_usd: 5,
      plan_id: 'starter',
    });
    mockRegistrarUsage.mockResolvedValue(undefined);
    mockAppendMessage
      .mockResolvedValueOnce({ id: 'user-msg-1', role: 'user', content: 'Hola' })
      .mockResolvedValueOnce({
        id: 'assistant-msg-1',
        role: 'assistant',
        content: 'Respuesta',
      });
  });

  it('uses real token totals from LLM metadata when available', async () => {
    mockLLMRouterChat.mockResolvedValue({
      content: 'Respuesta',
      metadata: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        provider_key: 'groq_llama_70b',
        capability: 'chat_general',
        mode: 'fast',
        fallbackUsed: false,
        attempts: [],
        tokens: {
          input: 120,
          output: 45,
          total: 165,
        },
      },
    });

    const result = await UnifiedConverseService.converse({
      channel: 'chat',
      message: 'Hola',
      sessionId: 'session-1',
      organizationId: 'org-1',
      userId: 'user-1',
      userRole: 'admin',
    });

    expect(result.tokensUsed).toBe(165);
    expect(result.metadata.tokens).toEqual({
      input: 120,
      output: 45,
      total: 165,
    });
    expect(mockLLMRouterChat).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedProviderKeys: ['groq_llama_70b'],
      })
    );
    expect(mockRegistrarUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        organizationId: 'org-1',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        providerKey: 'groq_llama_70b',
        tipoOperacion: 'chat',
        tokens: {
          input: 120,
          output: 45,
        },
      })
    );
  });

  it('throws when plan budget is exhausted', async () => {
    mockCheckBudget.mockResolvedValue({
      allowed: false,
      warning: true,
      remaining_usd: 0,
      plan_id: 'starter',
    });

    await expect(
      UnifiedConverseService.converse({
        channel: 'chat',
        message: 'Hola',
        sessionId: 'session-1',
        organizationId: 'org-1',
        userId: 'user-1',
        userRole: 'admin',
      })
    ).rejects.toMatchObject({
      name: 'AIBudgetExceededError',
      code: 'AI_BUDGET_EXCEEDED',
    });

    expect(mockLLMRouterChat).not.toHaveBeenCalled();
    expect(mockRegistrarUsage).not.toHaveBeenCalled();
  });
});
