/**
 * Catálogo de Procesos Obligatorios ISO 9001
 *
 * Define los procesos que deben existir según la norma ISO 9001:2015
 * El sistema valida su existencia pero NO bloquea al usuario.
 */

export type ProcessComplianceStatus =
  | 'no_definido' // ❌ No existe definición ni registros
  | 'definido_minimo' // ⚠️ Existe en Definiciones/Registros
  | 'implementado' // ✅ Tiene módulo + registros activos
  | 'eficaz'; // ⭐ Evidencias + métricas + auditorías

export interface MandatoryProcess {
  id: string;
  nombre: string;
  clausula_iso: string;
  descripcion: string;
  modulo_gestion: string;
  ruta: string;
  es_condicional: boolean; // true = depende del tipo de empresa
  criterios_cumplimiento: string[];
}

export interface ProcessComplianceResult {
  proceso: MandatoryProcess;
  estado: ProcessComplianceStatus;
  evidencias: {
    tiene_definicion: boolean;
    tiene_registros: boolean;
    tiene_documentos: boolean;
    tiene_metricas: boolean;
    ultima_auditoria?: Date;
  };
  sugerencia?: string;
}

/**
 * Catálogo de procesos obligatorios según ISO 9001:2015
 */
export const MANDATORY_PROCESSES: MandatoryProcess[] = [
  {
    id: 'gestion_documental',
    nombre: 'Gestión Documental',
    clausula_iso: '7.5',
    descripcion: 'Control de información documentada del SGC',
    modulo_gestion: 'documentos',
    ruta: '/documentos',
    es_condicional: false,
    criterios_cumplimiento: [
      'Existe procedimiento de control de documentos',
      'Documentos están versionados',
      'Existe registro de aprobaciones',
    ],
  },
  {
    id: 'planificacion_sgc',
    nombre: 'Planificación del SGC',
    clausula_iso: '6.1',
    descripcion:
      'Planificación de acciones para abordar riesgos y oportunidades',
    modulo_gestion: 'planificacion-revision-direccion',
    ruta: '/planificacion-revision-direccion',
    es_condicional: false,
    criterios_cumplimiento: [
      'Existe política de calidad',
      'Objetivos de calidad definidos',
      'Plan de acción documentado',
    ],
  },
  {
    id: 'revision_direccion',
    nombre: 'Revisión por la Dirección',
    clausula_iso: '9.3',
    descripcion: 'Revisión periódica del SGC por la alta dirección',
    modulo_gestion: 'planificacion-revision-direccion',
    ruta: '/planificacion-revision-direccion',
    es_condicional: false,
    criterios_cumplimiento: [
      'Actas de revisión documentadas',
      'Frecuencia mínima anual',
      'Incluye análisis de indicadores',
    ],
  },
  {
    id: 'auditorias_internas',
    nombre: 'Auditorías Internas',
    clausula_iso: '9.2',
    descripcion: 'Programa de auditorías internas del SGC',
    modulo_gestion: 'auditorias',
    ruta: '/auditorias',
    es_condicional: false,
    criterios_cumplimiento: [
      'Programa de auditoría anual',
      'Auditores calificados',
      'Informes de auditoría registrados',
    ],
  },
  {
    id: 'mejora_continua',
    nombre: 'Mejora Continua',
    clausula_iso: '10.3',
    descripcion: 'Acciones correctivas y mejora continua',
    modulo_gestion: 'mejoras',
    ruta: '/mejoras',
    es_condicional: false,
    criterios_cumplimiento: [
      'Sistema de gestión de no conformidades',
      'Acciones correctivas documentadas',
      'Seguimiento de efectividad',
    ],
  },
  {
    id: 'recursos_humanos',
    nombre: 'Recursos Humanos',
    clausula_iso: '7.1.2 / 7.2',
    descripcion: 'Gestión de personas y competencias',
    modulo_gestion: 'rrhh',
    ruta: '/rrhh',
    es_condicional: false,
    criterios_cumplimiento: [
      'Perfiles de puesto definidos',
      'Competencias identificadas',
      'Plan de capacitación',
    ],
  },
  {
    id: 'control_ventas',
    nombre: 'Control de Ventas/Comercial',
    clausula_iso: '8.2',
    descripcion: 'Requisitos para productos y servicios',
    modulo_gestion: 'crm',
    ruta: '/crm',
    es_condicional: false,
    criterios_cumplimiento: [
      'Gestión de clientes',
      'Registro de requisitos',
      'Seguimiento de oportunidades',
    ],
  },
  {
    id: 'definicion_procesos',
    nombre: 'Definición de Procesos',
    clausula_iso: '4.4',
    descripcion: 'Mapa de procesos e interacciones',
    modulo_gestion: 'procesos',
    ruta: '/procesos',
    es_condicional: false,
    criterios_cumplimiento: [
      'Procesos identificados',
      'Dueños de proceso asignados',
      'Indicadores definidos',
    ],
  },
  {
    id: 'infraestructura',
    nombre: 'Infraestructura',
    clausula_iso: '7.1.3',
    descripcion: 'Gestión de equipos, instalaciones y ambiente de trabajo',
    modulo_gestion: 'procesos', // Se gestiona como definición de proceso o documento
    ruta: '/procesos',
    es_condicional: true,
    criterios_cumplimiento: [
      'Inventario de equipos críticos',
      'Plan de mantenimiento',
      'Registro de calibraciones (si aplica)',
    ],
  },
  {
    id: 'compras',
    nombre: 'Compras / Proveedores',
    clausula_iso: '8.4',
    descripcion: 'Control de proveedores externos',
    modulo_gestion: 'procesos', // Futuro módulo dedicado
    ruta: '/procesos',
    es_condicional: true,
    criterios_cumplimiento: [
      'Lista de proveedores aprobados',
      'Criterios de evaluación',
      'Registro de evaluaciones',
    ],
  },
  {
    id: 'produccion_servicio',
    nombre: 'Producción / Prestación del Servicio',
    clausula_iso: '8.5',
    descripcion: 'Control de producción y provisión del servicio',
    modulo_gestion: 'procesos',
    ruta: '/procesos',
    es_condicional: true,
    criterios_cumplimiento: [
      'Procedimientos operativos',
      'Control de parámetros críticos',
      'Trazabilidad (si aplica)',
    ],
  },
  {
    id: 'diseno_desarrollo',
    nombre: 'Diseño y Desarrollo',
    clausula_iso: '8.3',
    descripcion: 'Control del diseño y desarrollo de productos/servicios',
    modulo_gestion: 'procesos',
    ruta: '/procesos',
    es_condicional: true,
    criterios_cumplimiento: [
      'Planificación del diseño',
      'Verificación y validación',
      'Control de cambios',
    ],
  },
];

/**
 * Obtiene el emoji/icono según el estado de cumplimiento
 */
export function getComplianceStatusIcon(
  status: ProcessComplianceStatus
): string {
  switch (status) {
    case 'no_definido':
      return '❌';
    case 'definido_minimo':
      return '⚠️';
    case 'implementado':
      return '✅';
    case 'eficaz':
      return '⭐';
    default:
      return '❓';
  }
}

/**
 * Obtiene el color del badge según el estado
 */
export function getComplianceStatusColor(
  status: ProcessComplianceStatus
): string {
  switch (status) {
    case 'no_definido':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'definido_minimo':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'implementado':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'eficaz':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Obtiene el texto descriptivo del estado
 */
export function getComplianceStatusText(
  status: ProcessComplianceStatus
): string {
  switch (status) {
    case 'no_definido':
      return 'No definido';
    case 'definido_minimo':
      return 'Definición mínima';
    case 'implementado':
      return 'Implementado';
    case 'eficaz':
      return 'Eficaz';
    default:
      return 'Desconocido';
  }
}
