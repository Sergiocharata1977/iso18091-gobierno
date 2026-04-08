/**
 * Diccionario de Procesos Clásicos ISO 9001:2015
 *
 * Define los procesos "clásicos" que casi siempre aparecen en un SGC porque
 * la norma exige esas actividades de manera explícita.
 *
 * Cada proceso tiene:
 * - key: identificador único interno
 * - name: nombre formal
 * - aliases: sinónimos para detección automática
 * - isoClause: cláusula(s) ISO 9001:2015 relacionadas
 * - categoryId: categoría en el mapa de procesos (1-4)
 * - template: plantilla base para generación IA
 */

import { ProcessCategoryId } from './processRecords';

// Estructura de un proceso clásico ISO 9001
export interface ISOClassicProcess {
  key: string;
  name: string;
  aliases: string[]; // Sinónimos para detección (normalizados: minúsculas, sin tildes)
  isoClause: string[];
  categoryId: ProcessCategoryId;
  description: string;
  template: ISOProcessTemplate;
}

// Plantilla base para generación
export interface ISOProcessTemplate {
  objective: string;
  scope: string;
  ownerRole: string;
  involvedRoles: string[];
  inputs: string[];
  outputs: string[];
  activities: Array<{
    step: number;
    name: string;
    description: string;
    record?: string;
  }>;
  records: Array<{
    name: string;
    codeSuggestion: string;
    retention?: string;
  }>;
  indicators: Array<{
    name: string;
    formula?: string;
    frequency: string;
    target?: string;
  }>;
  risks: Array<{
    risk: string;
    cause?: string;
    control?: string;
  }>;
  interactions: string[];
}

// ============================================================
// DICCIONARIO DE PROCESOS CLÁSICOS ISO 9001:2015
// ============================================================

