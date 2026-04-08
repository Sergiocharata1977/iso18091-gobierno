import { z } from 'zod';

export const strategicAnalysisRequestSchema = z.object({
  scope: z.enum([
    'organization_general',
    'process',
    'role',
    'person',
    'normative_compliance',
    'operational',
    'management_review',
    'historical_comparison',
  ]),
  target_type: z
    .enum(['organization', 'process', 'role', 'person'])
    .optional(),
  target_id: z.string().optional(),
  target_name: z.string().optional(),
  horizon: z.enum(['30d', '60d', '90d']).default('30d'),
  include_plugins: z.boolean().default(true),
  compare_to_report_id: z.string().optional(),
  reading_orientation: z
    .enum(['direccion', 'jefatura', 'operativo'])
    .default('direccion'),
});

export type StrategicAnalysisRequest = z.infer<
  typeof strategicAnalysisRequestSchema
>;
