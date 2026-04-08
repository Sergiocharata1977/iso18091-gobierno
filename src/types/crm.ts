/**
 * Tipos TypeScript para el Módulo CRM
 * Sistema de gestión de clientes B2B con scoring crediticio y pipeline Kanban
 */

import type { ClasificacionesMap } from './crm-clasificacion';

// ============================================================================
// ENUMS Y TIPOS BASE
// ============================================================================

/**
 * Clasificación de clientes según frecuencia de compra
 */
export enum TipoCliente {
  POSIBLE_CLIENTE = 'posible_cliente', // Lead, prospecto sin compras
  CLIENTE_FRECUENTE = 'cliente_frecuente', // Cliente activo con compras regulares (≥3 en 12 meses)
  CLIENTE_ANTIGUO = 'cliente_antiguo', // Cliente histórico, última compra >12 meses
}

/**
 * Categorías de riesgo crediticio según scoring
 */
export enum CategoriaRiesgo {
  A = 'A', // 8.00 - 10.00: Riesgo muy bueno
  B = 'B', // 6.00 - 7.99: Riesgo aceptable
  C = 'C', // 4.00 - 5.99: Riesgo moderado
  D = 'D', // 2.00 - 3.99: Riesgo malo
  E = 'E', // 0.00 - 1.99: Riesgo muy malo / Reprobado
}

/**
 * Niveles de impacto para factores de scoring
 */
export type NivelImpacto = 'bajo' | 'medio' | 'alto';

/**
 * Niveles de probabilidad
 */
export type NivelProbabilidad = 'baja' | 'media' | 'alta';

// ============================================================================
// SISTEMA KANBAN
// ============================================================================

/**
 * Estado personalizable del pipeline Kanban
 */
export interface EstadoClienteKanban {
  id: string;
  nombre: string; // Ej: "Prospecto", "Contactado", "Gestión Crediticia"
  color: string; // Color hex para visualización
  orden: number; // Orden de la columna en el tablero
  organization_id: string; // Multi-tenant: ID de la organización
  tipo: string; // Tipo de Kanban: 'crm', 'rrhh', etc.
  descripcion?: string;
  requires_credit_workflow?: boolean;
  credit_workflow_trigger?: 'entry';
  es_estado_final: boolean; // Ej: "Cliente Activo", "Rechazado"
  permite_edicion: boolean; // Estados del sistema no editables
  created_at: string;
  updated_at: string;
}

/**
 * Configuración del tablero Kanban
 */
export interface ConfiguracionKanban {
  id: string;
  estados: EstadoClienteKanban[];
  flujos_permitidos?: Array<{
    // Validación de transiciones
    desde_estado_id: string;
    hacia_estado_id: string;
  }>;
  updated_at: string;
}

/**
 * Historial de cambios de estado
 */
export interface HistorialEstadoCliente {
  estado_anterior_id: string;
  estado_anterior_nombre: string;
  estado_nuevo_id: string;
  estado_nuevo_nombre: string;
  fecha_cambio: string;
  usuario_id: string;
  usuarioNombre?: string;
  motivo?: string;
}

// ============================================================================
// DATOS FINANCIEROS
// ============================================================================

/**
 * Datos financieros del cliente para análisis de capacidad de pago
 */
export interface DatosFinancieros {
  // Liquidez
  activo_corriente: number;
  pasivo_corriente: number;
  liquidez_corriente?: number; // Calculado: activo_corriente / pasivo_corriente

  // Capacidad de pago
  ventas_anuales: number;
  deudas_totales: number;
  ratio_compromiso?: number; // Calculado: deudas_totales / ventas_anuales

  // Capacidad productiva (específico Agro)
  hectareas_cultivadas?: number;
  capacidad_productiva_porcentaje: number; // 0-100
  tipo_cultivo?: string[];

  // Solvencia patrimonial
  bienes_muebles: number;
  maquinaria_agricola: number;
  inmuebles: number;
  otros_activos: number;
  patrimonio_total?: number; // Calculado: suma de bienes

