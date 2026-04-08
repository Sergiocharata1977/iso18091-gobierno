/**
 * Tipos TypeScript para el Motor de Scoring de Riesgo Crediticio
 * Basado en modelo Excel con ponderaciones 43%/31%/26%
 */

// ============================================================================
// CONFIGURACIÓN DE SCORING
// ============================================================================

/**
 * Categorías de riesgo resultantes
 */
export type CategoriaRiesgoScoring = 'A' | 'B' | 'C' | 'REPROBADO';

/**
 * Configuración de umbrales por categoría
 */
export interface UmbralCategoria {
  categoria: CategoriaRiesgoScoring;
  puntajeMinimo: number;
  puntajeMaximo: number;
  color: string;
  descripcion: string;
  porcentajeAfectacion: number; // % de ventas para línea de crédito
  relacionPatrimonio: number; // Relación permitida sobre patrimonio
}

/**
 * Indicador individual de scoring
 */
export interface IndicadorScoring {
  id: string;
  nombre: string;
  descripcion?: string;

  // Ponderación
  peso: number; // 0-100 dentro del factor

  // Tipo de evaluación
  tipoEvaluacion: 'automatico' | 'manual';

  // Para automáticos: fórmula o campo de origen
  campoOrigen?: string; // Ej: "balance.liquidezCorriente"
  rangos?: {
    min: number;
    max: number;
    puntaje: number; // 0-10
  }[];

  // Para manuales: opciones predefinidas
  opciones?: {
    valor: string;
    puntaje: number;
  }[];
}

/**
 * Factor de evaluación (grupo de indicadores)
 */
export interface FactorScoring {
  id: string;
  nombre: string;
  descripcion: string;
  peso: number; // % total (43, 31, 26)
  color: string;
  indicadores: IndicadorScoring[];
}

/**
 * Configuración completa del motor de scoring
 */
export interface ConfiguracionScoring {
  id: string;
  organizationId: string; // Multi-tenant
  nombre: string;
  version: string;

  // Factores con sus pesos
  factores: FactorScoring[];

  // Umbrales de categorías
  umbrales: UmbralCategoria[];

