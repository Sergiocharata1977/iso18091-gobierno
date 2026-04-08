import { z } from 'zod';

const OrganigramaNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  position: z.string().min(1).max(200),
  parentId: z.string().optional(),
  level: z.number().min(0),
  department: z.string().optional(),
});

export const CreateOrganigramaSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  structure: z.array(OrganigramaNodeSchema),
});
