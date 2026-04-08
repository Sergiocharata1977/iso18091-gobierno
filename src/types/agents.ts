/**
 * Tipos para Agentes Operativos MCP (Don Cándido IA)
 *
 * Define la estructura de:
 * 1. AgentProfile (Vinculado al Puesto/Position)
 * 2. AgentInstance (Vinculado al Usuario/User)
 * 3. AgentJob (Cola de ejecución asíncrona)
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// CAPABILITIES (Permisos)
// ============================================

/**
 * Formato: "domain.resource.action"
 * Ejemplos:
 * - crm.order.create
 * - iso.finding.approve
 * - erp.stock.read
 */
export type AgentCapability = string;

// ============================================
// AGENT PROFILE (Plantilla por Puesto)
// ============================================

export interface AgentProfile {
  id: string; // Generalmente igual al position_id
  organization_id: string;
  position_id: string; // FK a Position (src/types/rrhh.ts)

  // Nombre visible del agente (ej: "Agente de Ventas")
  name: string;

  // Capacidades base heredadas por todos los usuarios en este puesto
  base_capabilities: AgentCapability[];

  // Procesos ISO que este agente tiene permitido ejecutar/tocar
  allowed_processes: string[]; // IDs de ProcessDefinition

  // Estilo de interacción
  interaction_style: 'exec_only' | 'consultative' | 'proactive';

  // Configuración del modelo (System Prompt base)
  system_instructions?: string;

  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
}

// ============================================
// AGENT INSTANCE (Runtime por Usuario)
// ============================================

export type AgentStatus = 'active' | 'paused' | 'vacation' | 'maintenance';

export interface AgentInstance {
  id: string; // Generalmente el user_id
  organization_id: string;
  user_id: string; // FK a User (src/types/auth.ts)
  position_id: string; // El puesto que ocupa (FK a Position)

  // Estado operativo
  status: AgentStatus;

  // Capacidades efectivas (Base + Custom)
  custom_capabilities?: AgentCapability[]; // Permisos extra delegados

  // Estado de memoria/runtime
  runtime_state: {
    last_active: Date | Timestamp;
    current_context?: {
      conversation_id?: string;
      task_id?: string;
      active_process_id?: string;
    };
    metadata?: Record<string, any>;
  };

  // Referencia al vault de credenciales personales (si aplica)
  secrets_vault_id?: string;

  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
}

// ============================================
// AGENT JOBS (Cola Asíncrona)
// ============================================

export type JobStatus =
  | 'queued'
  | 'running'
  | 'pending_approval' // Esperando intervención humana o de supervisor
  | 'completed'
  | 'failed'
  | 'cancelled';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';
export type KnownIntent =
  | 'governance.alert.handle'
  | 'whatsapp.message.received'
  | 'task.assign'
  | 'task.reminder'
  | 'iso.consultation'
  | 'crm.lead.score'
  | 'crm.follow.up'
  | 'quality.measurement.overdue.notify';
export type AgentIntent =
  | 'governance.alert.handle'
  | 'whatsapp.message.received'
  | 'task.assign'
  | 'task.reminder'
  | 'quality.measurement.overdue.notify'
  | (string & {});

export interface AgentJob {
  id: string;
  organization_id: string;
  user_id: string; // El usuario que ordenó la tarea
  agent_instance_id: string; // El agente que la ejecuta

  // Definición de la tarea
  intent: AgentIntent; // Ej: "crm.order.create"
  payload: any; // Datos necesarios (inputs)

  // Orquestación (Saga / Parent-Child)
  parent_job_id?: string; // Si este job es una sub-tarea de otro
  workflow_id?: string; // ID global de la saga o proceso complejo
  step_index?: number; // Orden de ejecución si es secuencial
  idempotency_key?: string; // Evita encolar dos veces la misma intención lógica

  // Estado
  status: JobStatus;
  priority: JobPriority;

  // Resultados
  result?: any;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };

  // Evidencia generada (IDs de archivos/screenshots)
  evidence_ids?: string[];

  // Trazabilidad temporal
  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
  started_at?: Date | Timestamp;
  completed_at?: Date | Timestamp;
  lease_owner?: string; // Worker que tiene el lease actual
  lease_expires_at?: Date | Timestamp; // Expiracion del lease para reclaim seguro
  lease_heartbeat_at?: Date | Timestamp; // Ultima renovacion de lease

  // Control de reintentos
  attempts: number;
  max_attempts: number;
  next_retry?: Date | Timestamp;

  // Metadata de Aprobación (Human-in-the-Loop)
  approval_metadata?: {
    required_role?: string; // Rol necesario para aprobar
    requested_at: Date | Timestamp;
    responded_at?: Date | Timestamp;
    responded_by?: string; // User ID
    status: 'pending' | 'approved' | 'rejected';
    feedback?: string; // Comentario del aprobador
  };
}

// ============================================
// DTOs
// ============================================

export interface CreateAgentJobRequest {
  organization_id: string;
  user_id: string;
  intent: AgentIntent;
  payload: any;
  priority?: JobPriority;

  // Orquestación
  parent_job_id?: string;
  workflow_id?: string;
  step_index?: number;
  idempotency_key?: string;
}

export interface QualityMeasurementOverdueJobPayload {
  event_type: 'quality.measurement.overdue';
  organization_id: string;
  indicator_id: string;
  indicator_name: string;
  indicator_frequency: string;
  process_definition_id?: string;
  objective_id?: string;
  responsible_user_id?: string | null;
  detection_kind: 'missing' | 'overdue';
  notification_stage: 'reminder' | 'escalation';
  priority: 'low' | 'normal' | 'high';
  due_date: string;
  days_overdue: number;
  last_measurement_date?: string | null;
  latest_rejected_measurement_date?: string | null;
  detected_at: string;
  detection_criteria: {
    cadence_days: number;
    considered_measurement_status: 'accepted_or_pending';
    rejected_measurements_do_not_close_cycle: boolean;
  };
}

export interface AgentGlobalStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  queuedJobs: number;
  runningJobs: number;
  successRate: number; // Porcentaje 0-100
  avgExecutionTimeMs: number; // Promedio de tiempo de ejecución
}

export interface AgentRecentActivity {
  jobs: AgentJob[];
  lastUpdated: Date;
}
