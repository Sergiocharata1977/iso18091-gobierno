import { z } from 'zod';

export const CreateQualityObjectiveSchema = z.object({
  organization_id: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  targetValue: z.number().min(0),
  unit: z.string().min(1).max(50),
  startDate: z.date().or(z.string().datetime()),
  endDate: z.date().or(z.string().datetime()),
  owner: z.string().uuid(),
});

export const CreateQualityIndicatorSchema = z.object({
  organization_id: z.string().min(1),
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  objectiveId: z.string().uuid(),
  targetValue: z.number().min(0),
  unit: z.string().min(1).max(50),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
});

export const CreateMeasurementSchema = z.object({
  organization_id: z.string().min(1),
  indicatorId: z.string().uuid(),
  value: z.number().min(0),
  date: z.date().or(z.string().datetime()),
  notes: z.string().max(1000).optional(),
});

export const QualityObjectiveFiltersSchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  owner: z.string().uuid().optional(),
  dateFrom: z.date().or(z.string().datetime()).optional(),
  dateTo: z.date().or(z.string().datetime()).optional(),
});
