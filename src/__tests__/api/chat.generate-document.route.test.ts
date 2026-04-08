jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockLLMChat = jest.fn();

jest.mock('@/ai/services/LLMRouter', () => ({
  LLMRouter: {
    chat: (...args: unknown[]) => mockLLMChat(...args),
  },
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any, options?: { roles?: string[] }) => {
    return (request: any, context: any = { params: Promise.resolve({}) }) => {
      if (request.__unauth) {
        return {
          status: 401,
          json: async () => ({ error: 'No autorizado' }),
        };
      }

      const role = request.__role || 'admin';
      if (options?.roles?.length && !options.roles.includes(role)) {
        return {
          status: 403,
          json: async () => ({ error: 'Sin permisos' }),
        };
      }

      const organizationId = request.__orgId || 'org-1';
      return handler(request, context, {
        uid: request.__uid || 'user-1',
        email: 'user@test.com',
        organizationId,
        role,
        user: {
          id: request.__uid || 'user-1',
          email: 'user@test.com',
          rol: role,
          organization_id: organizationId,
          personnel_id: null,
          activo: true,
          status: 'active',
        },
      });
    };
  },
}));

import { POST } from '@/app/api/chat/generate-document/route';

const plannerJson = {
  contract_id: 'iso_document_generation_v1',
  version: 'v1',
  idioma: 'es',
  nivel_madurez: 'B3',
  confianza_modelo: 0.91,
  tipo_documento: 'procedimiento',
  titulo_propuesto: 'Procedimiento de Control Documental',
  objetivo_documento:
    'Definir controles para elaborar, aprobar y actualizar documentos del SGC.',
  audiencia: 'Personal interno y auditores',
  tono: 'formal',
  clausulas_iso_relacionadas: ['7.5'],
  requisitos_entrada: [
    {
      campo: 'responsable',
      descripcion: 'Cargo responsable del control documental',
      obligatorio: true,
      ejemplo: 'Coordinador de Calidad',
    },
  ],
  estructura: [
    {
      orden: 1,
      titulo: 'OBJETIVO',
      objetivo_seccion: 'Definir el proposito del procedimiento',
      puntos_clave: ['Finalidad', 'Criterio de aplicacion'],
      evidencia_sugerida: ['Documento aprobado'],
      longitud_sugerida_palabras: 80,
    },
    {
      orden: 2,
      titulo: 'ALCANCE',
      objetivo_seccion: 'Definir alcance y exclusiones',
      puntos_clave: ['Areas incluidas', 'Exclusiones'],
      evidencia_sugerida: ['Listado de procesos'],
      longitud_sugerida_palabras: 90,
    },
    {
      orden: 3,
      titulo: 'DESARROLLO',
      objetivo_seccion: 'Describir pasos operativos',
      puntos_clave: ['Creacion', 'Revision', 'Aprobacion'],
      evidencia_sugerida: ['Registros de cambio'],
      longitud_sugerida_palabras: 250,
    },
  ],
  criterios_calidad: ['Claridad', 'Trazabilidad'],
  notas_redaccion: 'Usar verbos de accion y responsabilidades explicitas.',
  salida_final_recomendada: 'texto_documento',
};

