/**
 * AgenticCenterCaseMapper
 *
 * Convierte entidades reales de Firestore (direct_action_confirmations,
 * agent_sagas, agent_jobs) en casos del Centro Agéntico con lenguaje de negocio.
 *
 * REGLA: Todas las queries usan .where('organization_id', '==', orgId) o
 * filtran por userId → organization_id. NUNCA devuelve datos de otras orgs.
 */

import type {
  AgenticCenterCase,
  AgenticCenterEvent,
  AgenticCenterTimelineItem,
  AgenticCenterActionCard,
  AgenticCenterPersonTarget,
} from '@/types/agentic-center';
import type { DirectActionConfirmation } from '@/types/direct-actions';
import type { SagaRun } from '@/types/sagas';
import type { AgentJob } from '@/types/agents';
import type { Firestore } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

type DateLike =
  | Date
  | { toDate?: () => Date }
  | null
  | undefined;

function toIso(value: DateLike): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const converted = (value as { toDate?: () => Date }).toDate?.();
  return converted instanceof Date ? converted.toISOString() : new Date().toISOString();
}

const ENTIDAD_LABEL: Record<string, string> = {
  audit: 'Auditoría',
  finding: 'Hallazgo',
  action: 'Acción correctiva',
  'non-conformity': 'No Conformidad',
  'process-record': 'Registro de proceso',
  personnel: 'Persona',
  training: 'Capacitación',
  evaluation: 'Evaluación',
};

const OPERACION_LABEL: Record<string, string> = {
  CREATE: 'Crear registro',
  UPDATE: 'Actualizar datos',
  COMPLETE: 'Marcar como completado',
  ASSIGN: 'Asignar responsable',
  CHANGE_STATUS: 'Cambiar estado',
  DELETE: 'Eliminar registro',
};

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

function mapConfirmationToCase(
  confirmation: DirectActionConfirmation & { createdAt?: DateLike },
  orgId: string
): AgenticCenterCase {
  const timestamp = toIso(
    (confirmation as { createdAt?: DateLike }).createdAt
  );

  const entidad =
    ENTIDAD_LABEL[confirmation.request.entity] ?? confirmation.request.entity;
  const operacion =
    OPERACION_LABEL[confirmation.request.type] ?? confirmation.request.type;

  const evento: AgenticCenterEvent = {
    id: `ev-dac-${confirmation.actionId}`,
    tipo: `Acción pendiente sobre ${entidad}`,
    descripcion: confirmation.summary,
    origen: 'agente',
    timestamp,
    prioridad: 'alta',
  };

  const pasos: AgenticCenterTimelineItem[] = [
    {
      paso: 1,
      label: 'IA detecta situación y genera propuesta',
      estado: 'completado',
      timestamp_opcional: timestamp,
    },
    {
      paso: 2,
      label: `Propuesta lista: ${operacion} en ${entidad}`,
      estado: 'activo',
      timestamp_opcional: timestamp,
    },
    {
      paso: 3,
      label: 'Ejecución en el sistema tras aprobación',
      estado: 'pendiente',
      timestamp_opcional: null,
    },
  ];

  const accion: AgenticCenterActionCard = {
    actionId: confirmation.actionId,
    titulo: confirmation.summary,
    descripcion_negocio:
      `La IA propone ${operacion.toLowerCase()} sobre ${entidad}. ` +
      'Una vez aprobada, la acción se registrará con trazabilidad completa en el SGC.',
    entidad,
    tipo_operacion: operacion,
    estado: 'pendiente',
  };

  const personaTarget: AgenticCenterPersonTarget | null =
    confirmation.request.data?.assignedTo
      ? {
          nombre: String(confirmation.request.data.assignedTo),
          puesto: 'Responsable asignado',
          terminal_nombre: null,
          canal: 'email',
          estado_terminal: null,
          requiere_aprobacion: true,
          politica_aplicada: null,
        }
      : null;

  return {
    id: `dac-${confirmation.actionId}`,
    titulo: confirmation.summary,
    descripcion: `Acción propuesta por la IA: ${confirmation.summary}. Requiere confirmación antes de ejecutarse.`,
    estado: 'esperando',
    timestamp,
    evento_detectado: evento,
    workflow_pasos: pasos,
    accion_propuesta: accion,
    persona_target: personaTarget,
    evidencia_final: null,
    type: 'decision_pendiente',
    source_entity: 'direct_action_confirmation',
    source_id: confirmation.actionId,
    severity: 'alta',
    requires_human_decision: true,
    org_id: orgId,
  };
}

