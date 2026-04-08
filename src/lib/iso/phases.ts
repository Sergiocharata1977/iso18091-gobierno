/**
 * Definición unificada de las 6 fases de implementación ISO 9001
 * Fuente única de verdad para el Journey y el Knowledge Base
 */

export interface PhaseModule {
  nombre: string;
  ruta: string;
  descripcion: string;
}

export interface PhaseTask {
  id: string;
  titulo: string;
  descripcion: string;
  esRequerida: boolean;
  dataSource?: string;
  moduloVinculado?: string;
  rutaModulo?: string;
  puedeGenerarseConIA?: boolean;
}

export interface PhaseDefinition {
  id: number;
  nombre: string;
  nombreCorto: string;
  descripcion: string;
  clausulasISO: string[];
  objetivo: string;
  modulosVinculados: PhaseModule[];
  tareas: PhaseTask[];
  icono: string;
  colorPrimario: string;
  colorSecundario: string;
}

export const ISO_9001_PHASES: PhaseDefinition[] = [
  {
    id: 1,
    nombre: 'Diagnóstico y Compromiso',
    nombreCorto: 'Diagnóstico',
    descripcion:
      'Evalúa el estado actual de tu organización y define el alcance del SGC',
    clausulasISO: ['4.1', '4.2', '4.3'],
    objetivo:
      'Entender dónde está la organización y obtener el compromiso de la dirección',
    icono: '🔍',
    colorPrimario: 'from-blue-500 to-blue-600',
    colorSecundario: 'blue',
    modulosVinculados: [
      {
        nombre: 'Madurez Organizacional',
        ruta: '/noticias',
        descripcion: 'Evalúa tu estado actual',
      },
      {
        nombre: 'Análisis FODA',
        ruta: '/analisis-foda',
        descripcion: 'Contexto de la organización',
      },
    ],
    tareas: [
      {
        id: '1.1',
        titulo: 'Realizar diagnóstico inicial',
        descripcion: 'Evaluar el estado actual del SGC',
        esRequerida: true,
        moduloVinculado: 'Madurez',
        rutaModulo: '/noticias',
      },
      {
        id: '1.2',
        titulo: 'Definir alcance del SGC',
        descripcion: 'Determinar qué procesos y áreas cubre el sistema',
        esRequerida: true,
        dataSource: 'organizations/{orgId}',
      },
      {
        id: '1.3',
        titulo: 'Análisis de contexto (FODA)',
        descripcion: 'Identificar factores internos y externos',
        esRequerida: true,
        moduloVinculado: 'FODA',
        rutaModulo: '/analisis-foda',
      },
      {
        id: '1.4',
        titulo: 'Identificar partes interesadas',
        descripcion: 'Clientes, proveedores, empleados, accionistas',
        esRequerida: true,
      },
      {
        id: '1.5',
        titulo: 'Obtener compromiso de la dirección',
        descripcion: 'Carta de compromiso firmada',
        esRequerida: true,
        puedeGenerarseConIA: true,
      },
    ],
  },
  {
    id: 2,
    nombre: 'Planificación Estratégica',
    nombreCorto: 'Planificación',
    descripcion: 'Define políticas, objetivos y gestión de riesgos',
    clausulasISO: ['5.1', '5.2', '5.3', '6.1', '6.2'],
    objetivo: 'Establecer la dirección estratégica del SGC',
    icono: '📋',
    colorPrimario: 'from-purple-500 to-purple-600',
    colorSecundario: 'purple',
    modulosVinculados: [
      {
        nombre: 'Documentos',
        ruta: '/documentos',
        descripcion: 'Política de Calidad',
      },
      {
        nombre: 'Procesos',
        ruta: '/procesos',
        descripcion: 'Objetivos de Calidad',
      },
      {
        nombre: 'Organigramas',
        ruta: '/organigramas',
        descripcion: 'Responsabilidades',
      },
    ],
    tareas: [
      {
        id: '2.1',
        titulo: 'Redactar Política de Calidad',
        descripcion: 'Declaración de compromiso con la calidad',
        esRequerida: true,
        dataSource: 'organizations/{orgId} | documents',
        moduloVinculado: 'Documentos',
        rutaModulo: '/documentos',
        puedeGenerarseConIA: true,
      },
      {
        id: '2.2',
        titulo: 'Definir organigrama',
        descripcion: 'Estructura organizacional y responsabilidades',
        esRequerida: true,
        moduloVinculado: 'Organigramas',
        rutaModulo: '/organigramas',
      },
      {
        id: '2.3',
        titulo: 'Identificar riesgos y oportunidades',
        descripcion: 'Análisis de riesgos del SGC',
        esRequerida: true,
      },
      {
        id: '2.4',
        titulo: 'Establecer objetivos de calidad',
        descripcion: 'Objetivos SMART por proceso',
        esRequerida: true,
        moduloVinculado: 'Procesos',
        rutaModulo: '/procesos',
      },
      {
        id: '2.5',
        titulo: 'Definir responsable del SGC',
        descripcion: 'Representante de la dirección',
        esRequerida: true,
      },
    ],
  },
  {
    id: 3,
    nombre: 'Diseño Documental y Procesos',
    nombreCorto: 'Documentación',
    descripcion: 'Crea la estructura documental y mapea los procesos',
    clausulasISO: ['7.5', '8.1'],
    objetivo: 'Documentar cómo funciona la organización',
    icono: '📝',
    colorPrimario: 'from-emerald-500 to-emerald-600',
    colorSecundario: 'emerald',
    modulosVinculados: [
      {
        nombre: 'Documentos',
        ruta: '/documentos',
        descripcion: 'Procedimientos e instructivos',
      },
      {
        nombre: 'Procesos',
        ruta: '/procesos',
        descripcion: 'Definición de procesos',
      },
      {
        nombre: 'Flujogramas',
        ruta: '/flujogramas',
        descripcion: 'Diagramas de procesos',
      },
    ],
    tareas: [
      {
        id: '3.1',
        titulo: 'Crear mapa de procesos',
        descripcion: 'Identificar procesos estratégicos, operativos y de apoyo',
        esRequerida: true,
        dataSource: 'procesos | flujogramas',
        moduloVinculado: 'Flujogramas',
        rutaModulo: '/flujogramas',
      },
      {
        id: '3.2',
        titulo: 'Caracterizar procesos',
        descripcion: 'Definir entradas, salidas, recursos, indicadores',
        esRequerida: true,
        dataSource: 'procesos | processDefinitions',
        moduloVinculado: 'Procesos',
        rutaModulo: '/procesos',
      },
      {
        id: '3.3',
        titulo: 'Redactar procedimientos',
        descripcion: 'Documentar cómo se realizan las actividades clave',
        esRequerida: true,
        dataSource: 'documents',
        moduloVinculado: 'Documentos',
        rutaModulo: '/documentos',
        puedeGenerarseConIA: true,
      },
      {
        id: '3.4',
        titulo: 'Definir indicadores',
        descripcion: 'KPIs para medir el desempeño de procesos',
        esRequerida: true,
        moduloVinculado: 'Procesos',
        rutaModulo: '/procesos',
      },
      {
        id: '3.5',
        titulo: 'Crear formatos de registro',
        descripcion: 'Plantillas para evidenciar actividades',
        esRequerida: false,
        puedeGenerarseConIA: true,
      },
    ],
  },
  {
    id: 4,
    nombre: 'Implementación y Operación',
    nombreCorto: 'Implementación',
    descripcion: 'Pone en práctica el SGC y genera evidencias',
    clausulasISO: [
      '7.1',
      '7.2',
      '7.3',
      '8.2',
      '8.3',
      '8.4',
      '8.5',
      '8.6',
      '8.7',
    ],
    objetivo: 'Ejecutar los procesos y generar registros',
    icono: '⚙️',
    colorPrimario: 'from-orange-500 to-orange-600',
    colorSecundario: 'orange',
    modulosVinculados: [
      { nombre: 'RRHH', ruta: '/admin', descripcion: 'Capacitaciones' },
      {
        nombre: 'Procesos (Kanban)',
        ruta: '/procesos',
        descripcion: 'Ejecución de tareas',
      },
      { nombre: 'CRM', ruta: '/crm', descripcion: 'Gestión de clientes' },
    ],
    tareas: [
      {
        id: '4.1',
        titulo: 'Capacitar al personal',
        descripcion: 'Formación en el SGC y sus procesos',
        esRequerida: true,
        dataSource: 'personal',
        moduloVinculado: 'RRHH',
        rutaModulo: '/admin',
      },
      {
        id: '4.2',
        titulo: 'Comunicar la política de calidad',
        descripcion: 'Asegurar que todos la conozcan',
        esRequerida: true,
      },
      {
        id: '4.3',
        titulo: 'Ejecutar procesos según lo documentado',
        descripcion: 'Usar el Kanban para gestionar tareas',
        esRequerida: true,
        moduloVinculado: 'Procesos',
        rutaModulo: '/procesos',
      },
      {
        id: '4.4',
        titulo: 'Generar registros de evidencia',
        descripcion: 'Documentar las actividades realizadas',
        esRequerida: true,
      },
      {
        id: '4.5',
        titulo: 'Controlar proveedores externos',
        descripcion: 'Evaluar y seleccionar proveedores',
        esRequerida: false,
        moduloVinculado: 'CRM',
        rutaModulo: '/crm',
      },
    ],
  },
  {
    id: 5,
    nombre: 'Verificación y Evaluación',
    nombreCorto: 'Verificación',
    descripcion: 'Audita y evalúa el desempeño del SGC',
    clausulasISO: ['9.1', '9.2', '9.3'],
    objetivo: 'Medir si el SGC funciona correctamente',
    icono: '✅',
    colorPrimario: 'from-cyan-500 to-cyan-600',
    colorSecundario: 'cyan',
    modulosVinculados: [
      {
        nombre: 'Auditorías',
        ruta: '/auditorias',
        descripcion: 'Auditoría interna',
      },
      {
        nombre: 'Hallazgos',
        ruta: '/hallazgos',
        descripcion: 'No conformidades',
      },
      {
        nombre: 'Procesos',
        ruta: '/procesos',
        descripcion: 'Seguimiento de indicadores',
      },
    ],
    tareas: [
      {
        id: '5.1',
        titulo: 'Realizar seguimiento de indicadores',
        descripcion: 'Medir el desempeño de los procesos',
        esRequerida: true,
        moduloVinculado: 'Procesos',
        rutaModulo: '/procesos',
      },
      {
        id: '5.2',
        titulo: 'Planificar auditoría interna',
        descripcion: 'Programa anual de auditorías',
        esRequerida: true,
        dataSource: 'auditorias | audit_programs',
        moduloVinculado: 'Auditorías',
        rutaModulo: '/auditorias',
      },
      {
        id: '5.3',
        titulo: 'Ejecutar auditoría interna',
        descripcion: 'Auditar todos los procesos del SGC',
        esRequerida: true,
        dataSource: 'auditorias',
        moduloVinculado: 'Auditorías',
        rutaModulo: '/auditorias',
      },
      {
        id: '5.4',
        titulo: 'Realizar revisión por la dirección',
        descripcion: 'Evaluación anual del SGC',
        esRequerida: true,
      },
      {
        id: '5.5',
        titulo: 'Analizar satisfacción del cliente',
        descripcion: 'Encuestas y retroalimentación',
        esRequerida: false,
      },
    ],
  },
  {
    id: 6,
    nombre: 'Mejora y Certificación',
    nombreCorto: 'Certificación',
    descripcion: 'Corrige no conformidades y obtén el certificado',
    clausulasISO: ['10.1', '10.2', '10.3'],
    objetivo: 'Mejorar continuamente y certificarse',
    icono: '🏆',
    colorPrimario: 'from-yellow-500 to-yellow-600',
    colorSecundario: 'yellow',
    modulosVinculados: [
      {
        nombre: 'Acciones',
        ruta: '/acciones',
        descripcion: 'Acciones correctivas',
      },
      { nombre: 'Hallazgos', ruta: '/hallazgos', descripcion: 'Cierre de NC' },
    ],
    tareas: [
      {
        id: '6.1',
        titulo: 'Tratar no conformidades',
        descripcion: 'Analizar causa raíz y corregir',
        esRequerida: true,
        dataSource: 'hallazgos | acciones',
        moduloVinculado: 'Hallazgos',
        rutaModulo: '/hallazgos',
      },
      {
        id: '6.2',
        titulo: 'Implementar acciones correctivas',
        descripcion: 'Eliminar la causa de los problemas',
        esRequerida: true,
        dataSource: 'acciones',
        moduloVinculado: 'Acciones',
        rutaModulo: '/acciones',
      },
      {
        id: '6.3',
        titulo: 'Verificar eficacia de acciones',
        descripcion: 'Comprobar que el problema no se repite',
        esRequerida: true,
      },
      {
        id: '6.4',
        titulo: 'Seleccionar organismo certificador',
        descripcion: 'Elegir un ente certificador acreditado',
        esRequerida: false,
      },
      {
        id: '6.5',
        titulo: 'Realizar auditoría de certificación',
        descripcion: 'Etapa 1 (documental) y Etapa 2 (de campo)',
        esRequerida: false,
      },
    ],
  },
];

/**
 * Obtener versión resumida para el Knowledge Base
 */
export const ISO_9001_PHASES_SUMMARY = ISO_9001_PHASES.map(p => ({
  numero: p.id,
  nombre: p.nombre,
  clausulas: p.clausulasISO,
  descripcion: p.descripcion,
  modulos: p.modulosVinculados.map(m => m.nombre),
}));
