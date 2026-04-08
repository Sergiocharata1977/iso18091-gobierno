export type AuditProgramStatus =
  | 'borrador'
  | 'aprobado'
  | 'en_curso'
  | 'completado';

export type AuditProgramItemStatus =
  | 'planificada'
  | 'en_ejecucion'
  | 'completada'
  | 'postergada'
  | 'cancelada';

export type AuditProgramItemType = 'interna' | 'externa' | 'combinada';

export interface AuditProgram {
  id: string;
  organization_id: string;
  ejercicio: string; // YYYY
  objetivo: string;
  alcance: string[]; // e.g. ['iso_9001', 'iso_environment_14001']
  responsable_id: string;
  status: AuditProgramStatus;
  total_planificadas: number;
  total_completadas: number;
  created_at: string; // ISO timestamp
  updated_at?: string;
}

export interface AuditProgramItem {
  id: string;
  organization_id: string;
  program_id: string;
  norma: string; // e.g. 'iso_9001', 'iso_environment_14001'
  alcance_procesos: string[];
  fecha_planificada: string; // ISO date
  auditor_lider_id: string;
  auditores_ids: string[];
  tipo: AuditProgramItemType;
  auditoria_id?: string; // enlaza con auditoría del core cuando se ejecuta
  status: AuditProgramItemStatus;
  observaciones?: string;
  created_at: string;
  updated_at?: string;
}

export interface AuditorProfile {
  id: string;
  organization_id: string;
  usuario_id: string;
  normas_habilitadas: string[]; // ['iso_9001', 'iso_environment_14001']
  activo: boolean;
  fecha_ultima_capacitacion?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateAuditProgramRequest {
  ejercicio: string;
  objetivo: string;
  alcance: string[];
  responsable_id: string;
}

export interface CreateAuditProgramItemRequest {
  program_id: string;
  norma: string;
  alcance_procesos: string[];
  fecha_planificada: string;
  auditor_lider_id: string;
  auditores_ids?: string[];
  tipo: AuditProgramItemType;
  observaciones?: string;
}
