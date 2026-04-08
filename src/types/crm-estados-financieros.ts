// src/types/crm-estados-financieros.ts
// Tipos para Estados de Situación Patrimonial y Estados de Resultados
// Formato: Consejo Profesional de Ciencias Económicas

// ========================================
// ESTADO DE SITUACIÓN PATRIMONIAL
// ========================================

export interface ActivoCorriente {
  caja_bancos: number;
  inversiones_temporarias: number;
  creditos_por_ventas: number;
  otros_creditos: number;
  bienes_de_cambio: number;
  otros_activos: number;
}

export interface ActivoNoCorriente {
  creditos_por_ventas: number;
  otros_creditos: number;
  bienes_de_cambio: number;
  bienes_de_uso: number;
  participacion_sociedades: number;
  otras_inversiones: number;
  activos_intangibles: number;
  otros_activos: number;
}

export interface PasivoCorriente {
  deudas_comerciales: number;
  prestamos: number;
  remuneraciones_cargas_sociales: number;
  cargas_fiscales: number;
  anticipos_clientes: number;
  dividendos_pagar: number;
  otras_deudas: number;
  previsiones: number;
}

export interface PasivoNoCorriente {
  deudas: number;
  previsiones: number;
}

export interface PatrimonioNeto {
  capital: number;
  ajuste_capital: number;
  reservas: number;
  resultados_acumulados: number;
  resultado_ejercicio: number; // Calculado desde Estado de Resultados
}

export interface EstadoSituacionPatrimonial {
  id: string;
  organization_id: string;
  crm_organizacion_id: string;
  cliente_nombre: string;
  cliente_cuit: string;

  ejercicio: number; // Año del ejercicio
  fecha_cierre: string; // Fecha de cierre del ejercicio
  fuente_datos: 'declaracion' | 'auditoria' | 'estimacion';

  // Activo
  activo_corriente: ActivoCorriente;
  activo_no_corriente: ActivoNoCorriente;

  // Pasivo
  pasivo_corriente: PasivoCorriente;
  pasivo_no_corriente: PasivoNoCorriente;

  // Patrimonio Neto
  patrimonio_neto: PatrimonioNeto;

  // Calculados automáticamente
  total_activo_corriente: number;
  total_activo_no_corriente: number;
  total_activo: number;
  total_pasivo_corriente: number;
  total_pasivo_no_corriente: number;
  total_pasivo: number;
  total_patrimonio_neto: number;
  total_pasivo_patrimonio: number;

  // Ratios calculados
  liquidez_corriente: number; // Activo Corriente / Pasivo Corriente
  solvencia: number; // Patrimonio Neto / Total Pasivo
  endeudamiento: number; // Total Pasivo / Total Activo

  observaciones?: string;

  created_at: string;
  updated_at: string;
  created_by: string;
}

// ========================================
// ESTADO DE RESULTADOS
// ========================================

export interface ResultadosOperacionesContinuan {
  ventas_netas: number;
  costo_bienes_vendidos: number;
  // ganancia_bruta: Calculado (ventas_netas - costo_bienes_vendidos)

  resultado_valuacion_bienes_cambio: number;
  gastos_comercializacion: number;
  gastos_administracion: number;
  otros_gastos: number;

  resultados_inversiones_relacionados: number;
  resultados_otras_inversiones: number;
  resultados_financieros_activos: number;
  resultados_financieros_pasivos: number;

  otros_ingresos_egresos: number;
  // ganancia_antes_impuestos: Calculado

  impuesto_ganancias: number;
  // ganancia_operaciones_continuan: Calculado
}

export interface ResultadosDescontinuacion {
  resultados_operaciones: number;
  resultados_disposicion_activos: number;
  // ganancia_perdida_descontinuacion: Calculado
}

export interface EstadoResultados {
  id: string;
  organization_id: string;
  crm_organizacion_id: string;
  cliente_nombre: string;
  cliente_cuit: string;

  ejercicio: number;
  fecha_inicio: string;
  fecha_cierre: string;
  fuente_datos: 'declaracion' | 'auditoria' | 'estimacion';

