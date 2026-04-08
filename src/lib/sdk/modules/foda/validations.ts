import { z } from 'zod';

export const CreateAnalisisFODASchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  fortalezas: z.array(z.string()).optional(),
  oportunidades: z.array(z.string()).optional(),
  debilidades: z.array(z.string()).optional(),
  amenazas: z.array(z.string()).optional(),
});
