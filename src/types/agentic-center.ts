/**
 * Tipos canónicos para el Centro Agéntico.
 *
 * Estas interfaces representan la capa de presentación de negocio
 * sobre los sistemas agenticos internos (AgentWorkerService, SagaService,
 * DirectActionService, terminales Sentinel).
 *
 * REGLA: todos los campos usan lenguaje de negocio en español.
 * NO exponer términos técnicos como job_id, saga_id, CHANGE_STATUS, etc.
 */

// ---------------------------------------------------------------------------
// Resumen global del Centro Agéntico (panel ejecutivo)
// ---------------------------------------------------------------------------

/** Contadores de alto nivel del estado actual del motor agéntico */
export interface AgenticCenterSummary {
  /** Trabajos del motor en ejecución o en cola */
  jobs_activos: number;
  /** Flujos multi-paso pausados esperando aprobación humana */
  sagas_pausadas: number;
  /** Acciones propuestas por la IA pendientes de confirmación del usuario */
  direct_actions_pendientes: number;
  /** Terminales Sentinel que tienen solicitudes de aprobación pendientes */
  terminales_con_aprobacion: number;
  /** Cantidad de personas involucradas en algún caso activo */
  personas_impactadas: number;
  /** Conteo real org-scoped de direct_action_confirmations pendientes */
  pending_approvals_count?: number;
  /** Conteo real org-scoped de sagas pausadas o fallidas */
  blocked_sagas_count?: number;
  /** Conteo real org-scoped de jobs fallidos en los últimos 7 días */
  failed_jobs_count?: number;
  /** Conteo de alertas ejecutivas derivadas para el panel */
  executive_alerts_count?: number;
}

// ---------------------------------------------------------------------------
// Caso completo (vista unificada de un ciclo detectar → actuar → evidenciar)
// ---------------------------------------------------------------------------

export type AgenticCenterCaseEstado = 'activo' | 'esperando' | 'completado';

/**
 * Un caso completo del Centro Agéntico, representando el ciclo completo
 * desde la detección de un evento hasta la evidencia final.
 */
export interface AgenticCenterCase {
  /** Identificador único del caso */
  id: string;
  /** Título corto del caso en lenguaje de negocio */
  titulo: string;
  /** Descripción completa del caso en lenguaje de negocio */
  descripcion: string;
  /** Estado visible al usuario */
  estado: AgenticCenterCaseEstado;
  /** Evento que originó el caso */
  evento_detectado: AgenticCenterEvent;
  /** Pasos del flujo de trabajo (timeline) */
  workflow_pasos: AgenticCenterTimelineItem[];
  /** Acción concreta que la IA está proponiendo o ejecutó */
  accion_propuesta: AgenticCenterActionCard | null;
  /** Persona o terminal objetivo de la acción */
  persona_target: AgenticCenterPersonTarget | null;
  /** Texto de evidencia o resultado final cuando el caso está completado */
  evidencia_final: string | null;
  /** Marca de tiempo de creación del caso */
  timestamp: string; // ISO 8601
  /** Tipo de caso (usado por el mapper para clasificar origen) */
  type?: string;
  /** Entidad origen del caso (e.g. 'direct_action_confirmation', 'saga', 'job') */
  source_entity?: string;
  /** ID del documento Firestore origen */
  source_id?: string;
  /** Severidad del caso */
  severity?: 'alta' | 'media' | 'baja';
  /** Indica si el caso requiere decisión humana antes de continuar */
  requires_human_decision?: boolean;
  /** Nivel de confianza de la IA para este caso */
  confidence_level?: 'alto' | 'medio' | 'bajo';
  /** ID de la organización a la que pertenece el caso */
  org_id?: string;
}

// ---------------------------------------------------------------------------
// Evento detectado que origina un caso
// ---------------------------------------------------------------------------

export type AgenticCenterEventOrigen =
  | 'agente'
  | 'whatsapp'
  | 'sistema'
  | 'terminal';

export type AgenticCenterEventPrioridad = 'alta' | 'media' | 'baja';

/** Evento detectado por el motor que origina o alimenta un caso */
export interface AgenticCenterEvent {
  /** Identificador único del evento */
  id: string;
  /** Tipo de evento en lenguaje de negocio (ej: "Capacitación vencida") */
  tipo: string;
  /** Descripción legible del evento */
  descripcion: string;
  /** Canal que originó el evento */
  origen: AgenticCenterEventOrigen;
  /** Marca de tiempo del evento */
  timestamp: string; // ISO 8601
  /** Nivel de prioridad del evento */
  prioridad: AgenticCenterEventPrioridad;
}

// ---------------------------------------------------------------------------
// Tarjeta de acción propuesta por la IA
// ---------------------------------------------------------------------------

export type AgenticCenterActionEstado =
  | 'pendiente'
  | 'aprobada'
  | 'rechazada'
  | 'ejecutada';

/** Acción concreta que la IA propone al usuario */
export interface AgenticCenterActionCard {
  /** Identificador de la acción (corresponde a DirectActionConfirmation.actionId) */
  actionId: string;
  /** Título corto de la acción en lenguaje de negocio */
  titulo: string;
  /** Explicación del impacto de la acción en términos de negocio */
  descripcion_negocio: string;
  /** Entidad que se verá afectada (ej: "Capacitación", "Hallazgo", "No Conformidad") */
  entidad: string;
  /** Operación en lenguaje de negocio (ej: "Inscribir a curso", "Asignar responsable") */
  tipo_operacion: string;
  /** Estado visible al usuario */
  estado: AgenticCenterActionEstado;
}

// ---------------------------------------------------------------------------
// Persona / Terminal objetivo de una acción
// ---------------------------------------------------------------------------

export type AgenticCenterPersonCanal =
  | 'whatsapp'
  | 'terminal'
  | 'email';

/** Persona o terminal objetivo de una acción agéntica */
export interface AgenticCenterPersonTarget {
  /** Nombre completo de la persona */
  nombre: string;
  /** Puesto o cargo de la persona */
  puesto: string;
  /** Nombre del terminal Sentinel asignado (si aplica) */
  terminal_nombre: string | null;
  /** Canal preferido para la entrega de la acción */
  canal: AgenticCenterPersonCanal;
  /** Estado actual del terminal (ej: "Conectado", "Desconectado", "En cuarentena") */
  estado_terminal: string | null;
  /** Indica si la acción requiere aprobación antes de ejecutarse en el terminal */
  requiere_aprobacion: boolean;
  /** Nombre de la política Sentinel aplicada (si aplica) */
  politica_aplicada: string | null;
}

// ---------------------------------------------------------------------------
// Item de timeline del workflow de un caso
// ---------------------------------------------------------------------------

export type AgenticCenterTimelineItemEstado =
  | 'completado'
  | 'activo'
  | 'pendiente';

/** Un paso del flujo de trabajo en el timeline del caso */
export interface AgenticCenterTimelineItem {
  /** Número de orden del paso (1-based) */
  paso: number;
  /** Etiqueta del paso en lenguaje de negocio */
  label: string;
  /** Estado actual del paso */
  estado: AgenticCenterTimelineItemEstado;
  /** Marca de tiempo opcional (solo para pasos completados o activos) */
  timestamp_opcional: string | null; // ISO 8601 o null
}