  // Comportamiento de pago
  historico_pagos_puntuales: number; // Porcentaje 0-100
  indice_morosidad: number; // Porcentaje 0-100

  // Metadata
  fecha_actualizacion: string;
  fuente_datos?: string; // Ej: "Declaración jurada", "Balance auditado"
}

// ============================================================================
// SISTEMA DE SCORING
// ============================================================================

/**
 * Indicador individual dentro de un factor de scoring
 */
export interface IndicadorScoring {
  nombre: string; // Ej: "Liquidez corriente"
  valor_cliente: number; // Valor actual del cliente
  puntaje_asignado: number; // Puntaje obtenido (0-10)
  peso_indicador?: number; // Peso dentro del factor (opcional)
  rango_referencia?: {
    // Rangos para calificación
    min: number;
    max: number;
    puntaje: number;
  }[];
}

/**
 * Factor de evaluación del scoring (grupo de indicadores)
 */
export interface FactorScoring {
  nombre: string; // Ej: "Capacidad de Pago"
  peso: number; // Peso ponderado (0-1, suma total = 1)
  indicadores: IndicadorScoring[];
  puntaje_total?: number; // Suma ponderada de indicadores
}

/**
 * Configuración del sistema de scoring
 */
export interface ConfiguracionScoring {
  id: string;
  nombre: string; // Ej: "Scoring Crediticio Agro v1.0"
  version: string;
  factores: FactorScoring[];
  umbrales_categorias: Array<{
    categoria: CategoriaRiesgo;
    puntaje_minimo: number;
    puntaje_maximo: number;
    color: string;
    descripcion: string;
  }>;
  vigente: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Resultado de evaluación de scoring
 */
export interface ResultadoScoring {
  id: string;
  cliente_id: string;
  cliente_nombre: string;

  // Resultados
  puntaje_total: number; // 0-10
  categoria_riesgo: CategoriaRiesgo;
  descripcion_categoria?: string;

  // Detalle por factores
  capacidad_pago: {
    puntaje: number;
    peso: number;
    puntaje_ponderado: number;
  };
  comportamiento_pago: {
    puntaje: number;
    peso: number;
    puntaje_ponderado: number;
  };
  solvencia_patrimonial: {
    puntaje: number;
    peso: number;
    puntaje_ponderado: number;
  };

  factores?: Array<{
    nombre: string;
    valor: number;
    peso: number;
  }>;

  // Metadata
  configuracion_scoring_id: string;
  configuracion_version: string;
  fecha_evaluacion: string;
  evaluador_id: string;
  evaluador_nombre?: string;

  // Recomendaciones
  recomendaciones?: string[];
  observaciones?: string;

  // Auditoría
  datos_financieros_snapshot: DatosFinancieros; // Snapshot para trazabilidad
}

// ============================================================================
// LÍNEA DE CRÉDITO
// ============================================================================

/**
 * Línea de crédito determinada para un cliente
 */
export interface LineaCredito {
  id: string;
  cliente_id: string;
  cliente_nombre: string;

  // Cálculos
  capacidad_operativa: number; // ventas_anuales * porcentaje_afectacion
  capital_disponible: number; // patrimonio * relacion_permitida
  limite_credito_final: number; // MIN(capacidad_operativa, capital_disponible)
  limite_incremental: number; // limite_credito_final * 0.05 (5%)

  // Parámetros utilizados
  porcentaje_afectacion: number; // Según categoría de riesgo
  relacion_permitida: number; // Según categoría de riesgo

  // Estado
  monto_utilizado: number; // Crédito ya utilizado
  monto_disponible: number; // Calculado: limite_credito_final - monto_utilizado
  porcentaje_utilizacion: number; // Calculado: (monto_utilizado / limite_credito_final) * 100

  // Vigencia
  fecha_aprobacion: string;
  fecha_vencimiento: string;
  estado: 'vigente' | 'vencida' | 'suspendida' | 'cancelada';

  // Relaciones
  scoring_id: string; // Referencia al scoring que generó esta línea
  categoria_riesgo: CategoriaRiesgo;

