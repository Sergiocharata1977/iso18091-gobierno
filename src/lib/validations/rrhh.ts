import { z } from 'zod';

// ===== NUEVAS VALIDACIONES PARA SISTEMA DE COMPETENCIAS =====

export const competenceSchema = z.object({
  nombre: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  categoria: z.enum(['tecnica', 'blanda', 'seguridad', 'iso_9001', 'otra']),
  descripcion: z
    .string()
    .min(10, 'Mínimo 10 caracteres')
    .max(500, 'Máximo 500 caracteres'),
  nivelRequerido: z
    .number()
    .int()
    .min(1, 'Mínimo nivel 1')
    .max(5, 'Máximo nivel 5'),
  fuente: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  referenciaNorma: z.string().max(200, 'Máximo 200 caracteres').optional(),
  activo: z.boolean().default(true),
});

export const competenceFormSchema = competenceSchema;

export const competenceFiltersSchema = z.object({
  search: z.string().optional(),
  categoria: z
    .enum(['tecnica', 'blanda', 'seguridad', 'iso_9001', 'otra'])
    .optional(),
  activo: z.boolean().optional(),
  organization_id: z.string(),
});

// Department schemas
export const departmentSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  responsible_user_id: z.string().optional(),
  is_active: z.boolean().default(true),
  organization_id: z.string().min(1, 'Organization ID is required'),
});

export const departmentFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().max(500, 'Máximo 500 caracteres').optional(),
  parent_id: z.string().optional(), // Departamento padre (opcional)
  is_active: z.boolean(),
});

// Position schemas
export const positionCompetenceSchema = z.object({
  competenciaId: z.string().min(1, 'La competencia es requerida'),
  nombreCompetencia: z.string().min(1, 'El nombre es requerido'),
  nivelRequerido: z.number().int().min(1, 'Mínimo 1').max(5, 'Máximo 5'),
  esCritica: z.boolean().optional().default(false),
});

export const positionSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),
  descripcion_responsabilidades: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional(),
  requisitos_experiencia: z
    .string()
    .max(500, 'Máximo 500 caracteres')
    .optional(),
  requisitos_formacion: z.string().max(500, 'Máximo 500 caracteres').optional(),
  departamento_id: z.string().optional(), // Ahora opcional - se asigna desde vista detalle
  reporta_a_id: z.string().optional(),

  // Competencias con nivel requerido (opcional)
  competenciasRequeridas: z.array(positionCompetenceSchema).optional(),
  frecuenciaEvaluacion: z
    .number()
    .int()
    .min(1, 'Mínimo 1 mes')
    .max(60, 'Máximo 60 meses')
    .optional(),
  nivel: z.enum(['operativo', 'tecnico', 'gerencial']).optional(),
  organization_id: z.string().optional(), // Se agrega automáticamente por la API
});

export const positionFormSchema = positionSchema;

// Personnel schemas
export const personnelSchema = z
  .object({
    nombres: z
      .string()
      .min(1, 'Los nombres son requeridos')
      .max(50, 'Máximo 50 caracteres'),
    apellidos: z
      .string()
      .min(1, 'Los apellidos son requeridos')
      .max(50, 'Máximo 50 caracteres'),
    email: z.string().email('Email inválido').optional(), // ✅ Opcional
    telefono: z.string().max(20, 'Máximo 20 caracteres').optional(),
    documento_identidad: z.string().max(20, 'Máximo 20 caracteres').optional(),
    fecha_nacimiento: z.date().optional(),
    nacionalidad: z.string().max(50, 'Máximo 50 caracteres').optional(),
    direccion: z.string().max(200, 'Máximo 200 caracteres').optional(),
    telefono_emergencia: z.string().max(20, 'Máximo 20 caracteres').optional(),
    fecha_contratacion: z.date().optional(),
    numero_legajo: z.string().max(20, 'Máximo 20 caracteres').optional(),
    estado: z.enum(['Activo', 'Inactivo', 'Licencia']),
    meta_mensual: z.number().min(0, 'Debe ser mayor o igual a 0'),
    comision_porcentaje: z
      .number()
      .min(0, 'Debe ser mayor o igual a 0')
      .max(100, 'Máximo 100%'),
    supervisor_id: z.string().optional(),
    especialidad_ventas: z
      .string()
      .max(100, 'Máximo 100 caracteres')
      .optional(),
    fecha_inicio_ventas: z.date().optional(),
    tipo_personal: z.enum([
      'administrativo',
      'ventas',
      'técnico',
      'supervisor',
      'gerencial',
    ]),
    zona_venta: z.string().max(50, 'Máximo 50 caracteres').optional(),

    // Acceso al sistema
    tiene_acceso_sistema: z.boolean().default(false), // ✅ NUEVO

    // Campos adicionales para UI
    foto: z.string().optional(),
    puesto: z.string().optional(),
    departamento: z.string().optional(),
    supervisor: z.string().optional(),
    fecha_ingreso: z.date().optional(),
    salario: z.string().optional(),
    certificaciones: z.array(z.string()).optional(),
    organization_id: z.string().min(1, 'Organization ID is required'),
  })
  .refine(
    data => {
      // Si tiene acceso al sistema, el email es requerido
      if (data.tiene_acceso_sistema && !data.email) {
        return false;
      }
      return true;
    },
    {
      message: 'El email es requerido si el empleado tiene acceso al sistema',
      path: ['email'],
    }
  );

