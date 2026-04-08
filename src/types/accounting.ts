/**
 * Tipos base del plugin de Contabilidad Central.
 *
 * Definen el contrato entre plugins operativos, motor contable y capas
 * de persistencia/reporting para mantener un libro unico por organizacion.
 */

export type AccountingCurrency = 'ARS' | 'USD';

export type AccountingAccountNature =
  | 'activo'
  | 'pasivo'
  | 'patrimonio_neto'
  | 'ingreso'
  | 'gasto'
  | 'resultado_positivo'
  | 'resultado_negativo'
  | 'orden';

export type AccountingAccountKind = 'imputable' | 'grupo';

export type AccountingEntryStatus =
  | 'draft'
  | 'posted'
  | 'reversed'
  | 'cancelled';

export type AccountingLineSide = 'debe' | 'haber';

export type AccountingPeriodStatus = 'abierto' | 'cerrado';

export type AccountingRuleStatus = 'draft' | 'active' | 'inactive' | 'archived';

export type AccountingRuleLineAmountSource =
  | 'importe_total'
  | 'importe_capital'
  | 'importe_interes'
  | 'importe_iva'
  | 'importe_otro'
  | 'porcentaje';

export type AccountingClosureStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export type AccountingOutboxStatus = 'pending' | 'processed' | 'failed';

export type AccountingAuditAction =
  | 'entry_created'
  | 'entry_posted'
  | 'entry_reversed'
  | 'entry_cancelled'
  | 'rule_created'
  | 'rule_updated'
  | 'rule_deleted'
  | 'period_opened'
  | 'period_closed'
  | 'closure_started'
  | 'closure_completed'
  | 'closure_failed'
  | 'snapshot_generated'
  | 'plugin_config_updated';

/**
 * Cuenta del plan contable central.
 */