function mapSagaToCase(saga: SagaRun, orgId: string): AgenticCenterCase {
  const timestamp = toIso(saga.created_at as DateLike);
  const isBlocked = saga.status === 'paused';
  const estadoLabel = isBlocked ? 'esperando' : 'activo';
  const severidadLabel = isBlocked ? 'media' : 'baja';

  const pasos: AgenticCenterTimelineItem[] = [
    {
      paso: 1,
      label: `Flujo iniciado — ${saga.goal}`,
      estado: 'completado',
      timestamp_opcional: timestamp,
    },
    {
      paso: 2,
      label: isBlocked
        ? 'Flujo pausado esperando aprobación humana'
        : 'Flujo fallido — requiere intervención',
      estado: 'activo',
      timestamp_opcional: toIso(saga.updated_at as DateLike),
    },
  ];

  if (saga.error?.message) {
    pasos.push({
      paso: 3,
      label: `Incidencia: ${saga.error.message}`,
      estado: 'completado',
      timestamp_opcional: toIso(saga.updated_at as DateLike),
    });
  }

  const evento: AgenticCenterEvent = {
    id: `ev-saga-${saga.id}`,
    tipo: isBlocked ? 'Flujo pausado — aprobación requerida' : 'Flujo fallido',
    descripcion: saga.error?.message
      ? `${saga.goal} — ${saga.error.message}`
      : saga.goal,
    origen: 'agente',
    timestamp,
    prioridad: isBlocked ? 'media' : 'baja',
  };

  return {
    id: `saga-${saga.id}`,
    titulo: isBlocked
      ? `Flujo pausado: ${saga.goal}`
      : `Flujo fallido: ${saga.goal}`,
    descripcion: isBlocked
      ? `El flujo "${saga.goal}" está pausado y requiere aprobación humana para continuar.`
      : `El flujo "${saga.goal}" ha fallado y requiere intervención manual.`,
    estado: estadoLabel as 'esperando' | 'activo',
    timestamp,
    evento_detectado: evento,
    workflow_pasos: pasos,
    accion_propuesta: null,
    persona_target: null,
    evidencia_final: null,
    type: 'saga_bloqueada',
    source_entity: 'saga',
    source_id: saga.id,
    severity: severidadLabel,
    requires_human_decision: isBlocked,
    org_id: orgId,
  };
}

function mapJobToCase(job: AgentJob, orgId: string): AgenticCenterCase {
  const timestamp = toIso(job.created_at as DateLike);

  const evento: AgenticCenterEvent = {
    id: `ev-job-${job.id}`,
    tipo: 'Job fallido',
    descripcion: job.error?.message
      ? `Intent: ${job.intent} — ${job.error.message}`
      : `Intent: ${job.intent} — falló sin detalle`,
    origen: 'agente',
    timestamp,
    prioridad: 'baja',
  };

  const pasos: AgenticCenterTimelineItem[] = [
    {
      paso: 1,
      label: `Job encolado: ${job.intent}`,
      estado: 'completado',
      timestamp_opcional: timestamp,
    },
    {
      paso: 2,
      label: `Job fallido tras ${job.attempts} intento(s)`,
      estado: 'activo',
      timestamp_opcional: toIso(job.updated_at as DateLike),
    },
  ];

  if (job.error?.message) {
    pasos.push({
      paso: 3,
      label: `Error: ${job.error.message}`,
      estado: 'completado',
      timestamp_opcional: toIso(job.updated_at as DateLike),
    });
  }

  return {
    id: `job-${job.id}`,
    titulo: `Job fallido: ${job.intent}`,
    descripcion: `El job con intent "${job.intent}" falló tras ${job.attempts} intento(s). ${job.error?.message ?? ''}`.trim(),
    estado: 'activo',
    timestamp,
    evento_detectado: evento,
    workflow_pasos: pasos,
    accion_propuesta: null,
    persona_target: null,
    evidencia_final: null,
    type: 'job_fallido',
    source_entity: 'job',
    source_id: job.id,
    severity: 'baja',
    requires_human_decision: false,
    org_id: orgId,
  };
}

// ---------------------------------------------------------------------------
// Clase principal
// ---------------------------------------------------------------------------

export class AgenticCenterCaseMapper {
  /**
   * Mapea entidades reales de Firestore en casos del Centro Agéntico.
   * Todas las queries son org-scoped: nunca devuelve datos de otra organización.
   */
  async mapRealCases(
    orgId: string,
    db: Firestore
  ): Promise<AgenticCenterCase[]> {
    const [confirmationCases, sagaCases, jobCases] = await Promise.all([
      this.mapDirectActionConfirmations(orgId, db),
      this.mapBlockedSagas(orgId, db),
      this.mapFailedJobs(orgId, db),
    ]);

    return [...confirmationCases, ...sagaCases, ...jobCases];
  }

  // ---------------------------------------------------------------------------
  // direct_action_confirmations pendientes → casos tipo 'decision_pendiente'
  // ---------------------------------------------------------------------------