export const ISO_CLASSIC_PROCESSES: ISOClassicProcess[] = [
  // ------------------------------------------------------------
  // NIVEL 1 - ESTRATEGIA
  // ------------------------------------------------------------
  {
    key: 'revision_direccion',
    name: 'Planificación y Revisión por la Dirección',
    aliases: [
      'revision por la direccion',
      'revision gerencial',
      'revision direccion',
      'management review',
      'planificacion estrategica',
      'planificacion sgc',
      'revision del sgc',
      'alta direccion',
    ],
    isoClause: ['5.1', '5.2', '5.3', '9.3'],
    categoryId: 1,
    description:
      'Proceso que asegura el liderazgo y compromiso de la alta dirección con el SGC.',
    template: {
      objective:
        'Asegurar que la alta dirección revise periódicamente el Sistema de Gestión de Calidad para garantizar su conveniencia, adecuación, eficacia y alineación con la dirección estratégica.',
      scope:
        'Desde la planificación de la revisión hasta la implementación de las decisiones y acciones resultantes. Incluye todas las áreas del SGC.',
      ownerRole: 'Gerente General / Director',
      involvedRoles: [
        'Responsable de Calidad',
        'Gerentes de Área',
        'Jefes de Proceso',
      ],
      inputs: [
        'Estado de acciones de revisiones anteriores',
        'Cambios en cuestiones internas y externas',
        'Información del desempeño del SGC (NC, indicadores, auditorías)',
        'Adecuación de recursos',
        'Eficacia de acciones para riesgos y oportunidades',
        'Oportunidades de mejora',
      ],
      outputs: [
        'Acta de Revisión por la Dirección',
        'Decisiones sobre mejoras',
        'Necesidades de cambio en el SGC',
        'Necesidades de recursos',
      ],
      activities: [
        {
          step: 1,
          name: 'Planificar revisión',
          description: 'Definir fecha, participantes y agenda de la revisión',
          record: 'Convocatoria',
        },
        {
          step: 2,
          name: 'Recopilar información',
          description:
            'Reunir datos de desempeño, auditorías, NC, satisfacción cliente',
          record: 'Informe de Gestión',
        },
        {
          step: 3,
          name: 'Realizar revisión',
          description: 'Ejecutar reunión de revisión con la dirección',
          record: 'Acta de Revisión',
        },
        {
          step: 4,
          name: 'Documentar decisiones',
          description: 'Registrar todas las decisiones y acciones acordadas',
          record: 'Acta de Revisión',
        },
        {
          step: 5,
          name: 'Seguimiento de acciones',
          description: 'Monitorear implementación de acciones acordadas',
          record: 'Plan de Acciones',
        },
      ],
      records: [
        {
          name: 'Acta de Revisión por la Dirección',
          codeSuggestion: 'REG-RD-001',
          retention: '5 años',
        },
        {
          name: 'Informe de Gestión del SGC',
          codeSuggestion: 'REG-RD-002',
          retention: '3 años',
        },
        {
          name: 'Plan de Acciones de Mejora',
          codeSuggestion: 'REG-RD-003',
          retention: '3 años',
        },
      ],
      indicators: [
        {
          name: 'Cumplimiento de revisiones planificadas',
          formula: '(Revisiones realizadas / Revisiones planificadas) x 100',
          frequency: 'Anual',
          target: '100%',
        },
        {
          name: 'Cierre de acciones de revisión',
          formula: '(Acciones cerradas / Acciones generadas) x 100',
          frequency: 'Semestral',
          target: '≥ 90%',
        },
      ],
      risks: [
        {
          risk: 'Falta de compromiso de la dirección',
          cause: 'Priorización de otras actividades',
          control: 'Calendario anual de revisiones aprobado',
        },
        {
          risk: 'Información insuficiente para la revisión',
          cause: 'Procesos no reportan datos',
          control: 'Checklist de información requerida',
        },
      ],
      interactions: [
        'Auditorías Internas',
        'Gestión de Mejoras',
        'Todos los procesos del SGC',
      ],
    },
  },

  {
    key: 'gestion_riesgos',
    name: 'Gestión de Riesgos y Oportunidades',
    aliases: [
      'riesgos',
      'riesgos y oportunidades',
      'gestion de riesgos',
      'analisis de riesgos',
      'evaluacion de riesgos',
      'foda',
      'contexto',
    ],
    isoClause: ['4.1', '4.2', '6.1'],
    categoryId: 1,
    description:
      'Proceso para identificar, evaluar y tratar riesgos y oportunidades del SGC.',
    template: {
      objective:
        'Identificar, analizar y gestionar los riesgos y oportunidades que pueden afectar la capacidad del SGC para lograr los resultados previstos.',
      scope:
        'Desde la identificación del contexto hasta el seguimiento de las acciones para abordar riesgos y oportunidades. Aplica a todos los procesos.',
      ownerRole: 'Responsable de Calidad',
      involvedRoles: ['Gerentes de Área', 'Jefes de Proceso', 'Alta Dirección'],
      inputs: [
        'Análisis del contexto (FODA)',
        'Requisitos de partes interesadas',
        'Objetivos de calidad',
        'Resultados de auditorías y revisiones',
      ],
      outputs: [
        'Matriz de Riesgos y Oportunidades',
        'Plan de Tratamiento de Riesgos',
        'Acciones preventivas implementadas',
      ],
      activities: [
        {
          step: 1,
          name: 'Analizar contexto',
          description: 'Identificar cuestiones internas y externas relevantes',
          record: 'Análisis FODA',
        },
        {
          step: 2,
          name: 'Identificar riesgos y oportunidades',
          description: 'Listar riesgos y oportunidades por proceso',
          record: 'Matriz R&O',
        },
        {
          step: 3,
          name: 'Evaluar y priorizar',
          description: 'Valorar probabilidad e impacto de cada riesgo',
          record: 'Matriz R&O',
        },
        {
          step: 4,
          name: 'Definir acciones',
          description: 'Establecer acciones para abordar riesgos críticos',
          record: 'Plan de Tratamiento',
        },
        {
          step: 5,
          name: 'Implementar y monitorear',
          description: 'Ejecutar acciones y verificar eficacia',
          record: 'Seguimiento',
        },
      ],
      records: [
        {
          name: 'Análisis FODA',
          codeSuggestion: 'REG-RI-001',
          retention: '3 años',
        },
        {
          name: 'Matriz de Riesgos y Oportunidades',
          codeSuggestion: 'REG-RI-002',
          retention: '3 años',
        },
        {
          name: 'Plan de Tratamiento de Riesgos',
          codeSuggestion: 'REG-RI-003',
          retention: '3 años',
        },
      ],
      indicators: [
        {
          name: 'Riesgos críticos controlados',
          formula: '(Riesgos con acciones eficaces / Riesgos críticos) x 100',
          frequency: 'Semestral',
          target: '≥ 95%',
        },
      ],
      risks: [
        {
          risk: 'No identificar riesgos relevantes',
          cause: 'Falta de participación de las áreas',
          control: 'Talleres de identificación con todas las áreas',
        },
      ],
      interactions: [
        'Planificación y Revisión por la Dirección',
        'Todos los procesos',
      ],
    },
  },

  // ------------------------------------------------------------
  // NIVEL 2 - SOPORTE
  // ------------------------------------------------------------
  {
    key: 'gestion_documental',
    name: 'Gestión Documental',
    aliases: [
      'documentos',
      'gestion documental',
      'control documental',
      'informacion documentada',
      'registros',
      'control de documentos',
      'archivo',
      'documentacion',
    ],
    isoClause: ['7.5'],
    categoryId: 2,
    description:
      'Proceso para crear, aprobar, distribuir y controlar la información documentada del SGC.',
    template: {
      objective:
        'Asegurar que la información documentada del SGC esté disponible, sea adecuada, esté protegida y controlada.',
      scope:
        'Desde la creación/identificación de un documento hasta su disposición final. Incluye documentos internos, externos y registros.',
      ownerRole: 'Responsable de Calidad',
      involvedRoles: ['Todos los Jefes de Proceso', 'Usuarios del SGC'],
      inputs: [
        'Necesidad de documentación',
        'Requisitos normativos',
        'Documentos externos aplicables',
      ],
      outputs: [
        'Documentos aprobados y controlados',
        'Lista Maestra de Documentos',
        'Registros conservados según retención',
      ],
      activities: [
        {
          step: 1,
          name: 'Identificar necesidad',
          description: 'Determinar qué información debe documentarse',
          record: 'Solicitud de documento',
        },
        {
          step: 2,
          name: 'Elaborar documento',
          description: 'Redactar siguiendo formato establecido',
          record: 'Borrador',
        },
        {
          step: 3,
          name: 'Revisar y aprobar',
          description: 'Validar contenido técnico y aprobar para uso',
          record: 'Documento aprobado',
        },
        {
          step: 4,
          name: 'Distribuir',
          description: 'Publicar y comunicar a usuarios',
          record: 'Acuse de recibo',
        },
        {
          step: 5,
          name: 'Controlar cambios',
          description: 'Gestionar versiones y cambios',
          record: 'Historial de cambios',
        },
        {
          step: 6,
          name: 'Conservar y disponer',
          description: 'Archivar según retención y eliminar obsoletos',
          record: 'Control de archivo',
        },
      ],
      records: [
        {
          name: 'Lista Maestra de Documentos',
          codeSuggestion: 'REG-DC-001',
          retention: 'Permanente',
        },
        {
          name: 'Control de Distribución',
          codeSuggestion: 'REG-DC-002',
          retention: '3 años',
        },
        {
          name: 'Historial de Cambios',
          codeSuggestion: 'REG-DC-003',
          retention: 'Vigencia + 3 años',
        },
      ],
      indicators: [
        {
          name: 'Documentos vigentes actualizados',
          formula: '(Docs actualizados / Total docs) x 100',
          frequency: 'Trimestral',
          target: '100%',
        },
        {
          name: 'Tiempo de aprobación',
          formula: 'Días promedio desde solicitud hasta publicación',
          frequency: 'Mensual',
          target: '≤ 5 días',
        },
      ],
      risks: [
        {
          risk: 'Uso de documentos obsoletos',
          cause: 'Falta de control de versiones',
          control: 'Lista maestra actualizada + copias controladas',
        },
        {
          risk: 'Pérdida de registros',
          cause: 'Falta de respaldo',
          control: 'Backup periódico + retención definida',
        },
      ],
      interactions: ['Todos los procesos del SGC'],
    },
  },

  {
    key: 'recursos_humanos',
    name: 'Gestión de Recursos Humanos',
    aliases: [
      'rrhh',
      'recursos humanos',
      'talento humano',
      'personal',
      'competencia',
      'capacitacion',
      'formacion',
      'evaluacion desempeno',
      'competencias',
    ],
    isoClause: ['7.1.2', '7.2', '7.3'],
    categoryId: 2,
    description:
      'Proceso para asegurar que el personal sea competente y esté consciente de su rol en el SGC.',
    template: {
      objective:
        'Asegurar que las personas que realizan trabajos que afectan la calidad sean competentes con base en educación, formación o experiencia.',
      scope:
        'Desde la definición de competencias requeridas hasta la evaluación de la eficacia de las acciones tomadas.',
      ownerRole: 'Responsable de RRHH',
      involvedRoles: [
        'Gerentes de Área',
        'Jefes de Proceso',
        'Responsable de Calidad',
      ],
      inputs: [
        'Perfiles de puesto',
        'Necesidades de formación',
        'Resultados de evaluación de desempeño',
        'Cambios en procesos o tecnología',
      ],
      outputs: [
        'Personal competente',
        'Registros de formación',
        'Evaluaciones de competencia',
      ],
      activities: [
        {
          step: 1,
          name: 'Definir competencias',
          description: 'Establecer competencias requeridas por puesto',
          record: 'Perfil de puesto',
        },
        {
          step: 2,
          name: 'Evaluar competencias actuales',
          description: 'Comparar competencias del personal vs requeridas',
          record: 'Evaluación de competencias',
        },
        {
          step: 3,
          name: 'Identificar brechas',
          description: 'Detectar necesidades de formación',
          record: 'Plan de capacitación',
        },
        {
          step: 4,
          name: 'Ejecutar formación',
          description: 'Impartir capacitación interna o externa',
          record: 'Registro de asistencia',
        },
        {
          step: 5,
          name: 'Evaluar eficacia',
          description: 'Verificar que la formación fue efectiva',
          record: 'Evaluación post-capacitación',
        },
      ],
      records: [
        {
          name: 'Perfiles de Puesto',
          codeSuggestion: 'REG-RH-001',
          retention: 'Vigencia + 2 años',
        },
        {
          name: 'Plan Anual de Capacitación',
          codeSuggestion: 'REG-RH-002',
          retention: '3 años',
        },
        {
          name: 'Registros de Capacitación',
          codeSuggestion: 'REG-RH-003',
          retention: 'Vigencia + 5 años',
        },
        {
          name: 'Evaluación de Competencias',
          codeSuggestion: 'REG-RH-004',
          retention: '5 años',
        },
      ],
      indicators: [
        {
          name: 'Cumplimiento del plan de capacitación',
          formula:
            '(Capacitaciones realizadas / Capacitaciones planificadas) x 100',
          frequency: 'Trimestral',
          target: '≥ 90%',
        },
        {
          name: 'Eficacia de la capacitación',
          formula: '(Capacitaciones eficaces / Total evaluadas) x 100',
          frequency: 'Semestral',
          target: '≥ 85%',
        },
      ],
      risks: [
        {
          risk: 'Personal no competente en funciones críticas',
          cause: 'Falta de formación',
          control: 'Evaluación de competencias antes de asignar',
        },
        {
          risk: 'Rotación de personal clave',
          cause: 'Desmotivación',
          control: 'Plan de retención y desarrollo',
        },
      ],
      interactions: ['Todos los procesos (provee personal competente)'],
    },
  },

  {
    key: 'infraestructura',
    name: 'Gestión de Infraestructura',
    aliases: [
      'infraestructura',
      'mantenimiento',
      'equipos',
      'instalaciones',
      'recursos fisicos',
      'activos',
      'maquinaria',
    ],
    isoClause: ['7.1.3', '7.1.4'],
    categoryId: 2,
    description:
      'Proceso para proporcionar y mantener la infraestructura necesaria para la operación.',
    template: {
      objective:
        'Determinar, proporcionar y mantener la infraestructura necesaria para la operación de los procesos y lograr la conformidad de productos/servicios.',
      scope:
        'Desde la identificación de necesidades de infraestructura hasta el mantenimiento y disposición de activos.',
      ownerRole: 'Responsable de Mantenimiento / Operaciones',
      involvedRoles: ['Jefes de Área', 'Usuarios de equipos', 'Compras'],
      inputs: [
        'Requisitos de producción/operación',
        'Plan de mantenimiento',
        'Solicitudes de equipos/reparaciones',
      ],
      outputs: [
        'Infraestructura disponible y funcional',
        'Registros de mantenimiento',
        'Inventario de activos actualizado',
      ],
      activities: [
        {
          step: 1,
          name: 'Identificar necesidades',
          description: 'Determinar infraestructura requerida para cada proceso',
          record: 'Lista de activos críticos',
        },
        {
          step: 2,
          name: 'Planificar mantenimiento',
          description: 'Establecer programa de mantenimiento preventivo',
          record: 'Plan de mantenimiento',
        },
        {
          step: 3,
          name: 'Ejecutar mantenimiento',
          description: 'Realizar mantenimiento preventivo y correctivo',
          record: 'Orden de trabajo',
        },
        {
          step: 4,
          name: 'Registrar y analizar',
          description: 'Documentar intervenciones y analizar fallas',
          record: 'Historial de equipo',
        },
      ],
      records: [
        {
          name: 'Inventario de Activos',
          codeSuggestion: 'REG-IN-001',
          retention: 'Permanente',
        },
        {
          name: 'Plan de Mantenimiento',
          codeSuggestion: 'REG-IN-002',
          retention: '3 años',
        },
        {
          name: 'Órdenes de Trabajo',
          codeSuggestion: 'REG-IN-003',
          retention: '3 años',
        },
        {
          name: 'Historial de Equipos',
          codeSuggestion: 'REG-IN-004',
          retention: 'Vida útil + 2 años',
        },
      ],
      indicators: [
        {
          name: 'Disponibilidad de equipos críticos',
          formula: '(Tiempo disponible / Tiempo requerido) x 100',
          frequency: 'Mensual',
          target: '≥ 95%',
        },
        {
          name: 'Cumplimiento de mantenimiento preventivo',
          formula: '(Mtos realizados a tiempo / Mtos programados) x 100',
          frequency: 'Mensual',
          target: '≥ 90%',
        },
      ],
      risks: [
        {
          risk: 'Parada de producción por falla de equipo',
          cause: 'Falta de mantenimiento preventivo',
          control: 'Programa de mantenimiento + stock de repuestos',
        },
      ],
      interactions: ['Producción', 'Compras', 'Todos los procesos operativos'],
    },
  },

  // ------------------------------------------------------------
  // NIVEL 3 - OPERATIVO (CORE)
  // ------------------------------------------------------------
  {
    key: 'comercializacion',
    name: 'Gestión Comercial y Ventas',
    aliases: [
      'ventas',
      'comercializacion',
      'comercial',
      'clientes',
      'requisitos del cliente',
      'cotizacion',
      'contratos',
      'pedidos',
    ],
    isoClause: ['8.2'],
    categoryId: 3,
    description:
      'Proceso para determinar y cumplir los requisitos del cliente.',
    template: {
      objective:
        'Determinar los requisitos del cliente, asegurar su comprensión y comunicar cambios para lograr la satisfacción del cliente.',
      scope:
        'Desde la recepción de consulta/oportunidad hasta la confirmación del pedido/contrato.',
      ownerRole: 'Gerente Comercial / Ventas',
      involvedRoles: ['Vendedores', 'Administración', 'Producción/Operaciones'],
      inputs: [
        'Consultas de clientes',
        'Requisitos del producto/servicio',
        'Información de mercado',
      ],
      outputs: [
        'Cotizaciones/Propuestas',
        'Contratos/Pedidos confirmados',
        'Requisitos claros para producción',
      ],
      activities: [
        {
          step: 1,
          name: 'Recibir consulta',
          description: 'Atender y registrar consulta del cliente',
          record: 'Registro de consulta',
        },
        {
          step: 2,
          name: 'Determinar requisitos',
          description:
            'Identificar requisitos explícitos, implícitos y legales',
          record: 'Especificación de requisitos',
        },
        {
          step: 3,
          name: 'Revisar capacidad',
          description: 'Verificar capacidad de cumplir antes de comprometerse',
          record: 'Análisis de factibilidad',
        },
        {
          step: 4,
          name: 'Elaborar propuesta',
          description: 'Preparar cotización o propuesta comercial',
          record: 'Cotización',
        },
        {
          step: 5,
          name: 'Confirmar pedido',
          description: 'Formalizar acuerdo con el cliente',
          record: 'Orden de venta/Contrato',
        },
        {
          step: 6,
          name: 'Comunicar cambios',
          description: 'Gestionar cambios en requisitos',
          record: 'Control de cambios',
        },
      ],
      records: [
        {
          name: 'Registro de Cotizaciones',
          codeSuggestion: 'REG-VE-001',
          retention: '3 años',
        },
        {
          name: 'Contratos/Órdenes de Venta',
          codeSuggestion: 'REG-VE-002',
          retention: '5 años',
        },
        {
          name: 'Control de Cambios de Pedido',
          codeSuggestion: 'REG-VE-003',
          retention: '3 años',
        },
      ],
      indicators: [
        {
          name: 'Tasa de conversión',
          formula: '(Pedidos confirmados / Cotizaciones emitidas) x 100',
          frequency: 'Mensual',
          target: '≥ 30%',
        },
        {
          name: 'Satisfacción del cliente',
          formula: 'Resultado de encuesta (1-10)',
          frequency: 'Trimestral',
          target: '≥ 8',
        },
      ],
      risks: [
        {
          risk: 'Comprometer algo que no se puede cumplir',
          cause: 'Falta de revisión de capacidad',
          control: 'Checklist de revisión antes de confirmar',
        },
        {
          risk: 'Requisitos mal entendidos',
          cause: 'Comunicación deficiente',
          control: 'Confirmación escrita de requisitos',
        },
      ],
      interactions: [
        'Producción',
        'Diseño y Desarrollo',
        'Logística',
        'Facturación',
      ],
    },
  },

  {
    key: 'produccion',
    name: 'Producción y Operaciones',
    aliases: [
      'produccion',
      'operaciones',
      'fabricacion',
      'manufactura',
      'prestacion del servicio',
      'servicio',
      'proceso productivo',
      'stock',
    ],
    isoClause: ['8.5'],
    categoryId: 3,
    description:
      'Proceso de producción y provisión del servicio bajo condiciones controladas.',
    template: {
      objective:
        'Implementar la producción y provisión del servicio bajo condiciones controladas para asegurar la conformidad del producto/servicio.',
      scope:
        'Desde la recepción del pedido hasta la entrega del producto/servicio terminado.',
      ownerRole: 'Jefe de Producción / Operaciones',
      involvedRoles: [
        'Operarios',
        'Control de Calidad',
        'Mantenimiento',
        'Logística',
      ],
      inputs: [
        'Orden de producción/servicio',
        'Materias primas/insumos',
        'Especificaciones técnicas',
        'Personal calificado',
      ],
      outputs: [
        'Producto/servicio conforme',
        'Registros de producción',
        'Producto liberado para entrega',
      ],
      activities: [
        {
          step: 1,
          name: 'Planificar producción',
          description: 'Programar actividades según capacidad y demanda',
          record: 'Plan de producción',
        },
        {
          step: 2,
          name: 'Preparar recursos',
          description:
            'Asegurar disponibilidad de materiales, equipos y personal',
          record: 'Lista de verificación',
        },
        {
          step: 3,
          name: 'Ejecutar producción',
          description: 'Realizar actividades según instrucciones de trabajo',
          record: 'Hoja de ruta',
        },
        {
          step: 4,
          name: 'Controlar proceso',
          description: 'Monitorear parámetros críticos del proceso',
          record: 'Control de proceso',
        },
        {
          step: 5,
          name: 'Inspeccionar producto',
          description: 'Verificar conformidad según criterios',
          record: 'Inspección',
        },
        {
          step: 6,
          name: 'Liberar producto',
          description: 'Aprobar para entrega al cliente',
          record: 'Liberación',
        },
      ],
      records: [
        {
          name: 'Orden de Producción',
          codeSuggestion: 'REG-PR-001',
          retention: '3 años',
        },
        {
          name: 'Registro de Control de Proceso',
          codeSuggestion: 'REG-PR-002',
          retention: '3 años',
        },
        {
          name: 'Registro de Inspección',
          codeSuggestion: 'REG-PR-003',
          retention: '5 años',
        },
        {
          name: 'Liberación de Producto',
          codeSuggestion: 'REG-PR-004',
          retention: '5 años',
        },
      ],
      indicators: [
        {
          name: 'Eficiencia de producción',
          formula: '(Producción real / Producción planificada) x 100',
          frequency: 'Diario/Semanal',
          target: '≥ 90%',
        },
        {
          name: 'Tasa de producto conforme',
          formula: '(Productos conformes / Total producido) x 100',
          frequency: 'Semanal',
          target: '≥ 98%',
        },
      ],
      risks: [
        {
          risk: 'Producto no conforme',
          cause: 'Falta de control de proceso',
          control: 'Puntos de inspección + controles estadísticos',
        },
        {
          risk: 'Retrasos en entrega',
          cause: 'Mala planificación',
          control: 'Planificación anticipada + seguimiento',
        },
      ],
      interactions: ['Comercial', 'Compras', 'Logística', 'Control de Calidad'],
    },
  },

  {
    key: 'compras',
    name: 'Gestión de Compras y Proveedores',
    aliases: [
      'compras',
      'abastecimiento',
      'proveedores',
      'evaluacion proveedores',
      'provision externa',
      'suministros',
      'adquisiciones',
    ],
    isoClause: ['8.4'],
    categoryId: 3,
    description:
      'Proceso para controlar los productos, servicios y procesos suministrados externamente.',
    template: {
      objective:
        'Asegurar que los productos y servicios suministrados externamente sean conformes con los requisitos especificados.',
      scope:
        'Desde la evaluación y selección de proveedores hasta la recepción y verificación de productos/servicios.',
      ownerRole: 'Responsable de Compras',
      involvedRoles: [
        'Usuarios requisantes',
        'Almacén',
        'Control de Calidad',
        'Finanzas',
      ],
      inputs: [
        'Requisiciones de compra',
        'Especificaciones técnicas',
        'Lista de proveedores aprobados',
      ],
      outputs: [
        'Órdenes de compra',
        'Productos/servicios recibidos conformes',
        'Evaluación de proveedores',
      ],
      activities: [
        {
          step: 1,
          name: 'Evaluar y seleccionar proveedor',
          description:
            'Aplicar criterios de evaluación para aprobar proveedores',
          record: 'Evaluación de proveedor',
        },
        {
          step: 2,
          name: 'Recibir requisición',
          description: 'Recibir y validar solicitud de compra',
          record: 'Requisición',
        },
        {
          step: 3,
          name: 'Solicitar cotizaciones',
          description: 'Pedir propuestas a proveedores aprobados',
          record: 'Cotizaciones',
        },
        {
          step: 4,
          name: 'Emitir orden de compra',
          description: 'Formalizar pedido con requisitos claros',
          record: 'Orden de compra',
        },
        {
          step: 5,
          name: 'Recibir y verificar',
          description: 'Inspeccionar producto recibido vs orden',
          record: 'Recepción',
        },
        {
          step: 6,
          name: 'Reevaluar proveedores',
          description: 'Evaluar desempeño periódicamente',
          record: 'Reevaluación',
        },
      ],
      records: [
        {
          name: 'Lista de Proveedores Aprobados',
          codeSuggestion: 'REG-CO-001',
          retention: 'Vigente + 2 años',
        },
        {
          name: 'Evaluación de Proveedores',
          codeSuggestion: 'REG-CO-002',
          retention: '3 años',
        },
        {
          name: 'Órdenes de Compra',
          codeSuggestion: 'REG-CO-003',
          retention: '5 años',
        },
        {
          name: 'Registro de Recepción',
          codeSuggestion: 'REG-CO-004',
          retention: '3 años',
        },
      ],
      indicators: [
        {
          name: 'Cumplimiento de proveedores',
          formula: '(Entregas a tiempo y conformes / Total entregas) x 100',
          frequency: 'Mensual',
          target: '≥ 95%',
        },
        {
          name: 'Proveedores evaluados',
          formula: '(Proveedores evaluados / Proveedores activos) x 100',
          frequency: 'Anual',
          target: '100%',
        },
      ],
      risks: [
        {
          risk: 'Recibir producto no conforme',
          cause: 'Proveedor no calificado',
          control: 'Evaluación previa + inspección en recepción',
        },
        {
          risk: 'Desabastecimiento',
          cause: 'Proveedor único',
          control: 'Mantener proveedores alternativos',
        },
      ],
      interactions: ['Producción', 'Almacén', 'Finanzas', 'Control de Calidad'],
    },
  },

  {
    key: 'diseno_desarrollo',
    name: 'Diseño y Desarrollo de Productos',
    aliases: [
      'diseno',
      'desarrollo',
      'diseno y desarrollo',
      'innovacion',
      'nuevos productos',
      'i+d',
      'investigacion',
    ],
    isoClause: ['8.3'],
    categoryId: 3,
    description:
      'Proceso para diseñar y desarrollar productos/servicios que cumplan requisitos.',
    template: {
      objective:
        'Establecer, implementar y mantener un proceso de diseño y desarrollo adecuado para asegurar la provisión de productos/servicios conformes.',
      scope:
        'Desde la identificación de requisitos de diseño hasta la validación final del producto/servicio.',
      ownerRole: 'Responsable de Diseño/Ingeniería',
      involvedRoles: [
        'Comercial',
        'Producción',
        'Calidad',
        'Cliente (cuando aplique)',
      ],
      inputs: [
        'Requisitos del cliente',
        'Requisitos legales y normativos',
        'Información de diseños similares',
        'Requisitos funcionales y de desempeño',
      ],
      outputs: [
        'Especificaciones de diseño',
        'Planos/Prototipos',
        'Producto validado para producción',
      ],
      activities: [
        {
          step: 1,
          name: 'Planificar diseño',
          description:
            'Definir etapas, revisiones, verificaciones y validaciones',
          record: 'Plan de diseño',
        },
        {
          step: 2,
          name: 'Determinar entradas',
          description: 'Recopilar y documentar todos los requisitos',
          record: 'Entradas de diseño',
        },
        {
          step: 3,
          name: 'Controles de diseño',
          description: 'Realizar revisiones, verificaciones',
          record: 'Revisión de diseño',
        },
        {
          step: 4,
          name: 'Generar salidas',
          description: 'Producir especificaciones, planos, prototipos',
          record: 'Salidas de diseño',
        },
        {
          step: 5,
          name: 'Validar diseño',
          description: 'Confirmar que el producto cumple el uso previsto',
          record: 'Validación',
        },
        {
          step: 6,
          name: 'Controlar cambios',
          description: 'Gestionar cambios durante y después del diseño',
          record: 'Control de cambios',
        },
      ],
      records: [
        {
          name: 'Plan de Diseño',
          codeSuggestion: 'REG-DD-001',
          retention: 'Vida del producto',
        },
        {
          name: 'Registro de Entradas de Diseño',
          codeSuggestion: 'REG-DD-002',
          retention: 'Vida del producto',
        },
        {
          name: 'Actas de Revisión de Diseño',
          codeSuggestion: 'REG-DD-003',
          retention: 'Vida del producto',
        },
        {
          name: 'Informe de Validación',
          codeSuggestion: 'REG-DD-004',
          retention: 'Vida del producto',
        },
      ],
      indicators: [
        {
          name: 'Proyectos completados a tiempo',
          formula: '(Proyectos a tiempo / Total proyectos) x 100',
          frequency: 'Por proyecto',
          target: '≥ 80%',
        },
        {
          name: 'Cambios post-lanzamiento',
          formula: 'Cantidad de cambios en primeros 6 meses',
          frequency: 'Por producto',
          target: '≤ 3',
        },
      ],
      risks: [
        {
          risk: 'Diseño que no cumple requisitos',
          cause: 'Entradas incompletas',
          control: 'Checklist de entradas + revisiones',
        },
        {
          risk: 'Retrasos en desarrollo',
          cause: 'Falta de recursos',
          control: 'Planificación con holguras + seguimiento',
        },
      ],
      interactions: ['Comercial', 'Producción', 'Compras', 'Cliente'],
    },
  },

  // ------------------------------------------------------------
  // NIVEL 4 - EVALUACIÓN
  // ------------------------------------------------------------
  {
    key: 'auditorias',
    name: 'Auditorías Internas',
    aliases: [
      'auditoria',
      'auditorias',
      'auditoria interna',
      'auditorias internas',
      'programa de auditorias',
      'audit',
    ],
    isoClause: ['9.2'],
    categoryId: 4,
    description:
      'Proceso para planificar, realizar y dar seguimiento a auditorías internas del SGC.',
    template: {
      objective:
        'Proporcionar información sobre si el SGC es conforme con los requisitos propios y de ISO 9001, y si se implementa y mantiene eficazmente.',
      scope:
        'Desde la planificación del programa anual de auditorías hasta el cierre de hallazgos.',
      ownerRole: 'Responsable de Calidad',
      involvedRoles: [
        'Auditores Internos',
        'Jefes de Proceso auditados',
        'Alta Dirección',
      ],
      inputs: [
        'Programa de auditorías',
        'Requisitos ISO 9001',
        'Documentación del SGC',
        'Resultados de auditorías anteriores',
      ],
      outputs: [
        'Informes de auditoría',
        'Hallazgos/No conformidades',
        'Acciones correctivas',
      ],
      activities: [
        {
          step: 1,
          name: 'Elaborar programa anual',
          description:
            'Planificar auditorías considerando importancia y resultados previos',
          record: 'Programa de auditorías',
        },
        {
          step: 2,
          name: 'Planificar auditoría',
          description: 'Definir alcance, criterios, equipo auditor',
          record: 'Plan de auditoría',
        },
        {
          step: 3,
          name: 'Ejecutar auditoría',
          description:
            'Realizar reunión apertura, recopilar evidencias, reunión cierre',
          record: 'Lista de verificación',
        },
        {
          step: 4,
          name: 'Elaborar informe',
          description: 'Documentar hallazgos y conclusiones',
          record: 'Informe de auditoría',
        },
        {
          step: 5,
          name: 'Seguimiento de hallazgos',
          description: 'Verificar implementación y eficacia de acciones',
          record: 'Seguimiento',
        },
      ],
      records: [
        {
          name: 'Programa Anual de Auditorías',
          codeSuggestion: 'REG-AU-001',
          retention: '3 años',
        },
        {
          name: 'Plan de Auditoría',
          codeSuggestion: 'REG-AU-002',
          retention: '3 años',
        },
        {
          name: 'Informe de Auditoría',
          codeSuggestion: 'REG-AU-003',
          retention: '5 años',
        },
        {
          name: 'Registro de Competencia de Auditores',
          codeSuggestion: 'REG-AU-004',
          retention: '3 años',
        },
      ],
      indicators: [
        {
          name: 'Cumplimiento del programa',
          formula: '(Auditorías realizadas / Auditorías programadas) x 100',
          frequency: 'Anual',
          target: '100%',
        },
        {
          name: 'Cierre de hallazgos a tiempo',
          formula: '(Hallazgos cerrados a tiempo / Total hallazgos) x 100',
          frequency: 'Semestral',
          target: '≥ 90%',
        },
      ],
      risks: [
        {
          risk: 'Auditorías no realizadas',
          cause: 'Falta de tiempo/recursos',
          control: 'Programa aprobado por dirección + seguimiento',
        },
        {
          risk: 'Auditores no competentes',
          cause: 'Falta de formación',
          control: 'Calificación y formación de auditores',
        },
      ],
      interactions: [
        'Todos los procesos',
        'Revisión por la Dirección',
        'Gestión de Mejoras',
      ],
    },
  },

  {
    key: 'mejoras',
    name: 'Gestión de Mejoras',
    aliases: [
      'mejoras',
      'mejora continua',
      'acciones correctivas',
      'acciones preventivas',
      'no conformidad',
      'no conformidades',
      'nc',
      'hallazgos',
      'accion correctiva',
    ],
    isoClause: ['10.1', '10.2', '10.3'],
    categoryId: 4,
    description:
      'Proceso para gestionar no conformidades, acciones correctivas y mejora continua.',
    template: {
      objective:
        'Reaccionar ante no conformidades, eliminar las causas para evitar recurrencia y mejorar continuamente el SGC.',
      scope:
        'Desde la detección de una no conformidad/oportunidad de mejora hasta la verificación de eficacia de las acciones.',
      ownerRole: 'Responsable de Calidad',
      involvedRoles: [
        'Jefes de Proceso',
        'Personal involucrado',
        'Alta Dirección',
      ],
      inputs: [
        'No conformidades detectadas',
        'Quejas de clientes',
        'Resultados de auditorías',
        'Análisis de datos',
        'Oportunidades de mejora',
      ],
      outputs: [
        'Acciones correctivas implementadas',
        'Causas raíz eliminadas',
        'Mejoras implementadas',
      ],
      activities: [
        {
          step: 1,
          name: 'Registrar NC/Mejora',
          description: 'Documentar la no conformidad u oportunidad de mejora',
          record: 'Reporte de NC',
        },
        {
          step: 2,
          name: 'Analizar causa raíz',
          description:
            'Aplicar herramientas (5 por qué, Ishikawa) para identificar causa',
          record: 'Análisis de causa',
        },
        {
          step: 3,
          name: 'Definir acciones',
          description: 'Establecer acciones correctivas/preventivas/mejora',
          record: 'Plan de acción',
        },
        {
          step: 4,
          name: 'Implementar acciones',
          description: 'Ejecutar las acciones definidas',
          record: 'Evidencia de implementación',
        },
        {
          step: 5,
          name: 'Verificar eficacia',
          description: 'Confirmar que las acciones eliminaron la causa',
          record: 'Verificación de eficacia',
        },
        {
          step: 6,
          name: 'Cerrar',
          description: 'Cerrar formalmente la NC/mejora',
          record: 'Cierre',
        },
      ],
      records: [
        {
          name: 'Reporte de No Conformidad',
          codeSuggestion: 'REG-NC-001',
          retention: '5 años',
        },
        {
          name: 'Análisis de Causa Raíz',
          codeSuggestion: 'REG-NC-002',
          retention: '5 años',
        },
        {
          name: 'Plan de Acción Correctiva',
          codeSuggestion: 'REG-NC-003',
          retention: '5 años',
        },
        {
          name: 'Verificación de Eficacia',
          codeSuggestion: 'REG-NC-004',
          retention: '5 años',
        },
      ],
      indicators: [
        {
          name: 'NC cerradas a tiempo',
          formula: '(NC cerradas a tiempo / Total NC) x 100',
          frequency: 'Mensual',
          target: '≥ 90%',
        },
        {
          name: 'Eficacia de acciones correctivas',
          formula: '(Acciones eficaces / Total acciones) x 100',
          frequency: 'Trimestral',
          target: '≥ 85%',
        },
        {
          name: 'Recurrencia de NC',
          formula: 'NC recurrentes / Total NC',
          frequency: 'Semestral',
          target: '≤ 5%',
        },
      ],
      risks: [
        {
          risk: 'NC no se cierran',
          cause: 'Falta de seguimiento',
          control: 'Tablero de seguimiento + alertas',
        },
        {
          risk: 'Causas raíz no identificadas',
          cause: 'Análisis superficial',
          control: 'Capacitación en herramientas de análisis',
        },
      ],
      interactions: [
        'Todos los procesos',
        'Auditorías Internas',
        'Revisión por la Dirección',
      ],
    },
  },

  {
    key: 'partes_interesadas',
    name: 'Evaluación de Partes Interesadas',
    aliases: [
      'partes interesadas',
      'stakeholders',
      'requisitos partes interesadas',
      'evaluacion partes interesadas',
      'contexto organizacional',
    ],
    isoClause: ['4.2'],
    categoryId: 4,
    description:
      'Proceso para identificar partes interesadas y sus requisitos pertinentes.',
    template: {
      objective:
        'Identificar las partes interesadas pertinentes al SGC y determinar sus requisitos relevantes.',
      scope:
        'Desde la identificación de partes interesadas hasta el seguimiento de sus requisitos.',
      ownerRole: 'Responsable de Calidad / Alta Dirección',
      involvedRoles: ['Gerentes de Área', 'Legal (cuando aplique)'],
      inputs: [
        'Contexto organizacional',
        'Requisitos legales',
        'Expectativas de clientes, empleados, accionistas, etc.',
      ],
      outputs: [
        'Matriz de Partes Interesadas',
        'Requisitos identificados y priorizados',
      ],
      activities: [
        {
          step: 1,
          name: 'Identificar partes interesadas',
          description: 'Listar todas las partes pertinentes al SGC',
          record: 'Lista de PI',
        },
        {
          step: 2,
          name: 'Determinar requisitos',
          description: 'Identificar qué necesita cada parte interesada',
          record: 'Matriz de PI',
        },
        {
          step: 3,
          name: 'Priorizar',
          description: 'Evaluar relevancia y prioridad de cada requisito',
          record: 'Matriz de PI',
        },
        {
          step: 4,
          name: 'Revisar periódicamente',
          description: 'Actualizar ante cambios en el contexto',
          record: 'Actualización',
        },
      ],
      records: [
        {
          name: 'Matriz de Partes Interesadas',
          codeSuggestion: 'REG-PI-001',
          retention: '3 años',
        },
      ],
      indicators: [
        {
          name: 'Actualización de matriz',
          formula: 'Revisiones realizadas vs planificadas',
          frequency: 'Anual',
          target: '100%',
        },
      ],
      risks: [
        {
          risk: 'No identificar partes interesadas clave',
          cause: 'Análisis incompleto',
          control: 'Revisión con múltiples áreas',
        },
      ],
      interactions: [
        'Planificación y Revisión por la Dirección',
        'Gestión de Riesgos',
      ],
    },
  },
];

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

