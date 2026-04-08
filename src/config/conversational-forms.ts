import { ConversationalFormDefinition } from '@/types/forms';

export const CONVERSATIONAL_FORMS: Record<
  string,
  ConversationalFormDefinition
> = {
  'no-conformidad': {
    id: 'no-conformidad',
    title: 'Reporte de No Conformidad',
    description:
      'Reportar un incumplimiento de un requisito del sistema de gestión.',
    collectionName: 'hallazgos',
    systemPrompt: `Eres un experto auditor de calidad ISO 9001. Tu objetivo es ayudar al usuario a reportar una No Conformidad de manera clara y completa.
    Debes guiar la conversación para obtener todos los datos necesarios.
    Sé amable pero profesional. Si el usuario da una respuesta vaga, pide aclaraciones.
    Al final, resume la información y pide confirmación.`,
    fields: [
      {
        id: 'titulo',
        label: 'Título del Hallazgo',
        type: 'text',
        required: true,
        description: 'Un título corto y descriptivo del problema.',
        placeholder: 'Ej: Producto fuera de especificaciones en línea 2',
      },
      {
        id: 'descripcion',
        label: 'Descripción Detallada',
        type: 'textarea',
        required: true,
        description:
          'Explica qué pasó, dónde y cuándo. Incluye evidencia si es posible.',
      },
      {
        id: 'proceso',
        label: 'Proceso Afectado',
        type: 'select',
        required: true,
        description: 'El proceso donde ocurrió la no conformidad.',
        options: [
          'Producción',
          'Calidad',
          'Mantenimiento',
          'Compras',
          'Ventas',
          'Recursos Humanos',
          'Dirección',
        ],
      },
      {
        id: 'fecha_deteccion',
        label: 'Fecha de Detección',
        type: 'date',
        required: true,
        description: '¿Cuándo se detectó el problema?',
      },
      {
        id: 'gravedad',
        label: 'Gravedad',
        type: 'select',
        required: true,
        description: 'Impacto del problema en el sistema o el cliente.',
        options: ['Baja', 'Media', 'Alta', 'Crítica'],
      },
    ],
  },
  auditoria: {
    id: 'auditoria',
    title: 'Programar Auditoría',
    description: 'Planificar una nueva auditoría interna.',
    collectionName: 'auditorias',
    systemPrompt: `Eres un coordinador de auditorías ISO 9001. Ayuda al usuario a programar una nueva auditoría.
    Asegúrate de definir claramente el alcance y los objetivos.`,
    fields: [
      {
        id: 'proceso',
        label: 'Proceso a Auditar',
        type: 'select',
        required: true,
        options: [
          'Producción',
          'Calidad',
          'Mantenimiento',
          'Compras',
          'Ventas',
          'Recursos Humanos',
          'Dirección',
        ],
      },
      {
        id: 'fecha_programada',
        label: 'Fecha Programada',
        type: 'date',
        required: true,
      },
      {
        id: 'auditor',
        label: 'Auditor Asignado',
        type: 'text',
        required: true,
        description: 'Nombre del auditor líder.',
      },
      {
        id: 'alcance',
        label: 'Alcance de la Auditoría',
        type: 'textarea',
        required: true,
        description: '¿Qué áreas, actividades o documentos se revisarán?',
      },
    ],
  },
};

/**
 * Get form definition by type
 */
export function getFormDefinition(
  formType: string
): ConversationalFormDefinition | null {
  return CONVERSATIONAL_FORMS[formType] || null;
}

/**
 * Get all available form types
 */
export function getAvailableFormTypes(): string[] {
  return Object.keys(CONVERSATIONAL_FORMS);
}
