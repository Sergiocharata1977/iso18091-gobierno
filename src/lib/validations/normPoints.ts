import { z } from 'zod';

export const NormTypeSchema = z.enum([
  'iso_9001',
  'iso_14001',
  'iso_45001',
  'legal',
  'otra',
]);

export const NormCategorySchema = z.enum([
  'contexto',
  'liderazgo',
  'planificacion',
  'soporte',
  'operacion',
  'evaluacion',
  'mejora',
]);

export const ComplianceStatusSchema = z.enum([
  'completo',
  'parcial',
  'pendiente',
  'no_aplica',
]);

export const NormPointSchema = z
  .object({
    code: z.string().min(1, 'Code is required'),
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().min(1, 'Description is required'),
    requirement: z.string().min(1, 'Requirement is required'),
    tipo_norma: NormTypeSchema,
    nombre_norma: z.string().optional(),
    chapter: z.number().int().min(4).max(10).optional(),
    category: NormCategorySchema.optional(),
    jurisdiccion: z.string().optional(),
    numero_ley: z.string().optional(),
    articulo: z.string().optional(),
    is_mandatory: z.boolean(),
    priority: z.enum(['alta', 'media', 'baja']),
    related_process_ids: z.array(z.string()).optional(),
    related_document_ids: z.array(z.string()).optional(),
    related_objective_ids: z.array(z.string()).optional(),
    created_by: z.string().min(1),
    updated_by: z.string().min(1),
  })
  .refine(
    data => {
      if (data.tipo_norma.startsWith('iso_')) {
        return data.chapter !== undefined && data.category !== undefined;
      }
      return true;
    },
    {
      message: 'Chapter and category are required for ISO norms',
      path: ['chapter'],
    }
  )
  .refine(
    data => {
      if (data.tipo_norma === 'legal') {
        return data.jurisdiccion !== undefined;
      }
      return true;
    },
    {
      message: 'Jurisdiccion is required for legal requirements',
      path: ['jurisdiccion'],
    }
  )
  .refine(
    data => {
      if (data.tipo_norma === 'otra') {
        return data.nombre_norma !== undefined && data.nombre_norma.length > 0;
      }
      return true;
    },
    {
      message: 'Nombre de norma is required for other norm types',
      path: ['nombre_norma'],
    }
  );

export const NormPointCreateSchema = NormPointSchema;

export const NormPointUpdateSchema = NormPointSchema.partial().required({
  updated_by: true,
});

export const NormPointRelationSchema = z.object({
  norm_point_id: z.string().min(1, 'Norm point is required'),
  process_id: z.string().min(1, 'Process is required'),
  document_ids: z.array(z.string()),
  compliance_status: ComplianceStatusSchema,
  compliance_percentage: z.number().int().min(0).max(100),
  evidence_description: z.string().optional(),
  evidence_files: z.array(z.string()).optional(),
  verification_date: z.date().optional(),
  next_review_date: z.date().optional(),
  created_by: z.string().min(1),
  updated_by: z.string().min(1),
});

export const NormPointRelationCreateSchema = NormPointRelationSchema;

export const NormPointRelationUpdateSchema =
  NormPointRelationSchema.partial().required({
    updated_by: true,
  });

export const ComplianceUpdateSchema = z.object({
  compliance_status: ComplianceStatusSchema,
  compliance_percentage: z.number().int().min(0).max(100),
  user_id: z.string().min(1),
});
