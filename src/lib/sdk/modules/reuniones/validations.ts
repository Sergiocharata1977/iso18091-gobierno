import { z } from 'zod';

export const CreateReunionTrabajoSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  startDate: z.any(),
  endDate: z.any(),
  location: z.string().min(1).max(200),
  attendees: z.array(z.string()),
  agenda: z.array(z.string()),
});
