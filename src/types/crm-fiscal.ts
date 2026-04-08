/**
 * Tipos TypeScript para el Módulo CRM - Legajo Fiscal
 * Sistema de gestión de información financiera y patrimonial del cliente
 */

// ============================================================================
// DOCUMENTACIÓN FISCAL ANUAL
// ============================================================================

/**
 * Fuente de origen de los datos financieros
 */
export type FuenteDatos =
  | 'declaracion_jurada'
  | 'balance_auditado'
  | 'balance_compilado'
  | 'estimacion_interna';

/**
 * Balance General Anual
 */
export interface Balance {
  id: string;
  ejercicio: string; // "2024"
  fechaCierre: string; // ISO date

  // Activo
  activoCorriente: number; // Disponibilidades + Créditos + Bienes de cambio
  activoNoCorriente: number; // Bienes de uso + Inversiones
  totalActivo: number; // Calculado

  // Pasivo
  pasivoCorriente: number; // Deudas a corto plazo
  pasivoNoCorriente: number; // Deudas a largo plazo
  totalPasivo: number; // Calculado

  // Patrimonio Neto
  patrimonioNeto: number; // = Total Activo - Total Pasivo
  capital: number;
  resultadosAcumulados: number;

  // Ratios calculados
  liquidezCorriente?: number; // Activo Corriente / Pasivo Corriente
  endeudamiento?: number; // Total Pasivo / Patrimonio Neto
  solvencia?: number; // Patrimonio Neto / Total Activo

  // Documentación
  documentoUrl?: string;
  fuenteDatos: FuenteDatos;
  auditor?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Estado de Resultados Anual
 */
export interface EstadoResultados {
  id: string;
  ejercicio: string;
  fechaDesde: string;
  fechaHasta: string;

  // Ingresos
  ventasNetas: number;
  otrosIngresos: number;
  totalIngresos: number;

  // Costos
  costoVentas: number;
  resultadoBruto: number; // = Ventas - Costo Ventas

  // Gastos operativos
  gastosAdministrativos: number;
  gastosComerciales: number;
  resultadoOperativo: number; // = Resultado Bruto - Gastos

  // Resultados financieros
  resultadosFinancieros: number;
  resultadoAntesImpuestos: number;

  // Impuestos y resultado final
  impuestoGanancias: number;
  resultadoNeto: number;

  // Ratios
  margenBruto?: number; // Resultado Bruto / Ventas
  margenNeto?: number; // Resultado Neto / Ventas

  // Documentación
  documentoUrl?: string;
  fuenteDatos: FuenteDatos;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// DOCUMENTACIÓN FISCAL MENSUAL
// ============================================================================

/**
 * Tipo de declaración mensual
 */
export type TipoDeclaracionMensual =
  | 'iva' // IVA mensual
  | 'rentas' // Ingresos brutos provinciales
  | '931' // SUSS/931 - Contribuciones patronales
  | 'ganancias_anticipo'; // Anticipos de ganancias

/**
 * Declaración jurada mensual
 */
export interface DeclaracionMensual {
  id: string;
  tipo: TipoDeclaracionMensual;
  periodo: string; // "2024-12" (YYYY-MM)

  // Montos según tipo
  baseImponible: number;
  impuestoDeterminado: number;
  saldoAFavor?: number;
  saldoAPagar?: number;

  // Específico IVA
  debitoFiscal?: number;
  creditoFiscal?: number;

  // Estado
  presentada: boolean;
  fechaPresentacion?: string;
  numeroPresentacion?: string;

  // Documentación
  documentoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// BIENES Y PATRIMONIO
// ============================================================================

/**
 * Tipos de maquinaria agrícola
 */
export type TipoMaquinaria =
  | 'tractor'
  | 'cosechadora'
  | 'sembradora'
  | 'pulverizadora'
  | 'tolva'
  | 'acoplado'
  | 'implemento'
  | 'otro';

/**
 * Estado de conservación
 */
export type EstadoConservacion = 'excelente' | 'bueno' | 'regular' | 'malo';

/**
 * Maquinaria agrícola
 */
export interface Maquinaria {
  id: string;
  tipo: TipoMaquinaria;
  marca: string;
  modelo: string;
  año: number;

  // Identificación
  patente?: string;
  numeroSerie?: string;

  // Valoración
  valorCompra?: number;
  fechaCompra?: string;
  valorActual: number; // Tasación estimada
  fechaTasacion?: string;

