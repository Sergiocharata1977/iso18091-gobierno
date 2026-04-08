import { z } from 'zod';

const FlujogramaStepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  order: z.number().min(0),
  type: z.enum(['process', 'decision', 'start', 'end']),
  nextStepId: z.string().optional(),
  alternativeStepId: z.string().optional(),
});

export const CreateFlujogramaSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  steps: z.array(FlujogramaStepSchema),
});
