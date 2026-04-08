import { z } from 'zod';
import type {
  SystemActivityActorMetadata,
  SystemActivityEvidenceRef,
  SystemActivityLogEntry,
  SystemActivityLogFilters,
  SystemActivityLogWriteInput,
  SystemActivityRelatedEntity,
} from '@/types/system-activity-log';
import {
  SYSTEM_ACTIVITY_ACTION_TYPES,
  SYSTEM_ACTIVITY_ACTOR_TYPES,
  SYSTEM_ACTIVITY_CHANNELS,
  SYSTEM_ACTIVITY_SEVERITIES,
  SYSTEM_ACTIVITY_STATUSES,
} from '@/types/system-activity-log';

const optionalNullableStringSchema = z
  .string()
  .trim()
  .min(1)
  .nullable();

export const systemActivityActorTypeSchema = z.enum(
  SYSTEM_ACTIVITY_ACTOR_TYPES
);

export const systemActivityChannelSchema = z.enum(SYSTEM_ACTIVITY_CHANNELS);

export const systemActivityStatusSchema = z.enum(SYSTEM_ACTIVITY_STATUSES);

export const systemActivitySeveritySchema = z.enum(SYSTEM_ACTIVITY_SEVERITIES);

export const systemActivityActionTypeSchema = z.enum(
  SYSTEM_ACTIVITY_ACTION_TYPES
);

export const systemActivityRelatedEntitySchema = z.object({
  entity_type: z.string().trim().min(1),
  entity_id: z.string().trim().min(1),
  entity_code: optionalNullableStringSchema.optional(),
  relation: optionalNullableStringSchema.optional(),
});

export const systemActivityEvidenceRefSchema = z.object({
  type: z.string().trim().min(1),
  id: z.string().trim().min(1),
  label: optionalNullableStringSchema.optional(),
  url: optionalNullableStringSchema.optional(),
});

export const systemActivityActorMetadataSchema = z.object({
  actor_type: systemActivityActorTypeSchema,
  actor_user_id: optionalNullableStringSchema,
  actor_display_name: optionalNullableStringSchema,
  actor_role: optionalNullableStringSchema,
  actor_department_id: optionalNullableStringSchema,
  actor_department_name: optionalNullableStringSchema,
});

export const systemActivityLogWriteInputSchema = systemActivityActorMetadataSchema.extend({
  organization_id: z.string().trim().min(1),
  occurred_at: z.coerce.date(),
  recorded_at: z.coerce.date().optional(),
  source_module: z.string().trim().min(1),
  source_submodule: optionalNullableStringSchema,
  channel: systemActivityChannelSchema,
  entity_type: z.string().trim().min(1),
  entity_id: optionalNullableStringSchema,
  entity_code: optionalNullableStringSchema,
  action_type: systemActivityActionTypeSchema,
  action_label: z.string().trim().min(1),
  description: z.string().trim().min(1),
  status: systemActivityStatusSchema,
  severity: systemActivitySeveritySchema,
  related_entities: z.array(systemActivityRelatedEntitySchema).default([]),
  evidence_refs: z.array(systemActivityEvidenceRefSchema).default([]),
  correlation_id: optionalNullableStringSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const systemActivityLogEntrySchema = systemActivityLogWriteInputSchema.extend({
  id: z.string().trim().min(1),
  recorded_at: z.coerce.date(),
});

export const systemActivityLogFiltersSchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  actor_user_id: z.string().trim().min(1).optional(),
  actor_department_id: z.string().trim().min(1).optional(),
  source_module: z.string().trim().min(1).optional(),
  source_submodule: z.string().trim().min(1).optional(),
  channel: systemActivityChannelSchema.optional(),
  entity_type: z.string().trim().min(1).optional(),
  entity_id: z.string().trim().min(1).optional(),
  action_type: systemActivityActionTypeSchema.optional(),
  status: systemActivityStatusSchema.optional(),
  severity: systemActivitySeveritySchema.optional(),
  correlation_id: z.string().trim().min(1).optional(),
  occurred_from: z.coerce.date().optional(),
  occurred_to: z.coerce.date().optional(),
  recorded_from: z.coerce.date().optional(),
  recorded_to: z.coerce.date().optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export function validateSystemActivityLogWriteInput(
  input: unknown
): SystemActivityLogWriteInput {
  return systemActivityLogWriteInputSchema.parse(input);
}

export function validateSystemActivityLogEntry(
  input: unknown
): SystemActivityLogEntry {
  return systemActivityLogEntrySchema.parse(input);
}

export function validateSystemActivityLogFilters(
  input: unknown
): SystemActivityLogFilters {
  return systemActivityLogFiltersSchema.parse(input);
}

export function isSystemActivityLogWriteInput(
  input: unknown
): input is SystemActivityLogWriteInput {
  return systemActivityLogWriteInputSchema.safeParse(input).success;
}
