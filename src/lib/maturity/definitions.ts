import { FunctionalLevel, MaturityTaskNode } from '../../types/maturity';

// Definición estática del Árbol de Tareas
// Estas son las "casillas" que el sistema va a intentar llenar con datos reales

export const MATURITY_TREE_BLUEPRINT: Omit<
  MaturityTaskNode,
  'exists' | 'evidenceCount' | 'score'
>[] = [
  // --- NIVEL 1: OPERACIÓN (Bajo Nivel) ---
  {
    id: 'op_purchases',
    name: 'Gestión de Compras',
    level: FunctionalLevel.LEVEL_1_OPERATION,
    description:
      'Registro de proveedores, órdenes de compra y recepción de materiales.',
  },
  {
    id: 'op_sales',
    name: 'Gestión de Ventas',
    level: FunctionalLevel.LEVEL_1_OPERATION,
    description: 'Registro de clientes, pedidos, cotizaciones y facturación.',
  },
  {
    id: 'op_stock',
    name: 'Control de Stock/Inventario',
    level: FunctionalLevel.LEVEL_1_OPERATION,
    description: 'Movimientos de entrada/salida y control de existencias.',
  },
  {
    id: 'op_production',
    name: 'Producción / Servicios',
    level: FunctionalLevel.LEVEL_1_OPERATION,
    description: 'Ejecución del servicio o fabricación del producto principal.',
  },
  {
    id: 'op_logistics',
    name: 'Logística y Entrega',
    level: FunctionalLevel.LEVEL_1_OPERATION,
    description: 'Coordinación de entregas y distribución.',
  },

  // --- NIVEL 2: APOYO ---
  {
    id: 'sup_hr',
    name: 'Recursos Humanos',
    level: FunctionalLevel.LEVEL_2_SUPPORT,
    description: 'Legajos, descripciones de puesto y organigrama.',
  },
  {
    id: 'sup_training',
    name: 'Capacitación y Competencia',
    level: FunctionalLevel.LEVEL_2_SUPPORT,
    description: 'Plan de capacitación y registros de formación.',
  },
  {
    id: 'sup_maintenance',
    name: 'Mantenimiento e Infraestructura',
    level: FunctionalLevel.LEVEL_2_SUPPORT,
    description: 'Mantenimiento de equipos, vehículos e instalaciones.',
  },
  {
    id: 'sup_docs',
    name: 'Información Documentada',
    level: FunctionalLevel.LEVEL_2_SUPPORT,
    description: 'Control de documentos, versiones y distribución.',
  },
  {
    id: 'sup_it',
    name: 'Sistemas e IT',
    level: FunctionalLevel.LEVEL_2_SUPPORT,
    description: 'Backups, seguridad informática y gestión de accesos.',
  },

  // --- NIVEL 3: CONTROL Y MEJORA ---
  {
    id: 'ctrl_audit',
    name: 'Auditorías Internas',
    level: FunctionalLevel.LEVEL_3_CONTROL,
    description: 'Programa de auditoría y ejecución periódica.',
  },
  {
    id: 'ctrl_nconformance',
    name: 'No Conformidades y Acciones',
    level: FunctionalLevel.LEVEL_3_CONTROL,
    description:
      'Tratamiento de desvíos, análisis de causa y acciones correctivas.',
  },
  {
    id: 'ctrl_customer_sat',
    name: 'Satisfacción del Cliente',
    level: FunctionalLevel.LEVEL_3_CONTROL,
    description: 'Encuestas, reclamos y análisis de feedback.',
  },
  {
    id: 'ctrl_kpi',
    name: 'Indicadores de Gestión',
    level: FunctionalLevel.LEVEL_3_CONTROL,
    description: 'Medición de procesos y análisis de tableros.',
  },

  // --- NIVEL 4: DIRECCIÓN (Alto Nivel) ---
  {
    id: 'dir_context',
    name: 'Contexto y Partes Interesadas',
    level: FunctionalLevel.LEVEL_4_DIRECTION,
    description:
      'Análisis FODA, contexto interno/externo y requisitos de partes interesadas.',
  },
  {
    id: 'dir_planning',
    name: 'Planificación Estratégica',
    level: FunctionalLevel.LEVEL_4_DIRECTION,
    description:
      'Definición de política, objetivos de calidad y planificación de cambios.',
  },
  {
    id: 'dir_review',
    name: 'Revisión por la Dirección',
    level: FunctionalLevel.LEVEL_4_DIRECTION,
    description: 'Revisión anual del sistema por parte de la alta dirección.',
  },
  {
    id: 'dir_risk',
    name: 'Gestión de Riesgos',
    level: FunctionalLevel.LEVEL_4_DIRECTION,
    description: 'Identificación y tratamiento de riesgos y oportunidades.',
  },
];
