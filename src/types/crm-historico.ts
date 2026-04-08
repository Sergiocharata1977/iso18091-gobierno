/**
 * Tipos para almacenamiento histórico (Time-Series)
 * Cada registro es inmutable y tiene relación con el personal que lo registró
 */

// =============================================================================
// SNAPSHOTS FINANCIEROS
// =============================================================================

export type TipoSnapshotFinanciero =
  | 'situacion_patrimonial' // Antes "balance"
  | 'estado_resultados'
  | 'iva_mensual'
  | 'ganancias'
  | 'rentas'
  | '931';

export interface FinancialSnapshot {
  id: string;
  organizationId: string;
  clienteId: string;

  // Tipo y período
  tipoSnapshot: TipoSnapshotFinanciero;
  periodo: string; // "2024" para anuales, "2024-03" para mensuales
  periodoAnterior?: string; // Para comparativos
  fechaRegistro: string; // ISO timestamp

  // Estado de Situación Patrimonial (si aplica)
  situacionPatrimonial?: {
    // ACTIVO
    activoCorriente: {
      cajaYBancos: number;
      inversionesTemporarias: number;
      creditosPorVentas: number;
      otrosCreditos: number;
      bienesDeCambio: number;
      otrosActivos: number;
      total: number;
    };
    activoNoCorriente: {
      creditosPorVentas: number;
      otrosCreditos: number;
      bienesDeCambio: number;
      bienesDeUso: number;
      participacionSociedades: number;
      otrasInversiones: number;
      activosIntangibles: number;
      otrosActivos: number;
      total: number;
    };
    totalActivo: number;

    // PASIVO
    pasivoCorriente: {
      deudasComerciales: number;
      prestamos: number;
      remuneracionesYCargasSoc: number;
      cargasFiscales: number;
      anticiposClientes: number;
      dividendosAPagar: number;
      otrasDeudas: number;
      previsiones: number;
      total: number;
    };
    pasivoNoCorriente: {
      deudas: number;
      previsiones: number;
      total: number;
    };
    totalPasivo: number;

    // PATRIMONIO NETO
    patrimonioNeto: {
      capital: number;
      reservas: number;
      resultadosAcumulados: number;
      resultadoEjercicio: number;
      total: number;
    };

    totalPasivoYPatrimonio: number;
  };

  // Estado de Resultados (si aplica)
  estadoResultados?: {
    // Ingresos
    ventasNetas: number;
    costoBienesVendidos: number;
    gananciaBruta: number; // Calculado: ventas - costo

    // Resultados por valuación
    resultadoValuacionBienesCambio: number;

    // Gastos operativos
    gastosComercializacion: number;
    gastosAdministracion: number;
    otrosGastos: number;

    // Otros resultados
    resultadoInversionesEntesRelacionados: number;
    resultadoOtrasInversiones: number;

    // Resultados financieros
    resultadosFinancieros: {
      generadosPorActivos: number;
      generadosPorPasivos: number;
      total: number;
    };

    // Otros ingresos/egresos
    otrosIngresosEgresos: number;

    // Resultados
    gananciaAntesImpuestos: number; // Calculado
    impuestoGanancias: number;
    gananciaNeta: number; // Calculado: antes de impuestos - impuesto
  };

  // Ratios calculados automáticamente
  ratios?: {
    liquidezCorriente: number; // Activo Corriente / Pasivo Corriente
    endeudamiento: number; // Pasivo Total / Activo Total
    solvencia: number; // Patrimonio Neto / Activo Total
    margenBruto?: number; // Ganancia Bruta / Ventas
    margenNeto?: number; // Ganancia Neta / Ventas
    rotacionActivos?: number; // Ventas / Activo Total
    roe?: number; // Ganancia Neta / Patrimonio Neto
  };

  // Declaración Mensual de Impuestos (si aplica)
  // Para IVA, Rentas, 931, etc. - Un registro por mes
  declaracionMensual?: {
    ivaCompras: number;
    ivaVentas: number;
    rentas: number;
    impuesto931: number;
    comprobantesUrl?: string; // URL a documentos respaldatorios
  };

  // Documento soporte
  documentoUrl?: string;
  fuenteDatos:
    | 'declaracion_jurada'
    | 'balance_auditado'
    | 'estimacion'
    | 'importado';

  // Valores del período anterior (para comparativos)
  valoresAnteriores?: {
    situacionPatrimonial?: FinancialSnapshot['situacionPatrimonial'];
    estadoResultados?: FinancialSnapshot['estadoResultados'];
  };

  // Auditoría - Relación con Personal
  registradoPor: {
    userId: string;
    nombre: string;
    cargo?: string;
  };
  createdAt: string;
}

// =============================================================================
// SNAPSHOTS PATRIMONIALES
// =============================================================================

export interface PatrimonioSnapshot {
  id: string;
  organizationId: string;
  clienteId: string;

  fechaRegistro: string;

  // Bienes registrados en este momento
  maquinarias: {
    tipo: string;
    marca: string;
    modelo: string;
    año: number;
    valorActual: number;
    propiedad: 'propia' | 'leasing' | 'comodato';
  }[];

  inmuebles: {
    tipo: string;
    ubicacion: string;
    superficie: number;
    valorEstimado: number;
    tieneGravamen: boolean;
  }[];

