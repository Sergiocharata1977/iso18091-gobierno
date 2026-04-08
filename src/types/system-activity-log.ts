export const SYSTEM_ACTIVITY_ACTOR_TYPES = [
  'user',
  'system',
  'ai_agent',
  'terminal',
  'integration',
] as const;

export type SystemActivityActorType =
  (typeof SYSTEM_ACTIVITY_ACTOR_TYPES)[number];

export const SYSTEM_ACTIVITY_CHANNELS = [
  'web',
  'api',
  'automation',
  'ai',
  'terminal',
  'capability',
  'integration',
  'security',
] as const;

export type SystemActivityChannel =
  (typeof SYSTEM_ACTIVITY_CHANNELS)[number];

export const SYSTEM_ACTIVITY_STATUSES = [
  'pending',
  'success',
  'failure',
  'blocked',
  'denied',
  'cancelled',
] as const;

export type SystemActivityStatus =
  (typeof SYSTEM_ACTIVITY_STATUSES)[number];

export const SYSTEM_ACTIVITY_SEVERITIES = [
  'info',
  'low',
  'medium',
  'high',
  'critical',
] as const;

export type SystemActivitySeverity =
  (typeof SYSTEM_ACTIVITY_SEVERITIES)[number];

export const SYSTEM_ACTIVITY_ACTION_TYPES = [
  'create',
  'read',
  'update',
  'delete',
  'iso_audit_created',
  'iso_audit_updated',
  'iso_finding_created',
  'iso_finding_updated',
  'iso_action_created',
  'iso_action_completed',
  'ai_action_requested',
  'ai_action_confirmed',
  'ai_action_rejected',
  'ai_action_executed',
  'ai_action_failed',
  'terminal_tool_executed',
  'terminal_tool_blocked',
  'capability_installed',
  'capability_enabled',
  'capability_disabled',
  'capability_uninstalled',
  'security_login',
  'security_logout',
  'security_access_denied',
  'security_permission_changed',
] as const;

export type SystemActivityActionType =
  (typeof SYSTEM_ACTIVITY_ACTION_TYPES)[number];

export interface SystemActivityRelatedEntity {
  entity_type: string;
  entity_id: string;
  entity_code?: string | null;
  relation?: string | null;
}

export interface SystemActivityEvidenceRef {
  type: string;
  id: string;
  label?: string | null;
  url?: string | null;
}

export interface SystemActivityActorMetadata {
  actor_type: SystemActivityActorType;
  actor_user_id: string | null;
  actor_display_name: string | null;
  actor_role: string | null;
  actor_department_id: string | null;
  actor_department_name: string | null;
}

export interface SystemActivityBaseEntry extends SystemActivityActorMetadata {
  organization_id: string;
  occurred_at: Date;
  recorded_at: Date;
  source_module: string;
  source_submodule: string | null;
  channel: SystemActivityChannel;
  entity_type: string;
  entity_id: string | null;
  entity_code: string | null;
  action_type: SystemActivityActionType;
  action_label: string;
  description: string;
  status: SystemActivityStatus;
  severity: SystemActivitySeverity;
  related_entities: SystemActivityRelatedEntity[];
  evidence_refs: SystemActivityEvidenceRef[];
  correlation_id: string | null;
  metadata?: Record<string, unknown>;
}

export interface SystemActivityLogEntry extends SystemActivityBaseEntry {
  id: string;
}

export interface SystemActivityLogWriteInput
  extends Omit<SystemActivityBaseEntry, 'recorded_at'> {
  recorded_at?: Date;
}

export interface SystemActivityLogFilters {
  organization_id?: string;
  actor_user_id?: string;
  actor_department_id?: string;
  source_module?: string;
  source_submodule?: string;
  channel?: SystemActivityChannel;
  entity_type?: string;
  entity_id?: string;
  action_type?: SystemActivityActionType;
  status?: SystemActivityStatus;
  severity?: SystemActivitySeverity;
  correlation_id?: string;
  occurred_from?: Date;
  occurred_to?: Date;
  recorded_from?: Date;
  recorded_to?: Date;
  limit?: number;
}
