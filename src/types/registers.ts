// Editor de Registros Configurables — tipos base
// Infraestructura core (no plugin) para registros operativos con trazabilidad de compliance

export type RegisterFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'user'
  | 'file'
  | 'relation';

export interface RegisterFieldSchema {
  id: string;
  label: string;
  type: RegisterFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];           // para select / multiselect
  relation_collection?: string; // para type 'relation'
  visible_in_kanban?: boolean;
  visible_in_list?: boolean;
  order: number;
}

export interface RegisterStage {
  id: string;
  label: string;
  color: string;                // hex, ej: '#22c55e'
  order: number;
  requires_approval?: boolean;
  allowed_roles?: string[];
  // compliance: bloqueado si existen entradas históricas en este stage
  locked?: boolean;
}

export interface RegisterAutomation {
  id: string;
  trigger_field: string;        // field_id que dispara la automatización
  trigger_value: unknown;
  action: 'create_hallazgo' | 'notify_role' | 'change_stage';
  action_payload?: Record<string, unknown>;
  enabled: boolean;
}

export type NormaISOReg =
  | 'ISO_9001'
  | 'ISO_14001'
  | 'ISO_45001'
  | 'ISO_27001'
  | 'ISO_18091'
  | 'CUSTOM';

export interface CustomRegisterSchema {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  icon?: string;                // nombre de icono lucide
  norma_referencia?: NormaISOReg;
  clausula_referencia?: string; // ej: '8.1'
  fields: RegisterFieldSchema[];
  stages: RegisterStage[];
  has_kanban: boolean;
  // compliance: usar 'full' siempre que norma_referencia esté presente
  audit_level: 'basic' | 'full';
  automations?: RegisterAutomation[];
  active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterAuditEvent {
  id: string;
  changed_by: string;
  changed_at: Date;
  action: 'created' | 'updated' | 'stage_changed' | 'approved' | 'field_changed';
  field_id?: string;
  old_value?: unknown;
  new_value?: unknown;
  note?: string;
}

export interface CustomRegisterEntry {
  id: string;
  schema_id: string;
  organization_id: string;
  stage_id: string;
  title?: string;               // primer campo texto o campo calculado
  data: Record<string, unknown>;
  // compliance: append-only — nunca modificar entradas existentes del trail
  audit_trail: RegisterAuditEvent[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterEntryFilters {
  schema_id: string;
  stage_id?: string;
  created_by?: string;
  date_from?: Date;
  date_to?: Date;
  search?: string;
}
