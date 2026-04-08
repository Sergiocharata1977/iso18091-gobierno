// Types for Process Records System with Kanban

import { Timestamp } from 'firebase/firestore';

// Categorías ISO 9001 - 4 Niveles
export type ProcessCategoryId = 1 | 2 | 3 | 4;
export type ProcessCategoryName =
  | 'estrategia'
  | 'soporte'
  | 'operativo'
  | 'evaluacion';

export const PROCESS_CATEGORIES = {
  1: {
    id: 1,
    name: 'estrategia',
    label: 'Estrategia',
    color: 'bg-blue-100 text-blue-800',
  },
  2: {
    id: 2,
    name: 'soporte',
    label: 'Soporte',
    color: 'bg-yellow-100 text-yellow-800',
  },
  3: {
    id: 3,
    name: 'operativo',
    label: 'Operativo (Core)',
    color: 'bg-green-100 text-green-800',
  },
  4: {
    id: 4,
    name: 'evaluacion',
    label: 'Evaluación',
    color: 'bg-purple-100 text-purple-800',
  },
} as const;

// Process Definition (Template) - Simplificado para creación rápida
export interface ProcessDefinition {
  id: string;

  // Campos ISO 9001
  category_id?: ProcessCategoryId; // 1=Estrategia, 2=Soporte, 3=Operativo, 4=Evaluación
  process_code?: string; // Código corto (2-4 letras): CO, COM, DES, PLAN - usado como prefijo en docs

  codigo?: string; // Código completo auto-generado: 2-CO-001
  nombre: string; // Nombre descriptivo: "Gestión de Compras"
  descripcion?: string;
  objetivo?: string;
  alcance?: string;
  funciones_involucradas?: string[];
  related_norm_points?: string[];
  descripcion_detallada?: string; // Nuevo campo para descripción larga
  categoria?: string; // Mantener por compatibilidad
  documento_origen_id?: string;
  puesto_responsable_id?: string; // Relación con puesto
  jefe_proceso_id?: string; // Relación con Personal
  jefe_proceso_nombre?: string; // Nombre denormalizado
  departamento_responsable_id?: string; // Relacion con Departamento
  departamento_responsable_nombre?: string | null; // Nombre denormalizado
  etapas_default: string[];
  activo: boolean;
  organization_id?: string;

  // Campos de versionado
  version?: number; // 1, 2, 3...
  vigente?: boolean; // true = versión actual, false = histórico
  version_anterior_id?: string; // ID de la versión anterior

  // Campos para documentos asociados
  documentos_ids?: string[]; // IDs de documentos relacionados

  // Campos para registros
  tipo_registros?: 'vincular' | 'crear' | 'ambos'; // Cómo maneja registros
  modulo_vinculado?: 'mejoras' | 'auditorias' | 'nc' | null; // Si vincula a otro módulo

  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
}

export interface ProcessDefinitionFormData {
  // Campos ISO 9001
  category_id?: ProcessCategoryId; // 1=Estrategia, 2=Soporte, 3=Operativo, 4=Evaluación
  process_code?: string; // Código corto: CO, COM, DES, PLAN

  codigo?: string;
  nombre: string; // Único campo requerido
  descripcion?: string;
  objetivo?: string;
  alcance?: string;
  funciones_involucradas?: string[];
  related_norm_points?: string[];
  descripcion_detallada?: string; // Nuevo campo
  categoria?: string;
  documento_origen_id?: string;
  puesto_responsable_id?: string;
  jefe_proceso_id?: string; // Relación con Personal
  jefe_proceso_nombre?: string; // Nombre denormalizado
  departamento_responsable_id?: string;
  departamento_responsable_nombre?: string | null;
  etapas_default?: string[];
  activo?: boolean;
  organization_id?: string; // Multi-tenant support

  // Campos de versionado
  version?: number;
  vigente?: boolean;
  version_anterior_id?: string;

  // Campos para documentos y registros
  documentos_ids?: string[];
  tipo_registros?: 'vincular' | 'crear' | 'ambos';
  modulo_vinculado?: 'mejoras' | 'auditorias' | 'nc' | null;
}

// Process Record (Instance)
export interface ProcessRecord {
  id: string;
  nombre: string;
  descripcion: string;
  process_definition_id: string;
  process_definition_nombre?: string;
  status: 'activo' | 'pausado' | 'completado' | 'cancelado';
  fecha_inicio: Date | Timestamp;
  fecha_fin?: Date | Timestamp;
  responsable_id: string;
  responsable_nombre: string;
  created_by: string;
  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
}

export interface ProcessRecordFormData {
  nombre: string;
  descripcion: string;
  process_definition_id: string;
  status: 'activo' | 'pausado' | 'completado' | 'cancelado';
  fecha_inicio: Date;
  responsable_id: string;
  responsable_nombre: string;
}

// Process Record Stage (Kanban Column)
export interface ProcessRecordStage {
  id: string;
  process_record_id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  orden: number;
  es_etapa_final: boolean;
  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
}

export interface ProcessRecordStageFormData {
  nombre: string;
  descripcion?: string;
  color: string;
  orden: number;
  es_etapa_final: boolean;
}

// Process Record Task (Kanban Card)
export interface ProcessRecordTask {
  id: string;
  process_record_id: string;
  stage_id: string;
  stage_nombre?: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  asignado_a_id?: string;
  asignado_a_nombre?: string;
  fecha_vencimiento?: Date | Timestamp;
  etiquetas: string[];
  archivos_adjuntos: string[];
  comentarios_count: number;
  orden: number;
  created_by: string;
  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
}

export interface ProcessRecordTaskFormData {
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  asignado_a_id?: string;
  asignado_a_nombre?: string;
  fecha_vencimiento?: Date;
  etiquetas: string[];
}

// Process Record Comment
export interface ProcessRecordComment {
  id: string;
  task_id: string;
  process_record_id: string;
  autor_id: string;
  autor_nombre: string;
  contenido: string;
  created_at: Date | Timestamp;
}

export interface ProcessRecordCommentFormData {
  contenido: string;
}

// Stats for Kanban Board
export interface KanbanStats {
  totalCards: number;
  pendingCards: number;
  inProgressCards: number;
  completedCards: number;
}

// Kanban Board Data (for UI)
export interface KanbanBoardData {
  record: ProcessRecord;
  stages: ProcessRecordStage[];
  tasksByStage: Map<string, ProcessRecordTask[]>;
  stats: KanbanStats;
}
