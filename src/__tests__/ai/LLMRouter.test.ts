import { LLMRouter } from '@/ai/services/LLMRouter';
import { AIRouter } from '@/lib/ai/AIRouter';
import { ClaudeService } from '@/lib/claude/client';
import { GroqService } from '@/lib/groq/GroqService';

jest.mock('@/lib/groq/GroqService', () => ({
  GroqService: {
    enviarMensaje: jest.fn(),
    enviarMensajeStream: jest.fn(),
  },
}));

jest.mock('@/lib/claude/client', () => ({
  ClaudeService: {
    enviarMensaje: jest.fn(),
    getModel: jest.fn(() => 'claude-3-5-sonnet-20241022'),
  },
}));

describe('LLMRouter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GROQ_API_KEY: 'test-groq',
      ANTHROPIC_API_KEY: 'test-claude',
      NEXT_PUBLIC_CLAUDE_MODEL: 'claude-3-5-sonnet-20241022',
      AI_ROUTER_ENABLE_GROQ: 'true',
      AI_ROUTER_ENABLE_CLAUDE: 'true',
      AI_ROUTER_ENABLE_FALLBACK: 'true',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('routes fast mode to groq for chat_general and returns metadata', async () => {
    (GroqService.enviarMensaje as jest.Mock).mockResolvedValue({
      role: 'assistant',
      content: 'respuesta groq',
      usage: { input: 12, output: 8, total: 20 },
    });

    const result = await LLMRouter.chat({
      message: 'Hola',
      mode: 'fast',
    });

    expect(GroqService.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(ClaudeService.enviarMensaje).not.toHaveBeenCalled();
    expect(result.content).toBe('respuesta groq');
    expect(result.metadata.provider).toBe('groq');
    expect(result.metadata.provider_key).toBe('groq_llama_70b');
    expect(result.metadata.mode).toBe('fast');
    expect(result.metadata.capability).toBe('chat_general');
    expect(result.metadata.tokens).toEqual({ input: 12, output: 8, total: 20 });
    expect(result.metadata.fallbackUsed).toBe(false);
  });

  it('falls back to groq when claude fails in quality mode', async () => {
    (ClaudeService.enviarMensaje as jest.Mock).mockRejectedValue(
      new Error('Claude down')
    );
    (GroqService.enviarMensaje as jest.Mock).mockResolvedValue({
      role: 'assistant',
      content: 'fallback groq',
      usage: { input: 4, output: 6, total: 10 },
    });

    const result = await LLMRouter.chat({
      message: 'Analiza esto',
      mode: 'quality',
    });

    expect(ClaudeService.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(GroqService.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(result.content).toBe('fallback groq');
    expect(result.metadata.provider).toBe('groq');
    expect(result.metadata.provider_key).toBe('groq_llama_70b');
    expect(result.metadata.capability).toBe('chat_general');
    expect(result.metadata.tokens).toEqual({ input: 4, output: 6, total: 10 });
    expect(result.metadata.fallbackUsed).toBe(true);
    expect(result.metadata.attempts).toHaveLength(2);
    expect(result.metadata.attempts[0].success).toBe(false);
    expect(result.metadata.attempts[1].success).toBe(true);
  });

  it('uses explicit audit_eval capability with claude as primary', async () => {
    (ClaudeService.enviarMensaje as jest.Mock).mockResolvedValue({
      content: 'audit ok',
      usage: { input: 1, output: 1 },
      tiempo_respuesta_ms: 12,
    });

    const result = await LLMRouter.chat({
      message: 'Evalua auditoria',
      capability: 'audit_eval',
    });

    expect(ClaudeService.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(result.metadata.provider).toBe('claude');
    expect(result.metadata.provider_key).toBe('claude_sonnet_4_6');
    expect(result.metadata.capability).toBe('audit_eval');
    expect(result.metadata.tokens).toEqual({ input: 1, output: 1, total: 2 });
  });

  it('keeps AIRouter compatibility for chat and provider info', async () => {
    (GroqService.enviarMensaje as jest.Mock).mockResolvedValue({
      role: 'assistant',
      content: 'ok',
    });

    const response = await AIRouter.chat('Ping', [], undefined, 'fast');
    const info = AIRouter.getProviderInfo('fast');

    expect(response).toBe('ok');
    expect(info.provider).toBe('groq');
    expect(typeof AIRouter.getAvailableProviders).toBe('function');
  });

  it('filters candidates by allowed provider keys from plan', async () => {
    (ClaudeService.enviarMensaje as jest.Mock).mockResolvedValue({
      content: 'claude allowed',
      usage: { input: 2, output: 3 },
      tiempo_respuesta_ms: 10,
    });

    const result = await LLMRouter.chat({
      message: 'Necesito mas calidad',
      mode: 'quality',
      allowedProviderKeys: ['claude_sonnet_4_6'],
    });

    expect(ClaudeService.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(GroqService.enviarMensaje).not.toHaveBeenCalled();
    expect(result.metadata.provider_key).toBe('claude_sonnet_4_6');
  });
});
