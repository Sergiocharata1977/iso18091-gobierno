// Types for Quality Checklists System

/**
 * Tipo de campo disponible en un checklist
 */
export type ChecklistFieldType =
  | 'texto' // Texto libre
  | 'numero' // Número con unidad opcional
  | 'si_no' // Checkbox (Sí/No)
  | 'seleccion' // Lista de opciones
  | 'fecha' // Selector de fecha
  | 'firma'; // Campo de firma

/**
 * Definición de un campo en una plantilla de checklist
 */
export interface ChecklistField {
  id: string;
  orden: number;
  tipo: ChecklistFieldType;
  etiqueta: string; // Label del campo
  descripcion?: string; // Instrucciones adicionales
  requerido: boolean;
  opciones?: string[]; // Para tipo 'seleccion'
  valor_esperado?: string; // Valor de referencia/esperado
  valor_minimo?: number; // Para tipo 'numero'
  valor_maximo?: number; // Para tipo 'numero'
  unidad?: string; // Unidad de medida (kg, °C, etc.)
}

/**
 * Plantilla de Checklist (definición)
 */
export interface ChecklistTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  codigo?: string; // Código único (ej. CHK-REC-001)
  categoria?: 'recepcion' | 'produccion' | 'despacho' | 'auditoria' | 'otro';
  process_definition_id?: string; // Vinculado a definición de proceso
  organization_id: string;
  campos: ChecklistField[];
  activo: boolean;
  version: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Datos para crear/editar plantilla
 */
export interface ChecklistTemplateFormData {
  nombre: string;
  descripcion: string;
  codigo?: string;
  categoria?: 'recepcion' | 'produccion' | 'despacho' | 'auditoria' | 'otro';
  process_definition_id?: string;
  campos: ChecklistField[];
  activo: boolean;
}

/**
 * Respuesta a un campo de checklist
 */
export interface ChecklistAnswer {
  campo_id: string;
  campo_etiqueta: string; // Para referencia
  valor: string | number | boolean | null;
  valor_esperado?: string;
  conforme: boolean | null; // null si no aplica evaluación
  observacion?: string;
}

/**
 * Estado de un registro de checklist
 */
export type ChecklistRecordStatus =
  | 'pendiente'
  | 'en_progreso'
  | 'completado'
  | 'cancelado';

/**
 * Resultado de un checklist completado
 */
export type ChecklistResult = 'conforme' | 'no_conforme' | 'pendiente';

/**
 * Registro de ejecución de un Checklist
 */
export interface ChecklistRecord {
  id: string;
  template_id: string;
  template_nombre: string; // Para referencia rápida
  process_record_id?: string; // Vinculado a registro de proceso
  organization_id: string;
  estado: ChecklistRecordStatus;
  respuestas: ChecklistAnswer[];
  resultado: ChecklistResult;
  items_conformes: number;
  items_no_conformes: number;
  items_totales: number;
  porcentaje_conformidad: number;
  observaciones_generales?: string;
  completado_por_id?: string;
  completado_por_nombre?: string;
  completado_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Datos para crear un nuevo registro de checklist
 */
export interface ChecklistRecordFormData {
  template_id: string;
  process_record_id?: string;
  observaciones_generales?: string;
}

/**
 * Categorías de checklist con información visual
 */
export const CHECKLIST_CATEGORIES = {
  recepcion: {
    label: 'Recepción',
    color: 'bg-blue-100 text-blue-800',
    icon: '📦',
  },
  produccion: {
    label: 'Producción',
    color: 'bg-green-100 text-green-800',
    icon: '⚙️',
  },
  despacho: {
    label: 'Despacho',
    color: 'bg-orange-100 text-orange-800',
    icon: '🚚',
  },
  auditoria: {
    label: 'Auditoría',
    color: 'bg-purple-100 text-purple-800',
    icon: '📋',
  },
  otro: {
    label: 'Otro',
    color: 'bg-gray-100 text-gray-800',
    icon: '📝',
  },
} as const;

/**
 * Tipos de campos con información visual
 */
export const FIELD_TYPES = {
  texto: {
    label: 'Texto',
    icon: '📝',
    description: 'Campo de texto libre',
  },
  numero: {
    label: 'Número',
    icon: '🔢',
    description: 'Valor numérico con unidad opcional',
  },
  si_no: {
    label: 'Sí/No',
    icon: '✅',
    description: 'Checkbox de verificación',
  },
  seleccion: {
    label: 'Selección',
    icon: '📋',
    description: 'Lista de opciones predefinidas',
  },
  fecha: {
    label: 'Fecha',
    icon: '📅',
    description: 'Selector de fecha',
  },
  firma: {
    label: 'Firma',
    icon: '✍️',
    description: 'Campo para firma digital',
  },
} as const;