  // Estado
  estadoConservacion: EstadoConservacion;
  horasUso?: number; // Para tractores/cosechadoras

  // Propiedad
  propiedad: 'propia' | 'leasing' | 'comodato';
  gravamen?: string; // Si tiene prenda

  // Documentación
  documentoUrl?: string; // Título, factura
  fotoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Tipo de inmueble
 */
export type TipoInmueble =
  | 'campo_propio'
  | 'campo_arrendado'
  | 'galpon'
  | 'oficina'
  | 'vivienda'
  | 'otro';

/**
 * Inmueble rural o urbano
 */
export interface Inmueble {
  id: string;
  tipo: TipoInmueble;
  descripcion: string;

  // Ubicación
  provincia: string;
  departamento: string;
  localidad?: string;
  direccion?: string;

  // Superficie
  superficieTotal: number; // Hectáreas o m2
  unidadSuperficie: 'hectareas' | 'm2';
  superficieCultivable?: number; // Para campos

  // Valoración
  valorFiscal?: number; // Valor según catastro
  valorMercado?: number; // Tasación
  fechaTasacion?: string;

  // Documentación legal
  matricula?: string;
  partidaInmobiliaria?: string;
  inscripcionRegistro?: string;

  // Gravámenes
  tieneHipoteca: boolean;
  montoHipoteca?: number;
  acreedorHipotecario?: string;

  // Documentación
  escrituraUrl?: string;
  informeDominioUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Otros bienes
 */
export interface OtroBien {
  id: string;
  tipo: 'vehiculo' | 'rodado' | 'semoviente' | 'inversion' | 'otro';
  descripcion: string;
  valorEstimado: number;
  documentoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// LEGAJO FISCAL COMPLETO
// ============================================================================

/**
 * Legajo Fiscal del Cliente - Documento maestro
 */
export interface LegajoFiscal {
  id: string;
  organizationId: string; // Multi-tenant: ID de la organización
  clienteId: string;
  cuit: string; // Clave única para vinculación

  // Documentación anual
  balances: Balance[];
  estadosResultados: EstadoResultados[];

  // Documentación mensual
  declaracionesIVA: DeclaracionMensual[];
  declaracionesRentas: DeclaracionMensual[];
  declaraciones931: DeclaracionMensual[];

  // Bienes patrimoniales
  maquinarias: Maquinaria[];
  inmuebles: Inmueble[];
  otrosBienes: OtroBien[];

  // Resumen calculado
  resumen: {
    patrimonioTotal: number; // Suma de todos los bienes
    ventasAnuales: number; // Último ejercicio
    liquidezPromedio: number;
    ultimaActualizacion: string;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// TIPOS PARA CRUD
// ============================================================================

export interface CreateBalanceData {
  ejercicio: string;
  fechaCierre: string;
  activoCorriente: number;
  activoNoCorriente: number;
  pasivoCorriente: number;
  pasivoNoCorriente: number;
  capital: number;
  resultadosAcumulados: number;
  fuenteDatos: FuenteDatos;
  auditor?: string;
  documentoUrl?: string;
}

export interface CreateEstadoResultadosData {
  ejercicio: string;
  fechaDesde: string;
  fechaHasta: string;
  ventasNetas: number;
  otrosIngresos: number;
  costoVentas: number;
  gastosAdministrativos: number;
  gastosComerciales: number;
  resultadosFinancieros: number;
  impuestoGanancias: number;
  fuenteDatos: FuenteDatos;
  documentoUrl?: string;
}

export interface CreateMaquinariaData {
  tipo: TipoMaquinaria;
  marca: string;
  modelo: string;
  año: number;
  valorActual: number;
  estadoConservacion: EstadoConservacion;
  propiedad: 'propia' | 'leasing' | 'comodato';
  patente?: string;
  numeroSerie?: string;
  horasUso?: number;
  gravamen?: string;
  documentoUrl?: string;
  fotoUrl?: string;
}

export interface CreateInmuebleData {
  tipo: TipoInmueble;
  descripcion: string;
  provincia: string;
  departamento: string;
  localidad?: string;
  superficieTotal: number;
  unidadSuperficie: 'hectareas' | 'm2';
  superficieCultivable?: number;
  valorFiscal?: number;
  valorMercado?: number;
  tieneHipoteca: boolean;
  montoHipoteca?: number;
  acreedorHipotecario?: string;
  matricula?: string;
  escrituraUrl?: string;
}
