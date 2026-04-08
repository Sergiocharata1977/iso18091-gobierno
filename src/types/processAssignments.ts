export type ProcessAssignmentNivel =
  | 'consulta'
  | 'operativo'
  | 'analista'
  | 'supervisor'
  | 'lider'
  | 'gerencial';

export type ProcessAssignmentEstado = 'activo' | 'inactivo';

export interface PersonnelProcessAssignment {
  id: string;
  organization_id: string;
  personnel_id: string;
  process_definition_id: string;
  rol_en_proceso?: string;
  nivel?: ProcessAssignmentNivel;
  es_responsable?: boolean;
  estado: ProcessAssignmentEstado;
  objetivos_asignados?: string[];
  indicadores_asignados?: string[];
  observaciones?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PersonnelProcessAssignmentInput {
  process_definition_id: string;
  rol_en_proceso?: string;
  nivel?: ProcessAssignmentNivel;
  es_responsable?: boolean;
  estado?: ProcessAssignmentEstado;
  objetivos_asignados?: string[];
  indicadores_asignados?: string[];
  observaciones?: string;
}
