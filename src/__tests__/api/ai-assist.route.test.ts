jest.mock('next/server', () => ({
  NextResponse: {
    json: (
      body: unknown,
      init?: { status?: number; headers?: Record<string, string> }
    ) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) => {
      if (request.__unauth) {
        return {
          status: 401,
          json: async () => ({ error: 'No autorizado' }),
        };
      }

      const organizationId = Object.prototype.hasOwnProperty.call(
        request,
        '__orgId'
      )
        ? request.__orgId
        : 'org-auth';

      return handler(request, context, {
        uid: 'user-1',
        email: 'user@test.com',
        organizationId,
        role: 'admin',
        user: {
          id: 'user-1',
          email: 'user@test.com',
          rol: 'admin',
          organization_id: organizationId || null,
          personnel_id: null,
          activo: true,
          status: 'active',
        },
      });
    };
  },
}));

jest.mock('@/lib/ai/implementationContext', () => ({
  getImplementationContext: jest.fn(),
}));

jest.mock('@/lib/ai/systemPrompt', () => ({
  buildSystemPrompt: jest.fn(() => 'SYSTEM_PROMPT'),
}));

jest.mock('@/ai/services/LLMRouter', () => ({
  LLMRouter: {
    chat: jest.fn(),
  },
}));

jest.mock('@/ai/utils/structuredOutputParser', () => ({
  parseStructuredOutputByContract: jest.fn(),
}));

import { POST } from '@/app/api/ai/assist/route';
import { LLMRouter } from '@/ai/services/LLMRouter';
import { parseStructuredOutputByContract } from '@/ai/utils/structuredOutputParser';
import { getImplementationContext } from '@/lib/ai/implementationContext';

const mockLLMChat = LLMRouter.chat as jest.Mock;
const mockParseStructured = parseStructuredOutputByContract as jest.Mock;
const mockGetImplementationContext = getImplementationContext as jest.Mock;

function makeRequest(body: unknown, extra: Record<string, unknown> = {}) {
  return {
    json: async () => body,
    ...extra,
  } as any;
}

const routeContext = { params: Promise.resolve({}) } as any;

describe('POST /api/ai/assist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetImplementationContext.mockResolvedValue({
      organization_id: 'org-auth',
      organization_name: 'Org Test',
      rubro: 'Servicios',
      implementation_stage: 3,
      maturity_level: 45,
      has_policy: true,
      has_objectives: true,
      has_process_map: true,
      existing_processes: [],
      objectives: [],
      can_suggest_processes: true,
      can_suggest_audits: false,
      can_suggest_documents: true,
      has_personnel: true,
      personnel_count: 5,
      last_updated: new Date('2026-02-23T00:00:00Z'),
      iso_status_summary: {
        planning: 80,
        hr: 60,
        processes: 50,
        documents: 40,
        quality: 30,
        improvements: 20,
        global_score: 47,
        critical_gaps: ['Mejoras'],
      },
    });
    mockParseStructured.mockReturnValue({
      ok: false,
      code: 'invalid_json',
      message: 'No JSON',
      rawText: 'texto',
      jsonText: 'texto',
    });
    (global as any).fetch = jest.fn();
  });

  it('elimina dependencia de /api/chat y usa LLMRouter con contrato estructurado cuando aplica', async () => {
    const rawJson =
      '{"contract_id":"iso_document_generation_v1","version":"v1"}';

    mockLLMChat.mockResolvedValue({
      content: rawJson,
      metadata: {
        provider: 'claude',
        model: 'claude-test',
        capability: 'doc_gen',
        mode: 'quality',
        latencyMs: 123,
        fallbackUsed: false,
        attempts: [],
      },
    });

    mockParseStructured.mockReturnValue({
      ok: true,
      data: { contract_id: 'iso_document_generation_v1', version: 'v1' },
      rawText: rawJson,
      jsonText: rawJson,
    });

    const response = await POST(
      makeRequest({
        context: {
          modulo: 'documentos',
          tipo: 'procedimiento',
          datos: { nombre: 'Control documental' },
        },
      }),
      routeContext
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(mockLLMChat).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'doc_gen',
        mode: 'quality',
      })
    );
    expect((global as any).fetch).not.toHaveBeenCalled();
    expect(body.success).toBe(true);
    expect(body.content).toBe(rawJson);
    expect(body.responseFormat).toBe('json');
    expect(body.structuredData).toEqual({
      contract_id: 'iso_document_generation_v1',
      version: 'v1',
    });
    expect(body.context.organizationId).toBe('org-auth');
    expect(body.routing.capability).toBe('doc_gen');
  });

  it('devuelve 503 cuando LLMRouter falla', async () => {
    mockLLMChat.mockRejectedValue(new Error('provider down'));

    const response = await POST(
      makeRequest({
        context: {
          modulo: 'rrhh',
          tipo: 'competencias',
        },
      }),
      routeContext
    );

    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.error).toBe('El asistente no pudo procesar tu solicitud');
  });

  it('devuelve 504 en timeout del LLM', async () => {
    const timeoutError = new Error('LLM request timeout') as Error & {
      code?: string;
    };
    timeoutError.code = 'LLM_TIMEOUT';
    mockLLMChat.mockRejectedValue(timeoutError);

    const response = await POST(
      makeRequest({
        context: {
          modulo: 'rrhh',
          tipo: 'competencias',
        },
      }),
      routeContext
    );

    const body = await response.json();
    expect(response.status).toBe(504);
    expect(body.error).toBe('Tiempo de espera agotado');
  });

  it('mantiene comportamiento auth via withAuth', async () => {
    const response = await POST(
      makeRequest({ context: { modulo: 'x', tipo: 'y' } }, { __unauth: true }),
      routeContext
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe('No autorizado');
  });

  it('requiere organizationId desde auth o body', async () => {
    const response = await POST(
      makeRequest(
        {
          context: { modulo: 'rrhh', tipo: 'competencias' },
        },
        { __orgId: '' }
      ),
      routeContext
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe('Falta organizationId');
  });

  it('prioriza organizationId del auth y no acepta tampering por body', async () => {
    mockLLMChat.mockResolvedValue({
      content: 'Texto legacy controlado',
      metadata: {
        provider: 'groq',
        model: 'llama-test',
        capability: 'chat_general',
        mode: 'fast',
        latencyMs: 10,
        fallbackUsed: false,
        attempts: [],
      },
    });

    const response = await POST(
      makeRequest({
        context: {
          modulo: 'rrhh',
          tipo: 'competencias',
          organizationId: 'org-body-tampered',
        },
      }),
      routeContext
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.context.organizationId).toBe('org-auth');
    expect(body.routing.provider).toBe('groq');
    expect(body.routing.model).toBe('llama-test');
    expect(body.routing.capability).toBeDefined();
  });
});