  // Metadata
  aprobado_por_id: string;
  aprobado_por_nombre?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Historial de operaciones crediticias
 */
export interface OperacionCredito {
  id: string;
  cliente_id: string;
  linea_credito_id: string;

  tipo: 'uso' | 'pago' | 'ajuste';
  monto: number;
  saldo_anterior: number;
  saldo_nuevo: number;

  fecha_operacion: string;
  concepto: string;
  referencia?: string; // Ej: número de factura

  usuario_id: string;
  usuario_nombre?: string;
}

// ============================================================================
// CLIENTE CRM
// ============================================================================

/**
 * Cliente B2B en el sistema CRM
 */
export interface ClienteCRM {
  id: string;
  organization_id?: string;

  // Información básica
  razon_social: string;
  nombre_comercial?: string;
  cuit_cuil: string;

  // Clasificación
  tipo_cliente: TipoCliente;
  categoria_riesgo?: CategoriaRiesgo;

  // Estado en pipeline Kanban
  estado_kanban_id: string;
  estado_kanban_nombre: string; // Desnormalizado para performance
  historial_estados: HistorialEstadoCliente[];

  // Datos de contacto
  email: string;
  telefono: string;
  whatsapp_phone?: string;           // Número WhatsApp si difiere del teléfono principal (E.164)
  preferred_channel?: 'whatsapp' | 'llamada' | 'email';
  direccion: string;
  localidad: string;
  provincia: string;
  codigo_postal?: string;

  // Datos comerciales
  responsable_id: string; // Vendedor asignado
  responsable_nombre?: string;

  // Datos de oportunidad (cuando es Posible Cliente)
  monto_estimado_compra?: number;
  probabilidad_conversion?: number; // 0-100
  fecha_cierre_estimada?: string;
  productos_interes?: string[];

  // Datos financieros
  datos_financieros?: DatosFinancieros;

  // Scoring y crédito
  ultimo_scoring_id?: string;
  ultimo_scoring_fecha?: string;
  linea_credito_vigente_id?: string;
  limite_credito_actual?: number;

  // Historial de compras
  fecha_primera_compra?: string;
  fecha_ultima_compra?: string;
  total_compras_12m: number;
  cantidad_compras_12m: number;
  monto_total_compras_historico: number;

  // Interacciones
  ultima_interaccion: string;
  proxima_accion?: {
    tipo: 'llamada' | 'visita' | 'email' | 'seguimiento';
    fecha_programada: string;
    descripcion: string;
  };

  // Documentación
  documentos_adjuntos?: Array<{
    nombre: string;
    url: string;
    tipo: 'balance' | 'declaracion_jurada' | 'escritura' | 'otro';
    fecha_subida: string;
  }>;

  // Clasificaciones comerciales editables (configuradas por organización)
  classifications?: ClasificacionesMap;

  // Notas y observaciones
  notas: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  isActive: boolean;
}

// ============================================================================
// MÉTRICAS DE PENETRACIÓN DE MERCADO
// ============================================================================

/**
 * Métricas de penetración de mercado (ISO 9001)
 */
export interface MetricasPenetracionMercado {
  // Período de análisis
  fecha_inicio: string;
  fecha_fin: string;

  // Contadores
  total_posibles_clientes: number;
  total_clientes_frecuentes: number;
  total_clientes_antiguos: number;

  // Conversión
  oportunidades_abiertas: number;
  oportunidades_ganadas: number;
  oportunidades_perdidas: number;
  tasa_conversion: number; // (ganadas / abiertas) * 100

  // Retención
  clientes_retenidos: number;
  clientes_perdidos: number; // Frecuente → Antiguo
  tasa_retencion: number; // (retenidos / (retenidos + perdidos)) * 100

  // Clientes no atendidos
  posibles_clientes_sin_contacto_30d: number;
  posibles_clientes_sin_contacto_60d: number;
  posibles_clientes_sin_contacto_90d: number;

  // Pipeline
  monto_total_pipeline: number; // Suma de montos estimados
  monto_promedio_oportunidad: number;

