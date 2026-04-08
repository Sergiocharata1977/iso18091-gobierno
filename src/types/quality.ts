// Tipos de datos para el módulo de Objetivos de Calidad, Indicadores y Mediciones

export interface QualityObjective {
  id: string;
  code: string; // Código único del objetivo
  title: string; // Título descriptivo
  description: string; // Descripción detallada
  type: 'estrategico' | 'tactico' | 'operativo';
  target_value: number; // Valor meta a alcanzar
  current_value: number; // Valor actual
  unit: string; // Unidad de medida
  baseline_value: number; // Valor línea base
  start_date: string; // Fecha de inicio
  due_date: string; // Fecha límite
  completed_date?: string; // Fecha de completado
  status: 'activo' | 'completado' | 'atrasado' | 'cancelado';
  progress_percentage: number; // Porcentaje de avance
  process_definition_id: string; // ID del proceso relacionado
  responsible_user_id: string; // Responsable principal
  department_id?: string; // Departamento responsable
  team_members: string[]; // Miembros del equipo
  alert_threshold: number; // Umbral de alerta (%)
  last_alert_sent?: string; // Última alerta enviada
  organization_id: string;
  is_active: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface QualityIndicator {
  id: string;
  code: string; // Código único del indicador
  name: string; // Nombre del indicador
  description: string; // Descripción y propósito
  type: 'eficacia' | 'eficiencia' | 'efectividad' | 'calidad' | 'productividad';
  formula: string; // Fórmula de cálculo
  unit: string; // Unidad de medida
  measurement_frequency:
    | 'diaria'
    | 'semanal'
    | 'mensual'
    | 'trimestral'
    | 'anual';
  target_min: number; // Meta mínima aceptable
  target_max: number; // Meta máxima deseada
  current_value?: number; // Valor actual
  trend: 'ascendente' | 'descendente' | 'estable';
  data_source: string; // Fuente de los datos
  calculation_method: string; // Método de cálculo
  process_definition_id: string; // ID del proceso relacionado
  objective_id?: string; // ID del objetivo relacionado (opcional)
  responsible_user_id: string; // Responsable de medición
  department_id?: string; // Departamento responsable
  status: 'activo' | 'inactivo' | 'suspendido';
  last_measurement_date?: string; // Última medición
  organization_id: string;
  is_active: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Measurement {
  id: string;
  code?: string; // Código automático MED-[IND]-[YYYYMMDD]
  indicator_id: string; // ID del indicador
  objective_id?: string; // ID del objetivo (opcional)
  process_definition_id: string; // ID del proceso relacionado
  value: number; // Valor medido
  measurement_date: string; // Fecha de medición

  // ✅ Tipo de origen de la medición
  tipo_origen: 'externa' | 'interna';

  // Para mediciones externas (manuales)
  measured_by?: string; // Personnel ID que midió (opcional para internas)
  measurement_method?: string; // Método utilizado
  data_source?: string; // Fuente de los datos (ej: "Termómetro planta")
  notes?: string; // Observaciones (legacy)
  observations?: string; // Observaciones (nuevo campo)
  evidence_url?: string; // URL de evidencia
  evidence_files?: string[]; // Archivos de evidencia

  // Para mediciones internas (sistema)
  calculated_formula?: string; // Fórmula usada para calcular
  source_data_ids?: string[]; // IDs de datos fuente
  auto_generated?: boolean; // true si fue generada automáticamente

  validation_status: 'pendiente' | 'validado' | 'rechazado';
  validated_by?: string; // Quien validó
  validation_date?: string; // Fecha de validación
  validation_notes?: string; // Notas de validación
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Form data types for forms
export interface QualityObjectiveFormData {
  code: string;
  title: string;
  description: string;
  type: 'estrategico' | 'tactico' | 'operativo';
  target_value: number;
  current_value: number;
  unit: string;
  baseline_value: number;
  start_date: string;
  due_date: string;
  process_definition_id: string;
  responsible_user_id: string;
  department_id?: string;
  team_members: string[];
  alert_threshold: number;
}

export interface QualityIndicatorFormData {
  code: string;
  name: string;
  description: string;
  type: 'eficacia' | 'eficiencia' | 'efectividad' | 'calidad' | 'productividad';
  formula: string;
  unit: string;
  measurement_frequency:
    | 'diaria'
    | 'semanal'
    | 'mensual'
    | 'trimestral'
    | 'anual';
  target_min: number;
  target_max: number;
  data_source: string;
  calculation_method: string;
  process_definition_id: string;
  objective_id?: string;
  responsible_user_id: string;
  department_id?: string;
}

export interface MeasurementFormData {
  indicator_id: string;
  objective_id?: string;
  process_definition_id: string;
  value: number;
  measurement_date: string;
  measured_by: string;
  measurement_method: string;
  data_source: string;
  notes?: string;
  evidence_files?: string[];
}