  otrosBienes: {
    descripcion: string;
    valor: number;
  }[];

  // Totales calculados
  totalMaquinarias: number;
  totalInmuebles: number;
  totalOtrosBienes: number;
  patrimonioTotal: number;

  // Delta vs registro anterior (calculado al guardar)
  variacionAbsoluta?: number;
  variacionPorcentaje?: number;

  // Auditoría - Relación con Personal
  registradoPor: {
    userId: string;
    nombre: string;
    cargo?: string;
  };
  createdAt: string;
}

// =============================================================================
// HISTORIAL DE SCORING (INMUTABLE)
// =============================================================================

export type CategoriaScoring = 'A' | 'B' | 'C' | 'REPROBADO';

export interface ScoringHistoryRecord {
  id: string;
  organizationId: string;
  clienteId: string;

  fechaEvaluacion: string;
  versionModelo: string; // "v1.0" para trazabilidad de cambios en modelo

  // Resultado
  puntajeTotal: number; // 0-10
  categoria: CategoriaScoring;
  lineaCreditoCalculada: number;

  // Factores evaluados con detalle
  factoresEvaluados: {
    nombre: string;
    peso: number;
    puntajeObtenido: number;
    justificacion?: string;
  }[];

  // FOTO DE DATOS al momento de evaluar (para auditoría)
  snapshotDatos: {
    // Datos financieros usados
    patrimonioNeto: number;
    liquidez: number;
    ventasAnuales: number;

    // Datos productivos (SIG-Agro)
    hectareas?: number;
    rindePromedio?: number;

    // Datos Nosis (si se consultó)
    nosisScore?: number;
    nosisSituacionBcra?: number;
    nosisFechaConsulta?: string;
  };

  // Vigencia
  vigenciaHasta: string;
  estado: 'vigente' | 'vencido' | 'reemplazado';

  // Auditoría - QUIÉN hizo la evaluación
  evaluadoPor: {
    userId: string;
    nombre: string;
    cargo?: string;
    departamento?: string;
  };

  // Si fue aprobado/revisado por supervisor
  aprobadoPor?: {
    userId: string;
    nombre: string;
    cargo?: string;
    fechaAprobacion: string;
    observaciones?: string;
  };

  createdAt: string;
}

// =============================================================================
// CONSULTAS NOSIS (LOG INMUTABLE)
// =============================================================================

export interface NosisConsultaHistorica {
  id: string;
  organizationId: string;
  clienteId: string;
  cuit: string;

  fechaConsulta: string;
  tipoConsulta: 'veraz' | 'nosis_score' | 'situacion_crediticia' | 'completo';

  // Request/Response para debugging
  requestEnviado?: string;
  responseRecibido?: object;

  // Datos extraídos
  scoreObtenido?: number;
  situacionBcra?: number;
  chequesRechazados?: number;
  juiciosActivos?: number;

  // Estado
  estado: 'exitoso' | 'error' | 'timeout';
  errorMensaje?: string;
  tiempoRespuestaMs: number;

  // API Key usada (solo últimos 4 dígitos por seguridad)
  apiKeyUsada: string;

  // Auditoría - Quién solicitó la consulta
  solicitadoPor: {
    userId: string;
    nombre: string;
  };

  createdAt: string;
}

// =============================================================================
// DOCUMENTOS VERSIONADOS
// =============================================================================

export interface DocumentoVersion {
  id: string;
  organizationId: string;
  clienteId: string;

  // Identificador del documento (ej: "balance_2024", "escritura_campo_1")
  documentoBaseId: string;
  version: number;

  // Metadata
  nombreArchivo: string;
  tipoDocumento:
    | 'balance'
    | 'escritura'
    | 'estatuto'
    | 'contrato'
    | 'informe_dominio'
    | 'otro';
  descripcion?: string;

  // Storage
  storageUrl: string;
  tamaño: number;
  mimeType: string;

  // Vigencia
  fechaDocumento?: string; // Fecha del documento en sí
  fechaCarga: string; // Cuándo se subió
  esVersionActual: boolean;

  // Auditoría
  subidoPor: {
    userId: string;
    nombre: string;
  };

  createdAt: string;
}

// =============================================================================
// DTOs PARA CREACIÓN
// =============================================================================

export interface CreateFinancialSnapshotData {
  tipoSnapshot: TipoSnapshotFinanciero;
  periodo: string;
  situacionPatrimonial?: FinancialSnapshot['situacionPatrimonial'];
  estadoResultados?: FinancialSnapshot['estadoResultados'];
  declaracionMensual?: FinancialSnapshot['declaracionMensual'];
  documentoUrl?: string;
  fuenteDatos: FinancialSnapshot['fuenteDatos'];
}

export interface CreatePatrimonioSnapshotData {
  maquinarias: PatrimonioSnapshot['maquinarias'];
  inmuebles: PatrimonioSnapshot['inmuebles'];
  otrosBienes: PatrimonioSnapshot['otrosBienes'];
}

export interface CreateScoringData {
  factoresEvaluados: ScoringHistoryRecord['factoresEvaluados'];
  snapshotDatos: ScoringHistoryRecord['snapshotDatos'];
  vigenciaDias?: number;
}
