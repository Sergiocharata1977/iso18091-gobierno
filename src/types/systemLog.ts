import { z } from 'zod';

export type SystemLogLevel = 'error' | 'warn' | 'info';
export type SystemLogSource =
  | 'api'
  | 'middleware'
  | 'service'
  | 'onboarding'
  | 'auth'
  | 'webhook';

export const SystemLogEntrySchema = z.object({
  id: z.string().optional(),
  level: z.enum(['error', 'warn', 'info']),
  source: z.string(),
  message: z.string(),
  organization_id: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  path: z.string().optional(),
  status_code: z.number().int().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  created_at: z.date().optional(),
});

export type SystemLogEntry = z.infer<typeof SystemLogEntrySchema>;

export type SystemLogCreateInput = Omit<SystemLogEntry, 'id' | 'created_at'>;
