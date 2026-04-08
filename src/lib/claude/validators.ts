// Query validation for Don Cándido

export interface ValidationResult {
  valida: boolean;
  respuesta?: string; // Rejection message if not valid
}

// Keywords related to ISO 9001 and quality management
const TOPICOS_PERMITIDOS = [
  // ISO 9001 y calidad
  'iso 9001',
  'iso',
  '9001',
  'procesos',
  'proceso',
  'calidad',
  'auditorias',
  'auditoría',
  'auditoria',
  'auditar',
  'no conformidades',
  'no conformidad',
  'nc',
  'conformidad',
  'acciones correctivas',
  'acción correctiva',
  'correctiva',
  'acciones preventivas',
  'acción preventiva',
  'preventiva',
  'mejora continua',
  'mejora',
  'mejorar',
  'documentación',
  'documento',
  'documentos',
  'documentar',
  'indicadores',
  'indicador',
  'kpi',
  'métrica',
  'medición',
  'objetivos',
  'objetivo',
  'meta',
  'metas',
  'riesgos',
  'riesgo',
  'gestión de riesgos',
  'satisfacción cliente',
  'cliente',
  'clientes',
  'revisión dirección',
  'revisión',
  'dirección',
  'cláusula',
  'clausula',
  'requisito',
  'requisitos',
  'normas',
  'norma',
  'certificación',
  'certificado',
  'sistema de gestión',
  'sgc',
  'gestión',
  'política de calidad',
  'política',
  'manual de calidad',
  'manual',
  'procedimiento',
  'procedimientos',
  'registro',
  'registros',
  'hallazgo',
  'hallazgos',
  'eficacia',
  'eficiencia',
  'efectividad',
  'trazabilidad',
  'rastreabilidad',
  'competencia',
  'capacitación',
  'formación',
  'infraestructura',
  'ambiente de trabajo',
  'planificación',
  'planificar',
  'contexto de la organización',
  'contexto',
  'partes interesadas',
  'stakeholders',
  'alcance',
  'exclusiones',
  // Contexto del usuario (NUEVO)
  'mi puesto',
  'puesto',
  'mi proceso',
  'mis procesos',
  'asignado',
  'asignados',
  'mi objetivo',
  'mis objetivos',
  'mi indicador',
  'mis indicadores',
  'mi departamento',
  'departamento',
  'mi supervisor',
  'supervisor',
  'mi rol',
  'rol',
  'responsabilidad',
  'responsabilidades',
  'tareas',
  'tarea',
  'pendiente',
  'pendientes',
  'qué tengo',
  'cuál es mi',
  'cuáles son mis',
];

// Topics that are explicitly not allowed
const TOPICOS_PROHIBIDOS = [
  'política electoral',
  'elecciones',
  'partido político',
  'deportes',
  'fútbol',
  'basketball',
  'tenis',
  'entretenimiento',
  'películas',
  'series',
  'música',
  'noticias',
  'actualidad',
  'religión',
  'iglesia',
  'fe',
  'economía personal',
  'inversiones personales',
  'salud personal',
  'medicina personal',
  'recetas de cocina',
  'cocinar',
  'viajes turísticos',
  'turismo',
  'moda',
  'ropa',
  'estilo',
];

export class ValidationService {
  /**
   * Validate if query is about ISO 9001 and quality management
   * @param consulta User query
   * @returns Validation result
   */
  static validarConsulta(consulta: string): ValidationResult {
    const consultaLower = consulta.toLowerCase();

    // Check for prohibited topics first
    if (this.contieneTopicosProhibidos(consultaLower)) {
      return {
        valida: false,
        respuesta: this.generarMensajeRechazo('prohibido'),
      };
    }

    // Check for ISO 9001 related keywords
    if (!this.contieneTopicosPermitidos(consultaLower)) {
      return {
        valida: false,
        respuesta: this.generarMensajeRechazo('no_relacionado'),
      };
    }

    // Query is valid
    return { valida: true };
  }

  /**
   * Check if query contains prohibited topics
   */
  private static contieneTopicosProhibidos(consulta: string): boolean {
    return TOPICOS_PROHIBIDOS.some(topico =>
      consulta.includes(topico.toLowerCase())
    );
  }

  /**
   * Check for ISO 9001 related keywords
   */
  private static contieneTopicosPermitidos(consulta: string): boolean {
    return TOPICOS_PERMITIDOS.some(topico =>
      consulta.includes(topico.toLowerCase())
    );
  }

  /**
   * Generate rejection message based on reason
   */
  private static generarMensajeRechazo(razon: string): string {
    switch (razon) {
      case 'prohibido':
        return `👷‍♂️ Disculpa, pero solo puedo asesorarte sobre temas relacionados con el Sistema de Gestión de Calidad ISO 9001 y los procesos de nuestra organización.

¿Tienes alguna consulta sobre calidad, procesos, auditorías o la norma ISO 9001?`;

      case 'no_relacionado':
        return `👷‍♂️ Tu consulta parece no estar relacionada con ISO 9001 o gestión de calidad.

Puedo ayudarte con:
• Tu puesto, procesos y objetivos asignados
• Normas y cláusulas ISO 9001
• Procesos de calidad
• Auditorías y hallazgos
• No conformidades y acciones correctivas
• Objetivos e indicadores de calidad
• Mejora continua

¿En qué puedo asesorarte?`;

      default:
        return `👷‍♂️ Solo puedo ayudarte con temas relacionados con ISO 9001 y gestión de calidad.`;
    }
  }

  /**
   * Suggest example queries to the user
   */
  static sugerirEjemplos(): string[] {
    return [
      '¿Cómo registro una no conformidad?',
      '¿Qué es la cláusula 8.5 de ISO 9001?',
      '¿Cómo preparo una auditoría interna?',
      '¿Qué acciones correctivas debo tomar?',
      '¿Cómo mejoro mis indicadores de calidad?',
      '¿Qué documentos necesito para mi proceso?',
    ];
  }
}
