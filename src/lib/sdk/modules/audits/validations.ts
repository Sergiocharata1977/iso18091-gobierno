/**
 * Audit Module Validations
 *
 * Zod schemas for audit validation
 */

import { z } from 'zod';

// ============================================
// SCHEMAS DE ENUMS
// ============================================

export const AuditTypeSchema = z.enum(['complete', 'partial']);

export const NormaISOSchema = z.enum([
  'ISO_9001', 'ISO_14001', 'ISO_45001',
  'ISO_27001', 'ISO_27002', 'ISO_18091',
  'ISO_31000', 'PTW', 'CUSTOM',
]);

export const AuditStatusSchema = z.enum([
  'planned',
  'in_progress',
  'completed',
]);

export const ConformityStatusSchema = z.enum([
  'CF',
  'NCM',
  'NCm',
  'NCT',
  'R',
  'OM',
  'F',
]);

// ============================================
// SCHEMA DE PARTICIPANTE
// ============================================

export const ParticipantSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  role: z.string().min(1, 'El rol es requerido'),
});

// ============================================
// SCHEMA PARA CREAR AUDITORÍA
// ============================================

export const CreateAuditSchema = z
  .object({
    title: z
      .string()
      .min(1, 'El título es requerido')
      .max(200, 'El título no puede exceder 200 caracteres'),

    auditType: AuditTypeSchema,

    scope: z
      .string()
      .min(1, 'El alcance es requerido')
      .max(500, 'El alcance no puede exceder 500 caracteres'),

    plannedDate: z.coerce.date(), // Accepts both Date objects and ISO strings

    leadAuditor: z.string().min(1, 'El auditor líder es requerido'),

    selectedNormPoints: z.array(z.string()).default([]),
    normas: z.array(NormaISOSchema).optional().default([]),
  })
  .refine(
    data => {
      // Si es auditoría parcial, debe tener al menos 1 punto seleccionado
      if (data.auditType === 'partial') {
        return data.selectedNormPoints.length > 0;
      }
      return true;
    },
    {
      message:
        'Debe seleccionar al menos un punto de norma para auditorías parciales',
      path: ['selectedNormPoints'],
    }
  );

// ============================================
// SCHEMA PARA ACTUALIZAR AUDITORÍA
// ============================================

export const UpdateAuditSchema = CreateAuditSchema.partial();

// ============================================
// SCHEMA PARA INICIAR EJECUCIÓN
// ============================================

export const StartExecutionSchema = z.object({
  executionDate: z.coerce.date(),
});

// ============================================
// SCHEMA DE VERIFICACIÓN DE PUNTO DE NORMA
// ============================================

export const UpdateNormPointVerificationSchema = z.object({
  normPointCode: z.string().min(1, 'El código del punto es requerido'),

  conformityStatus: ConformityStatusSchema,

  processes: z.array(z.string()).default([]),

  observations: z
    .string()
    .max(1000, 'Las observaciones no pueden exceder 1000 caracteres')
    .nullable()
    .optional(),
});

// ============================================
// SCHEMA DE REUNIÓN (APERTURA/CIERRE)
// ============================================

export const UpdateMeetingSchema = z.object({
  date: z.coerce.date(),

  participants: z
    .array(ParticipantSchema)
    .min(1, 'Debe haber al menos un participante'),

  notes: z
    .string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .nullable()
    .optional(),
});

// ============================================
// SCHEMA DE ENTREGA DE INFORME
// ============================================

export const UpdateReportDeliverySchema = z.object({
  date: z.coerce.date(),

  deliveredBy: z.string().min(1, 'El entregador es requerido'),

  receivedBy: z.array(z.string()).min(1, 'Debe haber al menos un receptor'),

  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .nullable()
    .optional(),
});
