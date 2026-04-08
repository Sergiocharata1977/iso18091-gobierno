/**
 * KPI templates predefinidos para municipios — ISO 18091.
 * Cargables con un solo click desde el dashboard /municipio/kpis.
 */

export type GovKpiFrequencia = 'diario' | 'semanal' | 'mensual' | 'trimestral' | 'anual';

export type GovKpiTemplate = {
  codigo: string;
  nombre: string;
  formula: string;
  meta: number;
  unidad: string;
  frecuencia: GovKpiFrequencia;
  /** ID de la dimensión ISO 18091 relacionada */
  dimension_id: 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
};

export const GOV_KPI_TEMPLATES: GovKpiTemplate[] = [
  {
    codigo: 'GOV-KPI-001',
    nombre: 'Tiempo promedio de resolución de expedientes',
    formula: 'Suma de horas de resolución / N° expedientes cerrados',
    meta: 48,
    unidad: 'horas',
    frecuencia: 'mensual',
    dimension_id: 'D1',
  },
  {
    codigo: 'GOV-KPI-002',
    nombre: 'Tasa de resolución de reclamos en plazo',
    formula: 'Reclamos resueltos en SLA / Total reclamos × 100',
    meta: 85,
    unidad: '%',
    frecuencia: 'mensual',
    dimension_id: 'D1',
  },
  {
    codigo: 'GOV-KPI-003',
    nombre: 'NPS Ciudadano',
    formula: 'Promotores% − Detractores%',
    meta: 60,
    unidad: 'puntos',
    frecuencia: 'trimestral',
    dimension_id: 'D1',
  },
  {
    codigo: 'GOV-KPI-004',
    nombre: 'Cumplimiento de Carta de Servicios',
    formula: 'Servicios que cumplen SLA / Total servicios × 100',
    meta: 90,
    unidad: '%',
    frecuencia: 'mensual',
    dimension_id: 'D1',
  },
  {
    codigo: 'GOV-KPI-005',
    nombre: 'Expedientes vencidos',
    formula: 'Expedientes sin resolver pasado SLA / Total abiertos × 100',
    meta: 5,
    unidad: '%',
    frecuencia: 'semanal',
    dimension_id: 'D2',
  },
  {
    codigo: 'GOV-KPI-006',
    nombre: 'Ejecución presupuestaria',
    formula: 'Monto ejecutado / Monto presupuestado × 100',
    meta: 85,
    unidad: '%',
    frecuencia: 'mensual',
    dimension_id: 'D3',
  },
  {
    codigo: 'GOV-KPI-007',
    nombre: 'Satisfacción del ciudadano',
    formula: 'Promedio de encuestas de satisfacción (escala 1–5)',
    meta: 4.0,
    unidad: 'sobre 5',
    frecuencia: 'mensual',
    dimension_id: 'D1',
  },
];

export function getKpiSemaforo(
  valor: number,
  meta: number,
  invertido = false
): 'verde' | 'amarillo' | 'rojo' {
  const ratio = valor / meta;
  if (invertido) {
    if (ratio <= 0.5) return 'verde';
    if (ratio <= 1.0) return 'amarillo';
    return 'rojo';
  }
  if (ratio >= 1.0) return 'verde';
  if (ratio >= 0.8) return 'amarillo';
  return 'rojo';
}
