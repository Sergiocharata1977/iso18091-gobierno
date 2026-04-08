import { getAdminFirestore } from '@/lib/firebase/admin';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (
    args: any,
    context: { organizationId: string; userId: string; userName?: string }
  ) => Promise<any>;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'create_finding',
    description:
      'SOLO usar cuando el usuario EXPLÍCITAMENTE pide crear un hallazgo, registrar una no conformidad o reportar un problema. NO usar para responder preguntas generales sobre el sistema.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Título corto del hallazgo',
        },
        description: {
          type: 'string',
          description: 'Descripción detallada del hallazgo',
        },
        type: {
          type: 'string',
          enum: [
            'audit',
            'complaint',
            'process_deviation',
            'indicator',
            'risk',
            'opportunity',
            'other',
          ],
          description: 'Origen o tipo del hallazgo',
        },
        processName: {
          type: 'string',
          description: 'Nombre del proceso afectado (opcional)',
        },
      },
      required: ['name', 'description', 'type'],
    },
    execute: async (args, context) => {
      const db = getAdminFirestore();

      const { name, description, type, processName } = args;
      const { organizationId, userId, userName } = context;

      // Generar número simple (en producción usaría servicio de secuencias)
      const number = `HAL-${new Date().getFullYear()}-${Math.floor(
        Math.random() * 1000
      )
        .toString()
        .padStart(3, '0')}`;

      const findingData = {
        findingNumber: number,
        organizationId, // Asegurar multi-tenancy
        registration: {
          origin: type,
          name,
          description,
          processName: processName || 'General',
          source: 'chat',
          sourceId: 'chat-bot',
        },
        status: 'registrado',
        currentPhase: 'registered',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        createdByName: userName || 'IA Assistant',
        isActive: true,
      };

      const docRef = await db.collection('findings').add(findingData);

      return {
        success: true,
        message: `Hallazgo creado exitosamente con número ${number}`,
        id: docRef.id,
        findingNumber: number,
      };
    },
  },
  {
    name: 'get_current_time',
    description: 'Obtener la fecha y hora actual del servidor.',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async () => {
      return {
        date: new Date().toISOString(),
        locale: new Date().toLocaleString(),
      };
    },
  },
];

export const GROQ_TOOLS = TOOLS.map(t => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));