  // Estado
  vigente: boolean;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// CONFIGURACIÓN POR DEFECTO (43% / 31% / 26%)
// ============================================================================

export const FACTORES_DEFAULT: Omit<FactorScoring, 'id'>[] = [
  {
    nombre: 'Cualitativos',
    descripcion: 'Evaluación de conducta, management y referencias comerciales',
    peso: 43,
    color: '#3B82F6', // Blue
    indicadores: [
      {
        id: 'conducta_comercial',
        nombre: 'Conducta Comercial',
        descripcion: 'Historial de cumplimiento con proveedores',
        peso: 40,
        tipoEvaluacion: 'manual',
        opciones: [
          { valor: 'Excelente - Sin antecedentes negativos', puntaje: 10 },
          { valor: 'Buena - Cumplimiento regular', puntaje: 7 },
          { valor: 'Regular - Algunos retrasos', puntaje: 4 },
          { valor: 'Mala - Incumplimientos frecuentes', puntaje: 1 },
        ],
      },
      {
        id: 'management',
        nombre: 'Management / Gestión',
        descripcion: 'Calidad de la gestión empresarial',
        peso: 35,
        tipoEvaluacion: 'manual',
        opciones: [
          { valor: 'Profesional con experiencia comprobada', puntaje: 10 },
          { valor: 'Adecuado para el negocio', puntaje: 7 },
          { valor: 'Básico, sin estructura formal', puntaje: 4 },
          { valor: 'Deficiente', puntaje: 1 },
        ],
      },
      {
        id: 'referencias',
        nombre: 'Referencias Comerciales',
        descripcion: 'Referencias de otros proveedores del sector',
        peso: 25,
        tipoEvaluacion: 'manual',
        opciones: [
          { valor: 'Excelentes referencias verificadas', puntaje: 10 },
          { valor: 'Buenas referencias', puntaje: 7 },
          { valor: 'Sin referencias disponibles', puntaje: 4 },
          { valor: 'Referencias negativas', puntaje: 1 },
        ],
      },
    ],
  },
  {
    nombre: 'Legales / Patrimoniales',
    descripcion: 'Solvencia patrimonial y situación legal',
    peso: 31,
    color: '#10B981', // Emerald
    indicadores: [
      {
        id: 'solvencia',
        nombre: 'Solvencia Patrimonial',
        descripcion: 'Ratio Patrimonio Neto / Activo Total',
        peso: 40,
        tipoEvaluacion: 'automatico',
        campoOrigen: 'balance.solvencia',
        rangos: [
          { min: 0.6, max: 1.0, puntaje: 10 },
          { min: 0.4, max: 0.59, puntaje: 7 },
          { min: 0.2, max: 0.39, puntaje: 4 },
          { min: 0, max: 0.19, puntaje: 1 },
        ],
      },
      {
        id: 'inmuebles',
        nombre: 'Respaldo Inmobiliario',
        descripcion: 'Valor de inmuebles propios sin gravámenes',
        peso: 35,
        tipoEvaluacion: 'automatico',
        campoOrigen: 'legajo.inmuebles.valorLibre',
        rangos: [
          { min: 500000, max: 999999999, puntaje: 10 },
          { min: 200000, max: 499999, puntaje: 7 },
          { min: 50000, max: 199999, puntaje: 4 },
          { min: 0, max: 49999, puntaje: 1 },
        ],
      },
      {
        id: 'maquinarias',
        nombre: 'Respaldo en Maquinarias',
        descripcion: 'Valor de maquinarias propias',
        peso: 25,
        tipoEvaluacion: 'automatico',
        campoOrigen: 'legajo.maquinarias.valorTotal',
        rangos: [
          { min: 300000, max: 999999999, puntaje: 10 },
          { min: 100000, max: 299999, puntaje: 7 },
          { min: 30000, max: 99999, puntaje: 4 },
          { min: 0, max: 29999, puntaje: 1 },
        ],
      },
    ],
  },
  {
    nombre: 'Financieros / Mercado',
    descripcion: 'Liquidez y capacidad de pago',
    peso: 26,
    color: '#F59E0B', // Amber
    indicadores: [
      {
        id: 'liquidez',
        nombre: 'Liquidez Corriente',
        descripcion: 'Activo Corriente / Pasivo Corriente',
        peso: 50,
        tipoEvaluacion: 'automatico',
        campoOrigen: 'balance.liquidezCorriente',
        rangos: [
          { min: 1.5, max: 100, puntaje: 10 },
          { min: 1.0, max: 1.49, puntaje: 7 },
          { min: 0.5, max: 0.99, puntaje: 4 },
          { min: 0, max: 0.49, puntaje: 1 },
        ],
      },
      {
        id: 'endeudamiento',
        nombre: 'Nivel de Endeudamiento',
        descripcion: 'Pasivo Total / Patrimonio Neto',
        peso: 30,
        tipoEvaluacion: 'automatico',
        campoOrigen: 'balance.endeudamiento',
        rangos: [
          { min: 0, max: 0.5, puntaje: 10 },
          { min: 0.51, max: 1.0, puntaje: 7 },
          { min: 1.01, max: 2.0, puntaje: 4 },
          { min: 2.01, max: 100, puntaje: 1 },
        ],
      },
      {
        id: 'capacidad_pago',
        nombre: 'Capacidad de Pago',
        descripcion: 'Flujo operativo vs compromisos',
        peso: 20,
        tipoEvaluacion: 'manual',
        opciones: [
          { valor: 'Excelente - Genera excedentes', puntaje: 10 },
          { valor: 'Buena - Cubre obligaciones', puntaje: 7 },
          { valor: 'Ajustada - Al límite', puntaje: 4 },
          { valor: 'Insuficiente', puntaje: 1 },
        ],
      },
    ],
  },
];

export const UMBRALES_DEFAULT: UmbralCategoria[] = [
  {
    categoria: 'A',
    puntajeMinimo: 8.0,
    puntajeMaximo: 10.0,
    color: '#22C55E', // Green
    descripcion: 'Riesgo Muy Bajo - Cliente Premium',
    porcentajeAfectacion: 0.15,
    relacionPatrimonio: 0.8,
  },
  {
    categoria: 'B',
    puntajeMinimo: 6.0,
    puntajeMaximo: 7.99,
    color: '#3B82F6', // Blue
    descripcion: 'Riesgo Bajo - Cliente Confiable',
    porcentajeAfectacion: 0.12,
    relacionPatrimonio: 0.6,
  },
  {
    categoria: 'C',
    puntajeMinimo: 4.0,
    puntajeMaximo: 5.99,
    color: '#F59E0B', // Amber
    descripcion: 'Riesgo Moderado - Requiere Seguimiento',
    porcentajeAfectacion: 0.08,
    relacionPatrimonio: 0.4,
  },
  {
    categoria: 'REPROBADO',
    puntajeMinimo: 0,
    puntajeMaximo: 3.99,
    color: '#EF4444', // Red
    descripcion: 'Riesgo Alto - Sin Línea de Crédito',
    porcentajeAfectacion: 0,
    relacionPatrimonio: 0,
  },
];

// ============================================================================
// RESULTADO DE EVALUACIÓN
// ============================================================================

/**
 * Resultado de un indicador evaluado
 */
export interface ResultadoIndicador {
  indicadorId: string;
  nombre: string;
  valorObtenido: string | number;
  puntaje: number; // 0-10
  peso: number;
  puntajePonderado: number; // puntaje * peso / 100
  evaluadoManualmente: boolean;
  observacion?: string;
}

/**
 * Resultado de un factor evaluado
 */
export interface ResultadoFactor {
  factorId: string;
  nombre: string;
  peso: number;
  indicadores: ResultadoIndicador[];
  puntajeTotal: number; // Suma de puntajes ponderados
  puntajePonderado: number; // puntajeTotal * peso / 100
}

/**
 * Evaluación de scoring completa
 */
export interface EvaluacionScoring {
  id: string;
  organizationId: string; // Multi-tenant
  clienteId: string;
  clienteCuit: string;
  clienteNombre: string;

