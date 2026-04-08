import { z } from 'zod';

export type RevisionFrequencia = 'mensual' | 'trimestral' | 'semestral' | 'anual';
export type RevisionEstado = 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
export type RevisionModulo =
  | 'auditoria_interna'
  | 'revision_direccion'
  | 'revision_procesos'
  | 'revision_indicadores'
  | 'revision_objetivos'
  | 'revision_requisitos_legales'
  | 'revision_aspectos_ambientales';

export interface RevisionSchedule {
  id: string;
  organization_id: string;
  modulo: RevisionModulo;
  titulo: string;
  descripcion?: string;
  frecuencia: RevisionFrequencia;
  proxima_fecha: string;
  ultima_completada?: string;
  responsable_id?: string;
  responsable_nombre?: string;
  estado: RevisionEstado;
  notificar_dias_antes: number;
  created_at: string;
  updated_at: string;
}

export const RevisionScheduleSchema = z.object({
  modulo: z.enum([
    'auditoria_interna',
    'revision_direccion',
    'revision_procesos',
    'revision_indicadores',
    'revision_objetivos',
    'revision_requisitos_legales',
    'revision_aspectos_ambientales',
  ]),
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(500).optional(),
  frecuencia: z.enum(['mensual', 'trimestral', 'semestral', 'anual']),
  proxima_fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  responsable_id: z.string().optional(),
  responsable_nombre: z.string().optional(),
  notificar_dias_antes: z.number().int().min(1).max(90).default(7),
});

export type CreateRevisionScheduleDTO = z.infer<typeof RevisionScheduleSchema>;

export const RevisionEstadoSchema = z.enum([
  'pendiente',
  'en_progreso',
  'completada',
  'vencida',
]);

export const UpdateRevisionScheduleSchema = RevisionScheduleSchema.partial().extend({
  estado: RevisionEstadoSchema.optional(),
  ultima_completada: z.string().datetime().optional(),
});

export type UpdateRevisionScheduleDTO = z.infer<typeof UpdateRevisionScheduleSchema>;