export interface AccountingAccount {
  id: string;
  organization_id: string;
  codigo: string;
  nombre: string;
  naturaleza: AccountingAccountNature;
  tipo: AccountingAccountKind;
  parent_codigo?: string | null;
  nivel?: number;
  acepta_movimientos: boolean;
  moneda?: AccountingCurrency | 'MULTI';
  activa: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Cabecera de asiento contable.
 */
export interface AccountingEntry {
  id: string;
  organization_id: string;
  fecha: string;
  periodo: string;
  origen: string;
  plugin_id: string;
  documento_tipo?: string;
  documento_id: string;
  descripcion: string;
  status: AccountingEntryStatus;
  moneda: AccountingCurrency;
  tipo_cambio?: number;
  total_debe: number;
  total_haber: number;
  tercero_id?: string;
  idempotency_key?: string;
  external_reference?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  posted_at?: string;
  reversed_at?: string;
  cancelled_at?: string;
  cancelled_by?: string;
}

/**
 * Renglon del asiento con soporte para dimensiones operativas.
 */
export interface AccountingEntryLine {
  id: string;
  organization_id: string;
  entry_id: string;
  cuenta_codigo: string;
  cuenta_nombre?: string;
  lado: AccountingLineSide;
  importe: number;
  tercero_id?: string;
  centro_costo?: string;
  unidad_negocio?: string;
  sucursal?: string;
  actividad?: string;
  moneda: AccountingCurrency;
  tipo_cambio?: number;
  descripcion?: string;
  referencia?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Regla contable que transforma un evento operativo en un asiento.
 */
export interface AccountingRule {
  id: string;
  organization_id: string;
  plugin_id: string;
  operation_type: string;
  nombre: string;
  descripcion?: string;
  status: AccountingRuleStatus;
  version: number;
  priority?: number;
  effective_from?: string;
  effective_to?: string;
  applies_when?: Record<string, unknown>;
  lines: AccountingRuleLine[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Definicion de cada renglon derivado por la regla contable.
 */
export interface AccountingRuleLine {
  id: string;
  lado: AccountingLineSide;
  cuenta_semantica?: string;
  cuenta_codigo?: string;
  amount_source: AccountingRuleLineAmountSource;
  formula?: string;
  porcentaje?: number;
  importe_fijo?: number;
  currency?: AccountingCurrency;
  tercero_source?: 'evento.tercero_id' | 'fijo' | 'ninguno';
  tercero_id?: string;
  centro_costo?: string;
  unidad_negocio?: string;
  sucursal?: string;
  actividad?: string;
  descripcion_template?: string;
  required?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Contrato de entrada que emiten los plugins operativos.
 */
export interface AccountingEvent {
  id: string;
  organization_id: string;
  idempotency_key: string;
  plugin_id: string;
  operation_type: string;
  fecha: string;
  periodo?: string;
  moneda: AccountingCurrency;
  tipo_cambio?: number;
  importe_total: number;
  importe_capital?: number;
  importe_interes?: number;
  importe_iva?: number;
  importe_otro?: number;
  documento_tipo?: string;
  documento_id: string;
  tercero_id?: string;
  descripcion?: string;
  dimensiones?: {
    centro_costo?: string;
    unidad_negocio?: string;
    sucursal?: string;
    actividad?: string;
  };
  payload?: Record<string, unknown>;
  occurred_at?: string;
  created_at?: string;
  created_by?: string;
}

export interface AccountingOutboxEntry {
  id: string;
  organization_id: string;
  event_id: string;
  idempotency_key: string;
  plugin_id: string;
  operation_type: string;
  status: AccountingOutboxStatus;
  event: AccountingEvent;
  attempts: number;
  last_error?: string | null;
  process_result?: {
    entry_id: string;
    total_debe: number;
    total_haber: number;
  } | null;
  created_at: string;
  updated_at: string;
  last_attempt_at?: string;
  processed_at?: string;
  failed_at?: string;
  created_by?: string;
}

/**
 * Periodo contable de trabajo y bloqueo operativo.
 */
export interface AccountingPeriod {
  id: string;
  organization_id: string;
  periodo: string;
  status: AccountingPeriodStatus;
  fecha_inicio: string;
  fecha_fin: string;
  cerrado_at?: string;
  cerrado_by?: string;
  motivo_cierre?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Cierre contable con referencia al snapshot consolidado.
 */
export interface AccountingClosure {
  id: string;
  organization_id: string;
  periodo: string;
  status: AccountingClosureStatus;
  snapshot_id: string;
  started_at: string;
  completed_at?: string;
  started_by?: string;
  error_message?: string;
  entries_count?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Snapshot de saldos por cuenta para acelerar reportes y cierres.
 */
export interface AccountingSnapshot {
  id: string;
  organization_id: string;
  periodo: string;
  cuenta_codigo: string;
  moneda: AccountingCurrency;
  saldo_debe: number;
  saldo_haber: number;
  saldo_neto: number;
  tercero_id?: string;
  centro_costo?: string;
  unidad_negocio?: string;
  sucursal?: string;
  actividad?: string;
  generated_at: string;
  generated_by?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Trazabilidad de acciones administrativas y operativas.
 */
export interface AccountingAuditLog {
  id: string;
  organization_id: string;
  action: AccountingAuditAction;
  entity_type:
    | 'account'
    | 'entry'
    | 'rule'
    | 'period'
    | 'closure'
    | 'snapshot'
    | 'plugin_config'
    | 'event';
  entity_id: string;
  performed_by?: string;
  performed_at: string;
  details?: Record<string, unknown>;
  previous_state?: Record<string, unknown> | null;
  next_state?: Record<string, unknown> | null;
  trace_id?: string;
}

/**
 * Configuracion de mapping entre cuentas semanticas y plan contable real.
 */
export interface AccountingPluginConfig {
  id: string;
  organization_id: string;
  plugin_id: string;
  version: number;
  activo: boolean;
  cuentas: Record<string, string>;
  default_moneda?: AccountingCurrency;
  dimensions_enabled?: Array<
    'centro_costo' | 'unidad_negocio' | 'sucursal' | 'actividad'
  >;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}
