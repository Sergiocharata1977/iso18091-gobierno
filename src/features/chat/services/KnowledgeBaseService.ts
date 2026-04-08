// ============================================
// SERVICIO DE KNOWLEDGE BASE - MANUAL DE USUARIO
// ============================================
// Proporciona información del sistema y guías de ISO 9001 para Don Cándido
// Fuente: docs.doncandidoia.com (Manual de Usuario)

import { ISO_9001_PHASES_SUMMARY } from '@/lib/iso/phases';

/**
 * Knowledge Base para Don Cándido
 * Contiene información pre-indexada del Manual de Usuario para respuestas rápidas
 */
export class KnowledgeBaseService {
  /**
   * Información sobre los módulos del sistema
   * Fuente: docs.doncandidoia.com/manual-usuario
   */
  static readonly MODULOS = {
    documentos: {
      nombre: 'Documentos',
      ruta: '/documentos',
      descripcion:
        'Control de documentos y registros del Sistema de Gestión de Calidad',
      funciones: [
        'Crear y editar documentos (Políticas, Procedimientos, Instructivos, Formularios)',
        'Control de versiones automático',
        'Flujo de aprobación (Borrador → En Revisión → Aprobado → Obsoleto)',
        'Vinculación con puntos de norma ISO 9001',
        'Historial de cambios completo',
      ],
      clausulasISO: ['7.5 Información documentada'],
    },
    auditorias: {
      nombre: 'Auditorías',
      ruta: '/auditorias',
      descripcion: 'Planificación y ejecución de auditorías internas',
      funciones: [
        'Crear programa de auditoría anual',
        'Definir alcance, criterios y equipo auditor',
        'Ejecutar auditoría con checklist',
        'Registrar hallazgos automáticamente en módulo Hallazgos',
        'Generar informe de auditoría',
      ],
      clausulasISO: ['9.2 Auditoría interna'],
    },
    hallazgos: {
      nombre: 'Hallazgos',
      ruta: '/hallazgos',
      descripcion:
        'Registro de no conformidades, observaciones y oportunidades de mejora',
      funciones: [
        'Clasificar hallazgos (NC Mayor, NC Menor, Observación, Oportunidad de Mejora)',
        'Asignar responsable y fecha límite',
        'Vincular con proceso y cláusula ISO afectada',
        'Dar seguimiento hasta el cierre',
        'Generar acciones correctivas automáticamente',
      ],
      clausulasISO: ['10.2 No conformidad y acción correctiva'],
    },
    acciones: {
      nombre: 'Acciones',
      ruta: '/acciones',
      descripcion: 'Gestión de acciones correctivas y preventivas',
      funciones: [
        'Crear acciones correctivas desde hallazgos',
        'Análisis de causa raíz',
        'Asignar responsable y recursos',
        'Seguimiento por etapas (Abierta → En progreso → Verificación → Cerrada)',
        'Verificar eficacia de la acción',
      ],
      clausulasISO: ['10.2 No conformidad y acción correctiva'],
    },
    procesos: {
      nombre: 'Procesos',
      ruta: '/procesos',
      descripcion: 'Definición y gestión de procesos organizacionales',
      funciones: [
        'Definir procesos (Estratégicos, Operativos, Apoyo)',
        'Establecer entradas, salidas, recursos',
        'Asignar responsable del proceso',
        'Definir objetivos de calidad por proceso',
        'Crear indicadores y registrar mediciones',
        'Kanban para gestión de tareas del proceso',
      ],
      clausulasISO: ['4.4 SGC y sus procesos', '6.2 Objetivos de calidad'],
    },
    rrhh: {
      nombre: 'RRHH',
      ruta: '/admin',
      descripcion: 'Gestión de personal, capacitaciones y competencias',
      funciones: [
        'Registro de personal con datos completos',
        'Gestión de competencias requeridas por puesto',
        'Plan de capacitación anual',
        'Registro de capacitaciones realizadas',
        'Evaluación de eficacia',
        'Organigramas dinámicos',
      ],
      clausulasISO: [
        '7.1.2 Personas',
        '7.2 Competencia',
        '7.3 Toma de conciencia',
      ],
    },
    crm: {
      nombre: 'CRM',
      ruta: '/crm',
      descripcion: 'Gestión de clientes y análisis de riesgo crediticio',
      funciones: [
        'Registro de clientes con datos completos',
        'Pipeline de oportunidades en Kanban',
        'Historial financiero para análisis de solvencia',
        'Scoring automático de clientes',
        'App móvil para vendedores (offline-first)',
      ],
      clausulasISO: ['8.2 Requisitos para productos y servicios'],
    },
    madurez: {
      nombre: 'Madurez Organizacional',
      ruta: '/noticias (tab Madurez)',
      descripcion: 'Diagnóstico del estado del Sistema de Gestión de Calidad',
      funciones: [
        'Radar de madurez por dimensión',
        'Evaluación de cumplimiento por cláusula ISO',
        'Identificación de gaps',
        'Próximos pasos recomendados',
      ],
      clausulasISO: ['Todas las cláusulas ISO 9001'],
    },
    planificacion: {
      nombre: 'Planificación y Revisión por la Dirección',
      ruta: '/planificacion-revision-direccion',
      descripcion:
        'Gestión estratégica, contexto organizacional y revisión por la dirección',
      funciones: [
        'Definir Misión, Visión y Valores (Identidad)',
        'Análisis de Contexto (FODA/PESTEL)',
        'Gestión de Riesgos y Oportunidades (AMFE)',
        'Actas de Reunión de Revisión por la Dirección',
        'Seguimiento de acuerdos y compromisos',
      ],
      clausulasISO: [
        '4.1 Comprensión de la organización',
        '6.1 Acciones para riesgos y oportunidades',
        '9.3 Revisión por la dirección',
      ],
    },
  };

