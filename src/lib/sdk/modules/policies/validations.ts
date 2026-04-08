import { z } from 'zod';

export const CreatePolicySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(100),
});
