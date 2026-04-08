import { z } from 'zod';

export const KANBAN_MODULOS = [
  'acciones',
  'hallazgos',
  'auditorias',
  'crm_acciones',
  'crm_scoring',
  'procesos',
  'tareas',
] as const;

// Modulos que tienen kanban
export type KanbanModulo = (typeof KANBAN_MODULOS)[number];

export interface KanbanColumnConfig {
  id: string;
  title: string;
  color: string;
  order: number;
  is_terminal: boolean;
  wip_limit?: number;
}

export interface KanbanSchema {
  id: string;
  organization_id: string;
  modulo: KanbanModulo;
  columns: KanbanColumnConfig[];
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export const KanbanColumnConfigSchema = z.object({
  id: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(50),
  color: z.string().trim().min(1).max(100),
  order: z.number().int().min(0),
  is_terminal: z.boolean().default(false),
  wip_limit: z.number().int().min(1).optional(),
});

export const KanbanSchemaSchema = z
  .object({
    modulo: z.enum(KANBAN_MODULOS),
    columns: z.array(KanbanColumnConfigSchema).min(2).max(10),
  })
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    const orders = new Set<number>();

    value.columns.forEach((column, index) => {
      if (ids.has(column.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No se permiten columnas con id duplicado',
          path: ['columns', index, 'id'],
        });
      }
      ids.add(column.id);

      if (orders.has(column.order)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No se permiten columnas con order duplicado',
          path: ['columns', index, 'order'],
        });
      }
      orders.add(column.order);
    });
  });

export type UpsertKanbanSchemaDTO = z.infer<typeof KanbanSchemaSchema>;

export const KANBAN_DEFAULTS: Record<KanbanModulo, KanbanColumnConfig[]> = {
  acciones: [
    {
      id: 'planificada',
      title: 'Planificadas',
      color: 'border-slate-300 bg-slate-50',
      order: 0,
      is_terminal: false,
    },
    {
      id: 'ejecutada',
      title: 'Ejecutadas',
      color: 'border-blue-300 bg-blue-50',
      order: 1,
      is_terminal: false,
    },
    {
      id: 'en_control',
      title: 'En Control',
      color: 'border-amber-300 bg-amber-50',
      order: 2,
      is_terminal: false,
    },
    {
      id: 'completada',
      title: 'Completadas',
      color: 'border-emerald-300 bg-emerald-50',
      order: 3,
      is_terminal: true,
    },
  ],
  hallazgos: [
    {
      id: 'abierto',
      title: 'Abierto',
      color: 'border-rose-300 bg-rose-50',
      order: 0,
      is_terminal: false,
    },
    {
      id: 'en_proceso',
      title: 'En Proceso',
      color: 'border-amber-300 bg-amber-50',
      order: 1,
      is_terminal: false,
    },
    {
      id: 'verificacion',
      title: 'Verificacion',
      color: 'border-blue-300 bg-blue-50',
      order: 2,
      is_terminal: false,
    },
    {
      id: 'cerrado',
      title: 'Cerrado',
      color: 'border-emerald-300 bg-emerald-50',
      order: 3,
      is_terminal: true,
    },
  ],
  auditorias: [
    {
      id: 'planificada',
      title: 'Planificada',
      color: 'border-slate-300 bg-slate-50',
      order: 0,
      is_terminal: false,
    },
    {
      id: 'en_ejecucion',
      title: 'En Ejecucion',
      color: 'border-blue-300 bg-blue-50',
      order: 1,
      is_terminal: false,
    },
    {
      id: 'completada',
      title: 'Completada',
      color: 'border-emerald-300 bg-emerald-50',
      order: 2,
      is_terminal: true,
    },
  ],
  crm_acciones: [
    {
      id: 'programada',
      title: 'Programada',
      color: 'bg-blue-500',
      order: 0,
      is_terminal: false,
    },
    {
      id: 'completada',
      title: 'Completada',
      color: 'bg-green-500',
      order: 1,
      is_terminal: true,
    },
    {
      id: 'vencida',
      title: 'Vencida',
      color: 'bg-red-500',
      order: 2,
      is_terminal: false,
    },
  ],
  crm_scoring: [
    {
      id: 'pendiente',
      title: 'Pendiente',
      color: 'bg-slate-100',
      order: 0,
      is_terminal: false,
    },
    {
      id: 'en_analisis',
      title: 'En Analisis',
      color: 'bg-blue-100',
      order: 1,
      is_terminal: false,
    },
    {
      id: 'documentacion_pendiente',
      title: 'Doc. Pendiente',
      color: 'bg-amber-100',
      order: 2,
      is_terminal: false,
    },
    {
      id: 'comite',
      title: 'Comite',
      color: 'bg-violet-100',
      order: 3,
      is_terminal: false,
    },
    {
      id: 'aprobado',
      title: 'Aprobado',
      color: 'bg-emerald-100',
      order: 4,
      is_terminal: true,
    },
    {
      id: 'rechazado',
      title: 'Rechazado',
      color: 'bg-rose-100',
      order: 5,
      is_terminal: true,
    },
  ],
  procesos: [
    {
      id: 'borrador',
      title: 'Borrador',
      color: 'border-slate-300 bg-slate-50',
      order: 0,
      is_terminal: false,
    },
    {
      id: 'activo',
      title: 'Activo',
      color: 'border-emerald-300 bg-emerald-50',
      order: 1,
      is_terminal: false,
    },
    {
      id: 'revision',
      title: 'En Revision',
      color: 'border-amber-300 bg-amber-50',
      order: 2,
      is_terminal: false,
    },
    {
      id: 'obsoleto',
      title: 'Obsoleto',
      color: 'border-rose-300 bg-rose-50',
      order: 3,
      is_terminal: true,
    },
  ],
  tareas: [
    {
      id: 'pendiente',
      title: 'Pendiente',
      color: 'border-slate-300 bg-slate-50',
      order: 0,
      is_terminal: false,
    },
    {
      id: 'en_progreso',
      title: 'En Progreso',
      color: 'border-blue-300 bg-blue-50',
      order: 1,
      is_terminal: false,
    },
    {
      id: 'revision',
      title: 'Revision',
      color: 'border-amber-300 bg-amber-50',
      order: 2,
      is_terminal: false,
    },
    {
      id: 'completada',
      title: 'Completada',
      color: 'border-emerald-300 bg-emerald-50',
      order: 3,
      is_terminal: true,
    },
  ],
};