  // Resultados de operaciones que continúan
  resultados_continuan: ResultadosOperacionesContinuan;

  // Resultados por operaciones en descontinuación
  resultados_descontinuacion: ResultadosDescontinuacion;

  // Resultados de operaciones extraordinarias
  resultados_extraordinarios: number;

  // Calculados automáticamente
  ganancia_bruta: number;
  ganancia_antes_impuestos: number;
  ganancia_operaciones_continuan: number;
  ganancia_operaciones_descontinuacion: number;
  ganancia_operaciones_ordinarias: number;
  ganancia_perdida_ejercicio: number; // RESULTADO FINAL

  observaciones?: string;

  created_at: string;
  updated_at: string;
  created_by: string;
}

// ========================================
// DTOs
// ========================================

export interface CreateEstadoSituacionDTO {
  crm_organizacion_id: string;
  cliente_nombre: string;
  cliente_cuit: string;
  ejercicio: number;
  fecha_cierre: string;
  fuente_datos: 'declaracion' | 'auditoria' | 'estimacion';
  activo_corriente: ActivoCorriente;
  activo_no_corriente: ActivoNoCorriente;
  pasivo_corriente: PasivoCorriente;
  pasivo_no_corriente: PasivoNoCorriente;
  patrimonio_neto: Omit<PatrimonioNeto, 'resultado_ejercicio'>;
  observaciones?: string;
}

export interface CreateEstadoResultadosDTO {
  crm_organizacion_id: string;
  cliente_nombre: string;
  cliente_cuit: string;
  ejercicio: number;
  fecha_inicio: string;
  fecha_cierre: string;
  fuente_datos: 'declaracion' | 'auditoria' | 'estimacion';
  resultados_continuan: ResultadosOperacionesContinuan;
  resultados_descontinuacion: ResultadosDescontinuacion;
  resultados_extraordinarios: number;
  observaciones?: string;
}

// ========================================
// DEFAULTS
// ========================================

export const DEFAULT_ACTIVO_CORRIENTE: ActivoCorriente = {
  caja_bancos: 0,
  inversiones_temporarias: 0,
  creditos_por_ventas: 0,
  otros_creditos: 0,
  bienes_de_cambio: 0,
  otros_activos: 0,
};

export const DEFAULT_ACTIVO_NO_CORRIENTE: ActivoNoCorriente = {
  creditos_por_ventas: 0,
  otros_creditos: 0,
  bienes_de_cambio: 0,
  bienes_de_uso: 0,
  participacion_sociedades: 0,
  otras_inversiones: 0,
  activos_intangibles: 0,
  otros_activos: 0,
};

export const DEFAULT_PASIVO_CORRIENTE: PasivoCorriente = {
  deudas_comerciales: 0,
  prestamos: 0,
  remuneraciones_cargas_sociales: 0,
  cargas_fiscales: 0,
  anticipos_clientes: 0,
  dividendos_pagar: 0,
  otras_deudas: 0,
  previsiones: 0,
};

export const DEFAULT_PASIVO_NO_CORRIENTE: PasivoNoCorriente = {
  deudas: 0,
  previsiones: 0,
};

export const DEFAULT_PATRIMONIO_NETO: PatrimonioNeto = {
  capital: 0,
  ajuste_capital: 0,
  reservas: 0,
  resultados_acumulados: 0,
  resultado_ejercicio: 0,
};

export const DEFAULT_RESULTADOS_CONTINUAN: ResultadosOperacionesContinuan = {
  ventas_netas: 0,
  costo_bienes_vendidos: 0,
  resultado_valuacion_bienes_cambio: 0,
  gastos_comercializacion: 0,
  gastos_administracion: 0,
  otros_gastos: 0,
  resultados_inversiones_relacionados: 0,
  resultados_otras_inversiones: 0,
  resultados_financieros_activos: 0,
  resultados_financieros_pasivos: 0,
  otros_ingresos_egresos: 0,
  impuesto_ganancias: 0,
};

export const DEFAULT_RESULTADOS_DESCONTINUACION: ResultadosDescontinuacion = {
  resultados_operaciones: 0,
  resultados_disposicion_activos: 0,
};