  private async mapDirectActionConfirmations(
    orgId: string,
    db: Firestore
  ): Promise<AgenticCenterCase[]> {
    try {
      // La colección direct_action_confirmations no tiene organization_id directo.
      // Filtramos consultando por userId → organization_id en la colección users.
      const snap = await db
        .collection('direct_action_confirmations')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      if (snap.empty) return [];

      const confirmsRaw = snap.docs.map(d => ({
        actionId: d.id,
        ...(d.data() as Omit<DirectActionConfirmation, 'actionId'>),
        createdAt: d.data().createdAt,
      }));

      // Obtener orgs de los userId únicos para filtrar por org
      const userIds = [...new Set(confirmsRaw.map(c => c.userId).filter(Boolean))];
      if (userIds.length === 0) return [];

      const userDocs = await Promise.all(
        userIds.map(uid => db.collection('users').doc(uid).get())
      );

      const userOrgMap = new Map<string, string>();
      for (const userDoc of userDocs) {
        if (userDoc.exists) {
          const orgData = userDoc.data()?.organization_id;
          if (typeof orgData === 'string') {
            userOrgMap.set(userDoc.id, orgData);
          }
        }
      }

      const confirmsOrg = confirmsRaw.filter(
        c => userOrgMap.get(c.userId) === orgId
      );

      return confirmsOrg.map(c =>
        mapConfirmationToCase(
          c as DirectActionConfirmation & { createdAt?: DateLike },
          orgId
        )
      );
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // agent_sagas pausadas o fallidas → casos tipo 'saga_bloqueada'
  // ---------------------------------------------------------------------------

  private async mapBlockedSagas(
    orgId: string,
    db: Firestore
  ): Promise<AgenticCenterCase[]> {
    try {
      // Sagas pausadas — esperan aprobación humana
      const pausedSnap = await db
        .collection('agent_sagas')
        .where('organization_id', '==', orgId)
        .where('status', '==', 'paused')
        .orderBy('updated_at', 'desc')
        .limit(20)
        .get();

      // Sagas fallidas
      const failedSnap = await db
        .collection('agent_sagas')
        .where('organization_id', '==', orgId)
        .where('status', '==', 'failed')
        .orderBy('updated_at', 'desc')
        .limit(20)
        .get();

      const sagas: SagaRun[] = [
        ...pausedSnap.docs.map(d => ({
          ...(d.data() as Omit<SagaRun, 'id'>),
          id: d.id,
        })),
        ...failedSnap.docs.map(d => ({
          ...(d.data() as Omit<SagaRun, 'id'>),
          id: d.id,
        })),
      ];

      return sagas.map(s => mapSagaToCase(s, orgId));
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // agent_jobs fallidos en los últimos 7 días → casos tipo 'job_fallido'
  // ---------------------------------------------------------------------------

  private async mapFailedJobs(
    orgId: string,
    db: Firestore
  ): Promise<AgenticCenterCase[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const snap = await db
        .collection('agent_jobs')
        .where('organization_id', '==', orgId)
        .where('status', '==', 'failed')
        .where('created_at', '>=', sevenDaysAgo)
        .orderBy('created_at', 'desc')
        .limit(20)
        .get();

      if (snap.empty) return [];

      const jobs: AgentJob[] = snap.docs.map(d => ({
        ...(d.data() as Omit<AgentJob, 'id'>),
        id: d.id,
      }));

      return jobs.map(j => mapJobToCase(j, orgId));
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Conteos org-scoped para el summary
  // ---------------------------------------------------------------------------

  /**
   * Cuenta direct_action_confirmations pendientes para la org.
   * Requiere lookup de userId → organization_id.
   */
  async countPendingApprovals(
    orgId: string,
    db: Firestore
  ): Promise<number> {
    try {
      const snap = await db
        .collection('direct_action_confirmations')
        .where('status', '==', 'pending')
        .limit(100)
        .get();

      if (snap.empty) return 0;

      const confirmsRaw = snap.docs.map(d => d.data() as { userId?: string });
      const userIds = [
        ...new Set(confirmsRaw.map(c => c.userId).filter((id): id is string => typeof id === 'string')),
      ];

      if (userIds.length === 0) return 0;

      const userDocs = await Promise.all(
        userIds.map(uid => db.collection('users').doc(uid).get())
      );

      const orgUserIds = new Set<string>();
      for (const userDoc of userDocs) {
        if (userDoc.exists && userDoc.data()?.organization_id === orgId) {
          orgUserIds.add(userDoc.id);
        }
      }

      return snap.docs.filter(d => {
        const data = d.data() as { userId?: string };
        return typeof data.userId === 'string' && orgUserIds.has(data.userId);
      }).length;
    } catch {
      return 0;
    }
  }

  /**
   * Cuenta sagas bloqueadas (paused + failed) para la org.
   */
  async countBlockedSagas(
    orgId: string,
    db: Firestore
  ): Promise<number> {
    try {
      const [pausedSnap, failedSnap] = await Promise.all([
        db
          .collection('agent_sagas')
          .where('organization_id', '==', orgId)
          .where('status', '==', 'paused')
          .get(),
        db
          .collection('agent_sagas')
          .where('organization_id', '==', orgId)
          .where('status', '==', 'failed')
          .get(),
      ]);
      return pausedSnap.size + failedSnap.size;
    } catch {
      return 0;
    }
  }

  /**
   * Cuenta jobs fallidos en los últimos 7 días para la org.
   */
  async countFailedJobs(
    orgId: string,
    db: Firestore
  ): Promise<number> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const snap = await db
        .collection('agent_jobs')
        .where('organization_id', '==', orgId)
        .where('status', '==', 'failed')
        .where('created_at', '>=', sevenDaysAgo)
        .get();

      return snap.size;
    } catch {
      return 0;
    }
  }
}