  // Configuración utilizada
  configuracionId: string;
  configuracionVersion: string;

  // Resultados por factor
  factores: ResultadoFactor[];

  // Resultado final
  puntajeTotal: number; // 0-10 (suma ponderada de factores)
  categoria: CategoriaRiesgoScoring;
  categoriaDescripcion: string;
  categoriaColor: string;

  // Línea de crédito calculada
  lineaCredito: {
    capacidadOperativa: number; // Ventas * % afectación
    capitalDisponible: number; // Patrimonio * relación permitida
    lineaSugerida: number; // MIN de ambos
    lineaMaxima: number; // = lineaSugerida
    lineaIncremental: number; // 5% adicional posible
  };

  // Datos productivos SIG-Agro (si aplica)
  datosProductivos?: {
    totalHectareas: number;
    hectareasPropias: number;
    cultivos: string[];
    rindePromedio: number;
    valorTierraEstimado: number;
  };

  // Datos Nosis (si aplica)
  datosNosis?: {
    consultaId: string;
    scoreNosis: number;
    fechaConsulta: string;
  };

  // Vigencia
  fechaEvaluacion: string;
  fechaVencimiento: string; // Configurable 30/60/90 días
  estado: 'vigente' | 'vencida' | 'actualizada';

  // Observaciones
  observaciones?: string;
  recomendaciones?: string[];

  // Auditoría
  evaluadorId: string;
  evaluadorNombre: string;
  aprobadorId?: string;
  aprobadorNombre?: string;
  fechaAprobacion?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TIPOS PARA INTEGRACIÓN SIG-AGRO
// ============================================================================

/**
 * Datos productivos importados de SIG-Agro
 */
export interface DatosProductivosSIGAgro {
  cuit: string; // Clave de vinculación
  productorId: string;
  productorNombre: string;

  // Campos y superficie
  totalCampos: number;
  totalHectareas: number;
  hectareasPropias: number;
  hectareasArrendadas: number;

  // Cultivos actuales
  cultivos: {
    tipo: string;
    hectareas: number;
    rindeEstimado: number; // kg/ha
    valorEstimado: number; // USD
  }[];

  // Historial de rendimientos
  historicoRindes: {
    campania: string;
    cultivo: string;
    rinde: number;
  }[];

  // Valoración
  valorTierraEstimado: number; // Suma de campos valorados
  valorCosechaEstimada: number;

  // Metadata
  fechaConsulta: string;
  organizacionOrigen: string;
}

// ============================================================================
// TIPOS PARA CRUD
// ============================================================================

export interface CreateEvaluacionData {
  clienteId: string;
  configuracionId?: string; // Si no se especifica, usa la vigente
  indicadoresManuales: {
    indicadorId: string;
    valorSeleccionado: string;
    observacion?: string;
  }[];
  vigenciaDias: 30 | 60 | 90;
  observaciones?: string;
}

export interface UpdateEvaluacionData {
  estado?: 'vigente' | 'vencida';
  observaciones?: string;
  aprobadorId?: string;
}
