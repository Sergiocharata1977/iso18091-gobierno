/**
 * Tipos para el Sistema Unificado de Eventos
 * Colección: events
 */

// === ENUMS ===

export type TipoEvento =
  | 'auditoria'
  | 'capacitacion'
  | 'evaluacion'
  | 'mantenimiento'
  | 'accion_correctiva'
  | 'accion_preventiva'
  | 'reunion'
  | 'documento_vencimiento'
  | 'otro';

export type ModuloOrigen =
  | 'audits'
  | 'trainings'
  | 'evaluations'
  | 'maintenance'
  | 'actions'
  | 'documents'
  | 'manual';

export type EstadoEvento =
  | 'programado'
  | 'en_progreso'
  | 'completado'
  | 'cancelado'
  | 'postergado';

export type PrioridadEvento = 'baja' | 'media' | 'alta' | 'critica';

// === INTERFACES ===

export interface EventOrigen {
  modulo: ModuloOrigen;
  coleccion: string;
  documento_id: string;
  numero_referencia?: string;
}

export interface UnifiedEvent {
  // Identificación
  id: string;
  organization_id: string;

  // Información básica
  titulo: string;
  descripcion?: string;
  tipo_evento: TipoEvento;

  // Fechas
  fecha_inicio: Date;
  fecha_fin?: Date;
  todo_el_dia: boolean;

  // Responsables
  responsable_id: string;
  responsable_nombre: string;
  participantes_ids?: string[];

  // Estado y prioridad
  estado: EstadoEvento;
  prioridad: PrioridadEvento;

  // Referencia al origen
  origen: EventOrigen;

  // Metadata específica del tipo
  meta: Record<string, any>;

  // Control
  activo: boolean;
  recurrente: boolean;
  regla_recurrencia?: string;

  // Auditoría
  created_at: Date;
  updated_at: Date;
  created_by: string;
  created_by_nombre: string;
}

// === FORM DATA ===

export interface UnifiedEventFormData {
  titulo: string;
  descripcion?: string;
  tipo_evento: TipoEvento;
  fecha_inicio: string; // ISO string from form
  fecha_fin?: string;
  todo_el_dia: boolean;
  responsable_id: string;
  responsable_nombre: string;
  participantes_ids?: string[];
  estado: EstadoEvento;
  prioridad: PrioridadEvento;
  origen?: EventOrigen;
  meta?: Record<string, any>;
}

// === CONFIGURACIÓN VISUAL ===

export const EVENT_TYPE_CONFIG: Record<
  TipoEvento,
  { color: string; bgColor: string; icon: string; label: string }
> = {
  auditoria: {
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: '🔍',
    label: 'Auditoría',
  },
  capacitacion: {
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: '📚',
    label: 'Capacitación',
  },
  evaluacion: {
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: '📋',
    label: 'Evaluación',
  },
  mantenimiento: {
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: '🔧',
    label: 'Mantenimiento',
  },
  accion_correctiva: {
    color: '#DC2626',
    bgColor: '#FEE2E2',
    icon: '⚠️',
    label: 'Acción Correctiva',
  },
  accion_preventiva: {
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: '✅',
    label: 'Acción Preventiva',
  },
  reunion: {
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: '👥',
    label: 'Reunión',
  },
  documento_vencimiento: {
    color: '#EC4899',
    bgColor: '#FCE7F3',
    icon: '📄',
    label: 'Vencimiento Doc.',
  },
  otro: {
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: '📌',
    label: 'Otro',
  },
};

export const EVENT_STATUS_CONFIG: Record<
  EstadoEvento,
  { color: string; label: string }
> = {
  programado: { color: '#3B82F6', label: 'Programado' },
  en_progreso: { color: '#F59E0B', label: 'En Progreso' },
  completado: { color: '#10B981', label: 'Completado' },
  cancelado: { color: '#EF4444', label: 'Cancelado' },
  postergado: { color: '#8B5CF6', label: 'Postergado' },
};

export const EVENT_PRIORITY_CONFIG: Record<
  PrioridadEvento,
  { color: string; label: string }
> = {
  baja: { color: '#6B7280', label: 'Baja' },
  media: { color: '#3B82F6', label: 'Media' },
  alta: { color: '#F59E0B', label: 'Alta' },
  critica: { color: '#EF4444', label: 'Crítica' },
};