  // Por estado Kanban
  distribucion_por_estado: Array<{
    estado_id: string;
    estado_nombre: string;
    cantidad_clientes: number;
    monto_total: number;
  }>;

  // Por categoría de riesgo
  distribucion_por_riesgo: Array<{
    categoria: CategoriaRiesgo;
    cantidad_clientes: number;
    monto_credito_total: number;
  }>;
}

/**
 * Cliente no atendido (alerta)
 */
export interface ClienteNoAtendido {
  cliente_id: string;
  razon_social: string;
  tipo_cliente: TipoCliente;
  estado_kanban_nombre: string;
  dias_sin_contacto: number;
  ultima_interaccion: string;
  responsable_id: string;
  responsable_nombre: string;
  monto_estimado?: number;
  prioridad: 'baja' | 'media' | 'alta';
}

/**
 * Oportunidad perdida
 */
export interface OportunidadPerdida {
  cliente_id: string;
  razon_social: string;
  monto_estimado: number;
  fecha_rechazo: string;
  motivo_rechazo: string;
  categoria_riesgo?: CategoriaRiesgo;
  responsable_nombre: string;
  posible_recuperacion: boolean;
  fecha_revision_sugerida?: string;
}

// ============================================================================
// TIPOS PARA CREACIÓN Y ACTUALIZACIÓN
// ============================================================================

/**
 * Datos para crear un nuevo cliente
 */
export interface CreateClienteCRMData {
  razon_social: string;
  nombre_comercial?: string;
  cuit_cuil: string;
  tipo_cliente: TipoCliente;
  estado_kanban_id: string;
  email: string;
  telefono: string;
  whatsapp_phone?: string;
  preferred_channel?: 'whatsapp' | 'llamada' | 'email';
  direccion: string;
  localidad: string;
  provincia: string;
  codigo_postal?: string;
  responsable_id: string;
  monto_estimado_compra?: number;
  probabilidad_conversion?: number;
  fecha_cierre_estimada?: string;
  productos_interes?: string[];
  notas?: string;
}

/**
 * Datos para actualizar un cliente
 */
export interface UpdateClienteCRMData extends Partial<CreateClienteCRMData> {
  categoria_riesgo?: CategoriaRiesgo;
  datos_financieros?: DatosFinancieros;
  proxima_accion?: ClienteCRM['proxima_accion'];
}

/**
 * Datos para mover cliente en Kanban
 */
export interface MoverClienteKanbanData {
  cliente_id: string;
  estado_nuevo_id: string;
  motivo?: string;
  usuario_id: string;
}

/**
 * Datos para crear estado Kanban
 */
export interface CreateEstadoKanbanData {
  nombre: string;
  color: string;
  orden: number; // Made required to match schema
  descripcion?: string;
  es_estado_final?: boolean;
  requires_credit_workflow?: boolean;
  credit_workflow_trigger?: 'entry';
  organization_id?: string;
  tipo?: string;
}

/**
 * Datos para calcular scoring
 */
export interface CalcularScoringData {
  cliente_id: string;
  datos_financieros: DatosFinancieros;
  configuracion_scoring_id?: string; // Si no se provee, usa la configuración vigente
  evaluador_id: string;
  observaciones?: string;
}

/**
 * Datos para calcular línea de crédito
 */
export interface CalcularLineaCreditoData {
  cliente_id: string;
  scoring_id: string;
  fecha_vencimiento: string;
  aprobado_por_id: string;
  observaciones?: string;
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

/**
 * Filtros para búsqueda de clientes
 */
export interface FiltrosClienteCRM {
  tipo_cliente?: TipoCliente;
  categoria_riesgo?: CategoriaRiesgo;
  estado_kanban_id?: string;
  responsable_id?: string;
  search?: string; // Búsqueda por razón social
  fecha_desde?: string;
  fecha_hasta?: string;
}

/**
 * Opciones de ordenamiento
 */
export interface OrdenamientoClienteCRM {
  campo:
    | 'razon_social'
    | 'fecha_ultima_compra'
    | 'monto_estimado_compra'
    | 'ultima_interaccion';
  direccion: 'asc' | 'desc';
}
