import { z } from 'zod';

export const CreateProcessSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(100),
  owner: z.string().uuid(),
  steps: z.array(z.string()).optional(),
});