  /**
   * Preguntas frecuentes pre-indexadas
   * Fuente: docs.doncandidoia.com/manual-usuario/faq
   */
  static readonly FAQ = [
    {
      pregunta: '¿Cómo creo un nuevo documento?',
      respuesta:
        'Ve a Documentos → Nuevo Documento. Completa el formulario con título, tipo, versión y contenido. El documento se creará en estado "Borrador" hasta que lo apruebes.',
    },
    {
      pregunta: '¿Cómo planifico una auditoría interna?',
      respuesta:
        'Ve a Auditorías → Nueva Auditoría. Define el alcance, fechas, auditores y áreas a auditar. El sistema te ayudará a crear el programa y checklist.',
    },
    {
      pregunta: '¿Qué hago cuando encuentro una no conformidad?',
      respuesta:
        'Registra el hallazgo en el módulo Hallazgos. Clasifícalo (NC Mayor, NC Menor, Observación), identifica la causa raíz y crea una Acción Correctiva.',
    },
    {
      pregunta: '¿Cómo defino un objetivo de calidad?',
      respuesta:
        'Los objetivos de calidad se definen dentro de cada proceso. Ve a Procesos → selecciona el proceso → pestaña Objetivos de Calidad. Define objetivos SMART con indicadores medibles.',
    },
    {
      pregunta: '¿Cómo uso el Kanban de procesos?',
      respuesta:
        'El Kanban muestra las tareas de cada proceso organizadas por etapas. Puedes arrastrar tarjetas entre etapas para actualizar su estado. Haz clic en una tarjeta para ver su detalle y checklist.',
    },
  ];

  /**
   * Guía de las 6 fases de implementación ISO 9001
   */
  static readonly FASES_ISO = ISO_9001_PHASES_SUMMARY;

  /**
   * Generar contexto resumido para el system prompt
   * Optimizado para no exceder tokens pero mantener información útil
   */
  static getKnowledgeContext(): string {
    const parts: string[] = [];

    parts.push(`## Base de Conocimiento del Sistema`);
    parts.push(`Fuente: Manual de Usuario (docs.doncandidoia.com)`);
    parts.push('');

    // Módulos resumidos
    parts.push(`### Módulos Disponibles`);
    Object.values(this.MODULOS).forEach(m => {
      parts.push(`- **${m.nombre}** (${m.ruta}): ${m.descripcion}`);
    });
    parts.push('');

    // Fases ISO resumidas
    parts.push(`### Fases de Implementación ISO 9001`);
    this.FASES_ISO.forEach(f => {
      parts.push(
        `${f.numero}. **${f.nombre}** (Cláusulas ${f.clausulas.join(', ')})`
      );
    });
    parts.push('');

    return parts.join('\n');
  }

  /**
   * Obtener información de un módulo específico
   */
  static getModuloInfo(moduloKey: string): string | null {
    const modulo =
      this.MODULOS[moduloKey as keyof typeof KnowledgeBaseService.MODULOS];
    if (!modulo) return null;

    const parts = [
      `## Módulo: ${modulo.nombre}`,
      `Ruta: ${modulo.ruta}`,
      `Descripción: ${modulo.descripcion}`,
      '',
      `### Funciones:`,
      ...modulo.funciones.map(f => `- ${f}`),
      '',
      `### Cláusulas ISO relacionadas:`,
      modulo.clausulasISO.join(', '),
    ];

    return parts.join('\n');
  }

  /**
   * Buscar en FAQ
   */
  static searchFAQ(query: string): string | null {
    const queryLower = query.toLowerCase();
    const match = this.FAQ.find(
      f =>
        f.pregunta.toLowerCase().includes(queryLower) ||
        queryLower.includes(f.pregunta.toLowerCase().split(' ')[0])
    );

    return match
      ? `**Pregunta:** ${match.pregunta}\n**Respuesta:** ${match.respuesta}`
      : null;
  }
}