describe('POST /api/chat/generate-document', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna success con metadata extendida y contenido sanitizado', async () => {
    mockLLMChat
      .mockResolvedValueOnce({
        content: JSON.stringify(plannerJson),
        metadata: {
          provider: 'claude',
          model: 'claude-test',
          capability: 'doc_gen',
          latencyMs: 25,
          fallbackUsed: false,
          attempts: [
            {
              provider: 'claude',
              model: 'claude-test',
              capability: 'doc_gen',
              success: true,
              latencyMs: 25,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        content:
          'Rol: Arquitecto documental\nPROCEDIMIENTO DE CONTROL DE DOCUMENTOS\n\nObjetivo: Establecer el control de documentos del SGC.\nAlcance: Aplica a todos los procesos de la organizacion.\nResponsabilidades: Cada responsable de proceso mantiene versiones vigentes.\nDesarrollo: Se crea, revisa, aprueba y distribuye segun control definido.\nRegistros: Lista maestra de documentos y control de cambios.',
        metadata: {
          provider: 'claude',
          model: 'claude-test',
          capability: 'doc_gen',
          latencyMs: 60,
          fallbackUsed: false,
          attempts: [
            {
              provider: 'claude',
              model: 'claude-test',
              capability: 'doc_gen',
              success: true,
              latencyMs: 60,
            },
          ],
        },
      });

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-123',
        json: async () => ({
          prompt:
            'Genera procedimiento de control de documentos para mi empresa',
          templateId: 'procedimiento-control-documentos',
          templateName: 'Procedimiento de Control de Documentos',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.content).toContain('PROCEDIMIENTO DE CONTROL DE DOCUMENTOS');
    expect(body.content).not.toContain('Rol: Arquitecto documental');
    expect(body.provider).toBe('claude');
    expect(body.model).toBe('claude-test');
    expect(body.promptVersion).toBe('iso_document_generation_v1');
    expect(body.prompt_version).toBe('v1');
    expect(body.metadata.prompt_version).toBe('v1');
    expect(body.metadata.prompt_contract_id).toBe('iso_document_generation_v1');
    expect(body.metadata.capability).toBe('doc_gen');
    expect(body.metadata.generation).toBeDefined();
    expect(body.metadata.planner.parseOk).toBe(true);
    expect(mockLLMChat).toHaveBeenCalledTimes(2);
    expect(mockLLMChat).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ capability: 'doc_gen', mode: 'quality' })
    );
    expect(mockLLMChat).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ capability: 'doc_gen', mode: 'quality' })
    );
  });

  it('mantiene fallback funcional y expone metadata del fallback', async () => {
    mockLLMChat
      .mockResolvedValueOnce({
        content: JSON.stringify(plannerJson),
        metadata: {
          provider: 'claude',
          model: 'claude-test',
          capability: 'doc_gen',
          latencyMs: 20,
          fallbackUsed: false,
          attempts: [],
        },
      })
      .mockResolvedValueOnce({
        content:
          'Documento final de procedimiento con texto profesional suficiente para pasar validacion de formato y uso operativo.',
        metadata: {
          provider: 'groq',
          model: 'llama-test',
          capability: 'doc_gen',
          latencyMs: 45,
          fallbackUsed: true,
          attempts: [
            {
              provider: 'claude',
              model: 'claude-test',
              capability: 'doc_gen',
              success: false,
              latencyMs: 15,
              error: 'timeout',
            },
            {
              provider: 'groq',
              model: 'llama-test',
              capability: 'doc_gen',
              success: true,
              latencyMs: 45,
            },
          ],
        },
      });

    const response = await POST(
      {
        __role: 'jefe',
        __orgId: 'org-1',
        json: async () => ({
          prompt: 'Genera documento de prueba',
          templateName: 'Procedimiento de Auditorias Internas',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.provider).toBe('groq');
    expect(body.metadata.fallbackUsed).toBe(true);
    expect(body.metadata.attempts).toHaveLength(2);
    expect(body.metadata.attempts[0].success).toBe(false);
    expect(body.metadata.attempts[1].success).toBe(true);
  });

  it('retorna 500 cuando falla la generacion final', async () => {
    mockLLMChat
      .mockRejectedValueOnce(new Error('planner unavailable'))
      .mockRejectedValueOnce(new Error('all providers down'));

    const response = await POST(
      {
        __role: 'admin',
        __orgId: 'org-1',
        json: async () => ({
          prompt: 'Genera documento',
          templateId: 'politica-calidad',
        }),
      } as any,
      { params: Promise.resolve({}) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Error generating document');
    expect(body.message).toContain('all providers down');
    expect(mockLLMChat).toHaveBeenCalledTimes(2);
  });
});
