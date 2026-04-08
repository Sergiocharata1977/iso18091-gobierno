import { z } from 'zod';

// ============================================
// SCHEMAS DE ENUMS
// ============================================

export const AuditTypeSchema = z.enum(['complete', 'partial']);

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
// SCHEMA DE FORMULARIO 1: PLANIFICACIÓN
// ============================================

export const AuditFormSchema = z
  .object({
    organization_id: z.string().min(1, 'Organization ID is required'),
    title: z
      .string()
      .min(1, 'El título es requerido')
      .max(200, 'El título no puede exceder 200 caracteres'),

    auditType: AuditTypeSchema,

    scope: z
      .string()
      .min(1, 'El alcance es requerido')
      .max(500, 'El alcance no puede exceder 500 caracteres'),

    plannedDate: z.date(),

    leadAuditor: z.string().min(1, 'El auditor líder es requerido'),

    selectedNormPoints: z.array(z.string()).default([]),
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
// SCHEMA PARA INICIAR EJECUCIÓN
// ============================================

export const AuditExecutionStartSchema = z.object({
  executionDate: z.date(),
});

// ============================================
// SCHEMA DE VERIFICACIÓN DE PUNTO DE NORMA
// ============================================

export const NormPointVerificationSchema = z.object({
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

export const MeetingSchema = z.object({
  date: z.date(),

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

export const ReportDeliverySchema = z.object({
  date: z.date(),

  deliveredBy: z.string().min(1, 'El entregador es requerido'),

  receivedBy: z.array(z.string()).min(1, 'Debe haber al menos un receptor'),

  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .nullable()
    .optional(),
});

// ============================================
// SCHEMA PARA ACTUALIZAR VERIFICACIÓN DE ACCIONES PREVIAS
// ============================================

export const PreviousActionsVerificationSchema = z.object({
  previousActionsVerification: z
    .string()
    .max(2000, 'El texto no puede exceder 2000 caracteres')
    .nullable()
    .optional(),
});

// ============================================
// SCHEMA PARA OBSERVACIONES GENERALES
// ============================================

export const ObservationsSchema = z.object({
  observations: z
    .string()
    .max(2000, 'Las observaciones no pueden exceder 2000 caracteres')
    .nullable()
    .optional(),
});

// ============================================
// SCHEMA PARA COMPLETAR AUDITORÍA
// ============================================

export const CompleteAuditSchema = z.object({
  // Validar que todos los campos requeridos estén completos
  hasOpeningMeeting: z.boolean().refine(val => val === true, {
    message: 'Debe completar la reunión de apertura',
  }),

  hasClosingMeeting: z.boolean().refine(val => val === true, {
    message: 'Debe completar la reunión de cierre',
  }),

  hasReportDelivery: z.boolean().refine(val => val === true, {
    message: 'Debe completar la entrega del informe',
  }),

  allPointsVerified: z.boolean().refine(val => val === true, {
    message: 'Todos los puntos de norma deben estar verificados',
  }),
});

// ============================================
// TIPOS INFERIDOS
// ============================================

export type AuditFormInput = z.infer<typeof AuditFormSchema>;
export type AuditExecutionStartInput = z.infer<
  typeof AuditExecutionStartSchema
>;
export type NormPointVerificationInput = z.infer<
  typeof NormPointVerificationSchema
>;
export type MeetingInput = z.infer<typeof MeetingSchema>;
export type ReportDeliveryInput = z.infer<typeof ReportDeliverySchema>;
export type PreviousActionsVerificationInput = z.infer<
  typeof PreviousActionsVerificationSchema
>;
export type ObservationsInput = z.infer<typeof ObservationsSchema>;
export type CompleteAuditInput = z.infer<typeof CompleteAuditSchema>;