export const personnelFormSchema = personnelSchema;

// Training schemas
export const trainingSchema = z.object({
  tema: z
    .string()
    .min(1, 'El tema es requerido')
    .max(150, 'Máximo 150 caracteres'),
  descripcion: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  fecha_inicio: z.date(),
  fecha_fin: z.date(),
  horas: z.number().min(0, 'Debe ser mayor o igual a 0').optional(),
  modalidad: z.enum(['presencial', 'virtual', 'mixta']),
  proveedor: z.string().max(150, 'Máximo 150 caracteres').optional(),
  costo: z.number().min(0, 'Debe ser mayor o igual a 0').optional(),
  estado: z
    .enum(['planificada', 'en_curso', 'completada', 'cancelada'])
    .default('planificada'),
  certificado_url: z.string().url('URL inválida').optional().or(z.literal('')),
  participantes: z.array(z.string()).default([]),

  // ===== NUEVOS CAMPOS =====
  competenciasDesarrolladas: z.array(z.string()).default([]),
  evaluacionPosterior: z.boolean().default(false),
  organization_id: z.string().min(1, 'Organization ID is required'),
});

export const trainingFormSchema = trainingSchema;

// Performance Evaluation schemas
export const competenceEvaluationSchema = z.object({
  competenciaId: z.string().min(1, 'La competencia es requerida'),
  nombreCompetencia: z.string().min(1, 'El nombre es requerido'),
  nivelRequerido: z.number().int().min(1, 'Mínimo 1').max(5, 'Máximo 5'),
  nivelEvaluado: z.number().int().min(1, 'Mínimo 1').max(5, 'Máximo 5'),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  brecha: z.number().int(), // Calculado automáticamente
});

export const performanceEvaluationSchema = z.object({
  // Required fields for creation
  titulo: z
    .string()
    .min(1, 'El título es requerido')
    .max(200, 'Máximo 200 caracteres')
    .optional(),
  fecha_evaluacion: z.date(),
  evaluador_id: z.string().optional(),

  // Optional fields - configured in single view
  personnel_id: z.string().optional(),
  periodo: z.string().optional(),
  puestoId: z.string().optional(),

  // Competencias - empty array allowed for initial creation
  competencias: z.array(competenceEvaluationSchema).default([]),

  // Result and notes
  resultado_global: z
    .enum(['Apto', 'No Apto', 'Requiere Capacitación'])
    .default('Requiere Capacitación'),
  fechaProximaEvaluacion: z.date().optional().nullable(),

  comentarios_generales: z
    .string()
    .max(1000, 'Máximo 1000 caracteres')
    .optional(),
  plan_mejora: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  estado: z.enum(['borrador', 'publicado', 'cerrado']).default('borrador'),
  organization_id: z.string().min(1, 'Organization ID is required').optional(), // Optional initially as it might be added later or verified differently
});

export const performanceEvaluationFormSchema = performanceEvaluationSchema;

// Filter schemas
export const departmentFiltersSchema = z.object({
  search: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const positionFiltersSchema = z.object({
  search: z.string().optional(),
  departamento_id: z.string().optional(),
  reporta_a_id: z.string().optional(),
});

export const personnelFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z.enum(['Activo', 'Inactivo', 'Licencia']).optional(),
  tipo_personal: z
    .enum(['administrativo', 'ventas', 'técnico', 'supervisor', 'gerencial'])
    .optional(),
  supervisor_id: z.string().optional(),
});

export const trainingFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z
    .enum(['planificada', 'en_curso', 'completada', 'cancelada'])
    .optional(),
  modalidad: z.enum(['presencial', 'virtual', 'mixta']).optional(),
  fecha_inicio: z.date().optional(),
  fecha_fin: z.date().optional(),
});

export const performanceEvaluationFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z.enum(['borrador', 'publicado', 'cerrado']).optional(),
  periodo: z.string().optional(),
  personnel_id: z.string().optional(),
  evaluador_id: z.string().optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// ===== NUEVOS TIPOS DE FORMULARIOS =====
export type CompetenceFormData = z.infer<typeof competenceFormSchema>;
export type CompetenceFilters = z.infer<typeof competenceFiltersSchema>;

// Type exports
export type DepartmentFormData = z.infer<typeof departmentFormSchema>;
export type PositionFormData = z.infer<typeof positionFormSchema>;
export type PersonnelFormData = z.infer<typeof personnelFormSchema>;
export type TrainingFormData = z.infer<typeof trainingFormSchema>;
export type PerformanceEvaluationFormData = z.infer<
  typeof performanceEvaluationFormSchema
>;

export type DepartmentFilters = z.infer<typeof departmentFiltersSchema>;
export type PositionFilters = z.infer<typeof positionFiltersSchema>;
export type PersonnelFilters = z.infer<typeof personnelFiltersSchema>;
export type TrainingFilters = z.infer<typeof trainingFiltersSchema>;
export type PerformanceEvaluationFilters = z.infer<
  typeof performanceEvaluationFiltersSchema
>;

export type PaginationParams = z.infer<typeof paginationSchema>;
