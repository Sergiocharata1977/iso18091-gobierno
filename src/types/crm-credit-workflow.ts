// src/types/crm-credit-workflow.ts
// Tipos base para el subflujo operativo de gestion crediticia en CRM

import type { TierCredito } from '@/types/crm-evaluacion-riesgo';

export type CreditWorkflowStatus =
  | 'pendiente'
  | 'en_analisis'
  | 'documentacion_pendiente'
  | 'comite'
  | 'aprobado'
  | 'rechazado'
  | 'cerrado';

export type CreditWorkflowResolution =
  | 'aprobado'
  | 'rechazado'
  | 'condicional';

export interface CreditWorkflowProjection {
  workflow_id: string;
  activo: boolean;
  status: CreditWorkflowStatus;
  resolution?: CreditWorkflowResolution;
  tier?: TierCredito;
  limite_credito?: number;
  fecha_resolucion?: string;
  updated_at: string;
}

export interface CreditWorkflow {
  id: string;
  organization_id: string;
  oportunidad_id: string;
  crm_organizacion_id: string;
  cliente_nombre: string;
  oportunidad_nombre: string;
  activo: boolean;
  status: CreditWorkflowStatus;
  resolution?: CreditWorkflowResolution;
  stage_origin_id: string;
  stage_origin_name: string;
  evaluacion_id_vigente?: string;
  assigned_to_user_id?: string;
  assigned_to_user_name?: string;
  opened_at: string;
  updated_at: string;
  closed_at?: string;
  sla_due_at?: string;
  notes?: string;
}
