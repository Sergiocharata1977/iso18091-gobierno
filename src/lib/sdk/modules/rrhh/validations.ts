import { z } from 'zod';

export const CreatePersonnelSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  positionId: z.string().uuid(),
  departmentId: z.string().uuid(),
  hireDate: z.date().or(z.string().datetime()),
});

export const CreatePositionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  departmentId: z.string().uuid(),
  level: z.string().min(2).max(50),
  requiredCompetencies: z.array(z.string().uuid()).optional(),
});

export const CreateTrainingSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  personnelId: z.string().uuid(),
  competencyId: z.string().uuid(),
  startDate: z.date().or(z.string().datetime()),
  endDate: z.date().or(z.string().datetime()),
});

export const CreateEvaluationSchema = z.object({
  personnelId: z.string().uuid(),
  evaluatorId: z.string().uuid(),
  competencyId: z.string().uuid(),
  score: z.number().min(0).max(100),
  comments: z.string().max(1000),
  evaluationDate: z.date().or(z.string().datetime()),
});

export const CreateDepartmentSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  managerId: z.string().uuid(),
});

export const CreateCompetenceSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(100),
  level: z.enum(['basic', 'intermediate', 'advanced', 'expert']),
});