/**
 * Normaliza un texto para comparación (minúsculas, sin tildes, sin caracteres especiales)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-z0-9\s]/g, '') // Solo letras, números y espacios
    .trim();
}

/**
 * Detecta si el nombre de proceso ingresado coincide con un proceso clásico ISO 9001
 * Retorna el proceso detectado y un score de confianza (0-100)
 */
export function detectClassicProcess(inputName: string): {
  process: ISOClassicProcess | null;
  score: number;
  matchedAlias?: string;
} {
  if (!inputName || inputName.length < 3) {
    return { process: null, score: 0 };
  }

  const normalized = normalizeText(inputName);
  let bestMatch: ISOClassicProcess | null = null;
  let bestScore = 0;
  let matchedAlias = '';

  for (const process of ISO_CLASSIC_PROCESSES) {
    // Verificar coincidencia exacta con nombre
    if (normalizeText(process.name) === normalized) {
      return { process, score: 100, matchedAlias: process.name };
    }

    // Verificar coincidencia con aliases
    for (const alias of process.aliases) {
      const normalizedAlias = normalizeText(alias);

      // Coincidencia exacta con alias
      if (normalizedAlias === normalized) {
        return { process, score: 95, matchedAlias: alias };
      }

      // Coincidencia parcial (el input contiene el alias)
      if (normalized.includes(normalizedAlias)) {
        const score = Math.min(
          90,
          (normalizedAlias.length / normalized.length) * 100
        );
        if (score > bestScore) {
          bestScore = score;
          bestMatch = process;
          matchedAlias = alias;
        }
      }

      // El alias contiene el input
      if (normalizedAlias.includes(normalized) && normalized.length >= 4) {
        const score = Math.min(
          80,
          (normalized.length / normalizedAlias.length) * 100
        );
        if (score > bestScore) {
          bestScore = score;
          bestMatch = process;
          matchedAlias = alias;
        }
      }
    }
  }

  // Umbral mínimo para considerar match
  if (bestScore >= 50) {
    return { process: bestMatch, score: bestScore, matchedAlias };
  }

  return { process: null, score: 0 };
}

/**
 * Obtiene un proceso clásico por su key
 */
export function getClassicProcessByKey(
  key: string
): ISOClassicProcess | undefined {
  return ISO_CLASSIC_PROCESSES.find(p => p.key === key);
}

/**
 * Obtiene todos los procesos clásicos de una categoría
 */
export function getClassicProcessesByCategory(
  categoryId: ProcessCategoryId
): ISOClassicProcess[] {
  return ISO_CLASSIC_PROCESSES.filter(p => p.categoryId === categoryId);
}
