import { z } from 'zod';

export const NormPointFiltersSchema = z.object({
  chapter: z
    .union([z.string(), z.number()])
    .transform(val => String(val))
    .optional(),
  tipoNorma: z.string().optional(),
  category: z.string().optional(),
  isMandatory: z.boolean().optional(),
  search: z.string().optional(),
});

export const CreateNormPointRelationSchema = z.object({
  normPointId: z.string().uuid('ID de punto normativo inválido'),
  entityType: z.enum(['process', 'document', 'procedure', 'policy']),
  entityId: z.string().uuid('ID de entidad inválido'),
  complianceStatus: z.enum([
    'compliant',
    'non_compliant',
    'partial',
    'not_applicable',
  ]),
  evidence: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

export const UpdateComplianceStatusSchema = z.object({
  complianceStatus: z.enum([
    'compliant',
    'non_compliant',
    'partial',
    'not_applicable',
  ]),
  evidence: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

export const NormPointRelationFiltersSchema = z.object({
  normPointId: z.string().uuid().optional(),
  entityType: z.enum(['process', 'document', 'procedure', 'policy']).optional(),
  entityId: z.string().uuid().optional(),
  complianceStatus: z
    .enum(['compliant', 'non_compliant', 'partial', 'not_applicable'])
    .optional(),
});
