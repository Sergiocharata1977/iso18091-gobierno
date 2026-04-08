/**
 * Servicio de Orquestación de Sagas
 * Coordina la ejecución de tareas complejas divididas en pasos (AgentJobs).
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AgenticCenterTimelineItem } from '@/types/agentic-center';
import { AgentJob } from '@/types/agents';
import { CreateSagaRequest, SagaRun, SagaStep } from '@/types/sagas';
import { Timestamp } from 'firebase-admin/firestore';
import { AgentQueueService } from './AgentQueueService';

const SAGAS_COLLECTION = 'agent_sagas';

type DateLike =
  | Date
  | {
      toDate?: () => Date;
    }
  | null
  | undefined;

function toIsoString(value: DateLike): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const converted = value.toDate?.();
  return converted instanceof Date ? converted.toISOString() : null;
}

function humanizeIntent(intent?: string): string {
  if (!intent) return 'Paso automático';
  return intent
    .split('.')
    .map(part =>
      part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part
    )
    .join(' / ');
}

export class SagaService {
  private static normalizeAndValidatePlannedSteps(
    rawSteps: unknown
  ): SagaStep[] {
    if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
      throw new Error('Plan must include at least one step');
    }

    const normalizedSteps: SagaStep[] = rawSteps.map((rawStep, index) => {
      if (!rawStep || typeof rawStep !== 'object') {
        throw new Error(`Step ${index} must be an object`);
      }

      const candidate = rawStep as Partial<SagaStep>;
      const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
      const intent =
        typeof candidate.intent === 'string' ? candidate.intent.trim() : '';

      if (!id) throw new Error(`Step ${index} has invalid id`);
      if (!intent) throw new Error(`Step ${index} has invalid intent`);

      const dependsOn = Array.isArray(candidate.depends_on)
        ? candidate.depends_on
            .filter((dep): dep is string => typeof dep === 'string')
            .map(dep => dep.trim())
            .filter(Boolean)
        : undefined;

      return {
        id,
        intent,
        compensate_intent:
          typeof candidate.compensate_intent === 'string' &&
          candidate.compensate_intent.trim()
            ? candidate.compensate_intent.trim()
            : undefined,
        payload: candidate.payload ?? {},
        depends_on: dependsOn && dependsOn.length > 0 ? dependsOn : undefined,
        status: 'pending',
        assigned_agent_id:
          typeof candidate.assigned_agent_id === 'string' &&
          candidate.assigned_agent_id.trim()
            ? candidate.assigned_agent_id.trim()
            : undefined,
        description:
          typeof candidate.description === 'string' &&
          candidate.description.trim()
            ? candidate.description.trim()
            : undefined,
      };
    });

    const ids = new Set<string>();
    for (const step of normalizedSteps) {
      if (ids.has(step.id)) throw new Error(`Duplicate step id: ${step.id}`);
      ids.add(step.id);
    }

    for (const step of normalizedSteps) {
      for (const depId of step.depends_on || []) {
        if (depId === step.id) {
          throw new Error(`Step ${step.id} cannot depend on itself`);
        }
        if (!ids.has(depId)) {
          throw new Error(`Step ${step.id} depends on unknown step: ${depId}`);
        }
      }
    }

    const graph = new Map<string, string[]>();
    for (const step of normalizedSteps) {
      graph.set(step.id, step.depends_on || []);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (node: string): void => {
      if (visiting.has(node)) {
        throw new Error(`Cycle detected involving step: ${node}`);
      }
      if (visited.has(node)) return;

      visiting.add(node);
      for (const dep of graph.get(node) || []) dfs(dep);
      visiting.delete(node);
      visited.add(node);
    };

    for (const step of normalizedSteps) dfs(step.id);
    return normalizedSteps;
  }

  private static buildCompensationPolicy(
    steps: SagaStep[],
    failedStepIndex: number
  ): NonNullable<SagaRun['error']>['compensation'] {
    const hasLateFailure = failedStepIndex > 0;
    const completedCompensableSteps = steps
      .slice(0, failedStepIndex)
      .filter(
        step =>
          step.status === 'completed' &&
          typeof step.compensate_intent === 'string' &&
          step.compensate_intent.trim().length > 0
      )
      .reverse()
      .map(step => ({
        step_id: step.id,
        compensate_intent: step.compensate_intent as string,
      }));

    if (hasLateFailure && completedCompensableSteps.length > 0) {
      return {
        policy: 'manual_per_step',
        reason: 'late_step_failure',
        pending_steps: completedCompensableSteps,
      };
    }

    return {
      policy: 'none',
      reason: 'no_compensation_needed',
      pending_steps: [],
    };
  }

  /**
   * Obtiene una saga por ID.
   */
  static async getSagaById(sagaId: string): Promise<SagaRun | null> {
    const db = getAdminFirestore();
    const sagaDoc = await db.collection(SAGAS_COLLECTION).doc(sagaId).get();

    if (!sagaDoc.exists) {
      return null;
    }

    return {
      ...(sagaDoc.data() as Omit<SagaRun, 'id'>),
      id: sagaDoc.id,
    };
  }

  static async listSagasByOrganization(
    organizationId: string,
    options?: {
      statuses?: SagaRun['status'][];
      limit?: number;
    }
  ): Promise<SagaRun[]> {
    const db = getAdminFirestore();
    const limit = Math.max(options?.limit ?? 10, 1);
    const statuses = options?.statuses?.filter(Boolean);

    const snapshot = await db
      .collection(SAGAS_COLLECTION)
      .where('organization_id', '==', organizationId)
      .orderBy('created_at', 'desc')
      .limit(statuses && statuses.length > 0 ? limit * 3 : limit)
      .get();

    const sagas = snapshot.docs.map(doc => ({
      ...(doc.data() as Omit<SagaRun, 'id'>),
      id: doc.id,
    }));

    if (!statuses || statuses.length === 0) {
      return sagas.slice(0, limit);
    }

    return sagas.filter(saga => statuses.includes(saga.status)).slice(0, limit);
  }

  static getCurrentStep(saga: SagaRun): SagaStep | null {
    const runningStep =
      saga.steps.find(step => step.status === 'running') ||
      saga.steps.find(step => step.status === 'failed');
    if (runningStep) return runningStep;

    const pendingStep = saga.steps.find(step => step.status === 'pending');
    if (pendingStep) return pendingStep;

    return saga.steps[saga.current_step_index] || saga.steps.at(-1) || null;
  }

  static buildTimelineItems(saga: SagaRun): AgenticCenterTimelineItem[] {
    const items: AgenticCenterTimelineItem[] = [];

    // Paso 0: inicio del workflow (siempre presente)
    const estadoInicio: AgenticCenterTimelineItem['estado'] =
      saga.status === 'failed' || saga.status === 'cancelled'
        ? 'completado'
        : saga.status === 'completed'
          ? 'completado'
          : 'completado';

    items.push({
      paso: 1,
      label: 'Flujo iniciado — ' + saga.goal,
      estado: estadoInicio,
      timestamp_opcional: toIsoString(saga.created_at),
    });

    // Pasos del plan (2-based desde el inicio del workflow)
    saga.steps.forEach((step, index) => {
      const estado: AgenticCenterTimelineItem['estado'] =
        step.status === 'completed'
          ? 'completado'
          : step.status === 'running'
            ? 'activo'
            : step.status === 'failed'
              ? 'completado'
              : 'pendiente';

      items.push({
        paso: index + 2,
        label: step.description || humanizeIntent(step.intent),
        estado,
        timestamp_opcional:
          step.status === 'completed' || step.status === 'failed'
            ? toIsoString(saga.updated_at)
            : step.status === 'running'
              ? toIsoString(saga.updated_at)
              : null,
      });
    });

    // Si hay error, agregar paso final de incidencia
    if (saga.error?.message) {
      items.push({
        paso: items.length + 1,
        label: 'Incidencia registrada en el flujo',
        estado: 'completado',
        timestamp_opcional: toIsoString(saga.updated_at),
      });
    }

    return items;
  }

  /**
   * Inicia una nueva Saga
   */
  static async startSaga(request: CreateSagaRequest): Promise<string> {
    const db = getAdminFirestore();

    // 1. Crear estructura inicial de la Saga
    const sagaData: Omit<SagaRun, 'id'> = {
      organization_id: request.organization_id,
      user_id: request.user_id,
      goal: request.goal,
      status: 'planning', // Empieza planeando (o running si ya tuviera pasos)
      current_step_index: 0,
      steps: [],
      context: request.initial_context || {},
      created_at: Timestamp.now().toDate(),
      updated_at: Timestamp.now().toDate(),
    };

    const docRef = await db.collection(SAGAS_COLLECTION).add(sagaData);
    const sagaId = docRef.id;

    // 2. Encolar el primer Job: "Planificar Saga" (El Supervisor decide los pasos)
    // Este job especial usará un agente con capacidad "saga.plan"
    await AgentQueueService.enqueueJob(
      {
        organization_id: request.organization_id,
        user_id: request.user_id,
        intent: 'saga.plan', // Intent especial para planificar
        payload: {
          saga_id: sagaId,
          goal: request.goal,
          context: request.initial_context,
        },
        workflow_id: sagaId,
        priority: 'high',
      },
      'supervisor'
    ); // Asignado a un agente 'supervisor' virtual o real

    return sagaId;
  }

  /**
   * Se llama cuando un Job asociado a una Saga termina (hook desde AgentQueueService)
   */
  static async onJobComplete(job: AgentJob, result: any): Promise<void> {
    if (!job.workflow_id) return; // No es parte de una saga

    const db = getAdminFirestore();
    const sagaRef = db.collection(SAGAS_COLLECTION).doc(job.workflow_id);

    await db.runTransaction(async t => {
      const sagaDoc = await t.get(sagaRef);
      if (!sagaDoc.exists) return;

      const saga = sagaDoc.data() as SagaRun;

      // Caso A: El job era de PLANIFICACIÓN (el supervisor definió los pasos)
      if (job.intent === 'saga.plan') {
        let plannedSteps: SagaStep[];
        try {
          plannedSteps = this.normalizeAndValidatePlannedSteps(result?.steps);
        } catch (validationError) {
          // Saga fallida o vacía
          t.update(sagaRef, {
            status: 'failed',
            error: {
              code: 'PLANNING_FAILED',
              message:
                validationError instanceof Error
                  ? validationError.message
                  : 'Invalid saga plan',
            },
            updated_at: Timestamp.now().toDate(),
          });
          return;
        }

        // Guardar pasos y arrancar el primero
        t.update(sagaRef, {
          status: 'running',
          steps: plannedSteps,
          updated_at: Timestamp.now().toDate(),
        });

        // (Fuera de transacción idealmente, pero simplificado aquí)
        // El primer paso se encolará en un proceso separado o right here
        // Para robustez, mejor es tener un "SagaRunner" que pollea, pero aquí haremos dispatch directo
        // NOTA: No podemos hacer side-effects async dentro de transacción de Firestore fácilmente.
        // Marcamos flag para dispatch posterior.
      }

      // Caso B: Un paso normal terminó
      else {
        // Encontrar el paso asociado a este job
        const stepIndex = saga.steps.findIndex(s => s.job_id === job.id);
        if (stepIndex === -1) return;

        const updatedSteps = [...saga.steps];
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          status: 'completed',
          result: result,
          error: undefined,
          job_id: job.id, // Asegurar que esté linkeado
        };

        // Actualizar contexto global con el resultado de este paso
        // Ej: step output se guarda en context[step_id]
        const newContext = {
          ...saga.context,
          [updatedSteps[stepIndex].id]: result,
        };

        // Verificar si terminaron todos
        const allCompleted = updatedSteps.every(
          s => s.status === 'completed' || s.status === 'skipped'
        );

        if (allCompleted) {
          t.update(sagaRef, {
            status: 'completed',
            steps: updatedSteps,
            context: newContext,
            completed_at: Timestamp.now().toDate(),
            updated_at: Timestamp.now().toDate(),
          });
        } else {
          // Si no terminó, actualizar estado parcial
          t.update(sagaRef, {
            steps: updatedSteps,
            context: newContext,
            updated_at: Timestamp.now().toDate(),
          });

          // Aquí deberíamos disparar el siguiente paso dependiente
          // Lo haremos "trigger" vía una función separada `evaluateSagaProgress`
        }
      }
    });

    // Post-tx: Evaluar progreso para lanzar siguientes pasos
    await this.evaluateSagaProgress(job.workflow_id);
  }

  /**
   * Se llama cuando un job de saga queda pendiente de aprobación humana.
   */
  static async onJobPendingApproval(job: AgentJob): Promise<void> {
    if (!job.workflow_id) return;

    const db = getAdminFirestore();
    const sagaRef = db.collection(SAGAS_COLLECTION).doc(job.workflow_id);

    await db.runTransaction(async t => {
      const sagaDoc = await t.get(sagaRef);
      if (!sagaDoc.exists) return;

      const saga = sagaDoc.data() as SagaRun;
      if (
        saga.status === 'completed' ||
        saga.status === 'failed' ||
        saga.status === 'cancelled'
      ) {
        return;
      }

      t.update(sagaRef, {
        status: 'paused',
        updated_at: Timestamp.now().toDate(),
      });
    });
  }

  /**
   * Se llama cuando una aprobación humana se resuelve (approve/reject).
   */
  static async onJobApprovalResolved(
    job: AgentJob,
    approved: boolean,
    feedback?: string
  ): Promise<void> {
    if (!job.workflow_id) return;

    if (!approved) {
      await this.onJobCancelled(job, feedback || 'Approval rejected');
      return;
    }

    const db = getAdminFirestore();
    const sagaRef = db.collection(SAGAS_COLLECTION).doc(job.workflow_id);

    await db.runTransaction(async t => {
      const sagaDoc = await t.get(sagaRef);
      if (!sagaDoc.exists) return;

      const saga = sagaDoc.data() as SagaRun;
      if (
        saga.status === 'completed' ||
        saga.status === 'failed' ||
        saga.status === 'cancelled'
      ) {
        return;
      }

      t.update(sagaRef, {
        status: 'running',
        updated_at: Timestamp.now().toDate(),
      });
    });

    await this.evaluateSagaProgress(job.workflow_id);
  }

  /**
   * Se llama cuando un job de saga falla definitivamente.
   */
  static async onJobFailed(
    job: AgentJob,
    error: { code: string; message: string }
  ): Promise<void> {
    if (!job.workflow_id) return;

    const db = getAdminFirestore();
    const sagaRef = db.collection(SAGAS_COLLECTION).doc(job.workflow_id);

    await db.runTransaction(async t => {
      const sagaDoc = await t.get(sagaRef);
      if (!sagaDoc.exists) return;

      const saga = sagaDoc.data() as SagaRun;
      if (
        saga.status === 'completed' ||
        saga.status === 'failed' ||
        saga.status === 'cancelled'
      ) {
        return;
      }

      const updatedSteps = [...saga.steps];
      const stepIndex = updatedSteps.findIndex(s => s.job_id === job.id);
      if (stepIndex !== -1) {
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          status: 'failed',
          error: error.message,
          job_id: job.id,
        };
      }

      const compensationPolicy =
        stepIndex !== -1
          ? this.buildCompensationPolicy(updatedSteps, stepIndex)
          : {
              policy: 'none',
              reason: 'no_compensation_needed',
              pending_steps: [],
            };

      t.update(sagaRef, {
        status: 'failed',
        steps: updatedSteps,
        error: {
          code: error.code,
          message: error.message,
          failed_step_id:
            stepIndex !== -1 ? updatedSteps[stepIndex].id : undefined,
          compensation: compensationPolicy,
        },
        updated_at: Timestamp.now().toDate(),
      });
    });
  }

  /**
   * Se llama cuando un job de saga se cancela (por ejemplo rechazo humano).
   */
  static async onJobCancelled(job: AgentJob, reason: string): Promise<void> {
    if (!job.workflow_id) return;

    const db = getAdminFirestore();
    const sagaRef = db.collection(SAGAS_COLLECTION).doc(job.workflow_id);

    await db.runTransaction(async t => {
      const sagaDoc = await t.get(sagaRef);
      if (!sagaDoc.exists) return;

      const saga = sagaDoc.data() as SagaRun;
      if (
        saga.status === 'completed' ||
        saga.status === 'failed' ||
        saga.status === 'cancelled'
      ) {
        return;
      }

      const updatedSteps = [...saga.steps];
      const stepIndex = updatedSteps.findIndex(s => s.job_id === job.id);
      if (stepIndex !== -1) {
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          status: 'failed',
          error: reason,
          job_id: job.id,
        };
      }

      t.update(sagaRef, {
        status: 'cancelled',
        steps: updatedSteps,
        error: {
          code: 'JOB_CANCELLED',
          message: reason,
          failed_step_id:
            stepIndex !== -1 ? updatedSteps[stepIndex].id : undefined,
        },
        updated_at: Timestamp.now().toDate(),
      });
    });
  }

  /**
   * Evalúa qué pasos pueden ejecutarse ahora
   */
  static async evaluateSagaProgress(sagaId: string): Promise<void> {
    const db = getAdminFirestore();
    const sagaRef = db.collection(SAGAS_COLLECTION).doc(sagaId);
    type LockedStep = {
      id: string;
      payload: any;
      intent: string;
      assigned_agent_id?: string;
      step_index: number;
    };

    const txResult = await db.runTransaction(async t => {
      const sagaDoc = await t.get(sagaRef);
      if (!sagaDoc.exists) {
        return null;
      }

      const saga = sagaDoc.data() as SagaRun;
      if (saga.status !== 'running') {
        return null;
      }

      const updatedSteps = [...saga.steps];
      const stepsToDispatch: LockedStep[] = [];

      for (let i = 0; i < updatedSteps.length; i++) {
        const step = updatedSteps[i];
        if (step.status !== 'pending') continue;

        const dependenciesMet =
          !step.depends_on ||
          step.depends_on.every(depId => {
            const depStep = saga.steps.find(s => s.id === depId);
            return (
              depStep &&
              (depStep.status === 'completed' || depStep.status === 'skipped')
            );
          });

        if (!dependenciesMet) continue;

        updatedSteps[i] = {
          ...step,
          status: 'running',
          job_id: `dispatching:${Date.now()}:${step.id}`,
        };
        stepsToDispatch.push({
          id: step.id,
          payload: step.payload,
          intent: step.intent,
          assigned_agent_id: step.assigned_agent_id,
          step_index: i,
        });
      }

      if (stepsToDispatch.length === 0) {
        return null;
      }

      t.update(sagaRef, {
        steps: updatedSteps,
        updated_at: Timestamp.now().toDate(),
      });

      return {
        organization_id: saga.organization_id,
        user_id: saga.user_id,
        context: saga.context,
        stepsToDispatch,
      };
    });

    if (!txResult) return;

    const stepIdToJobId = new Map<string, string>();
    for (const step of txResult.stepsToDispatch) {
      try {
        const jobPayload = {
          ...step.payload,
          _saga_context: txResult.context,
        };

        const jobId = await AgentQueueService.enqueueJob(
          {
            organization_id: txResult.organization_id,
            user_id: txResult.user_id,
            intent: step.intent,
            payload: jobPayload,
            workflow_id: sagaId,
            step_index: step.step_index,
          },
          step.assigned_agent_id || 'auto'
        );

        stepIdToJobId.set(step.id, jobId);
      } catch (error) {
        await this.onJobFailed(
          {
            id: `dispatch:${step.id}`,
            organization_id: txResult.organization_id,
            user_id: txResult.user_id,
            agent_instance_id: step.assigned_agent_id || 'auto',
            intent: step.intent,
            payload: step.payload,
            workflow_id: sagaId,
            step_index: step.step_index,
            status: 'failed',
            priority: 'high',
            attempts: 1,
            max_attempts: 1,
            created_at: Timestamp.now().toDate(),
            updated_at: Timestamp.now().toDate(),
            error: {
              code: 'DISPATCH_ERROR',
              message:
                error instanceof Error
                  ? error.message
                  : 'Unknown dispatch error',
            },
          },
          {
            code: 'DISPATCH_ERROR',
            message:
              error instanceof Error ? error.message : 'Unknown dispatch error',
          }
        );
        return;
      }
    }

    await db.runTransaction(async t => {
      const sagaDoc = await t.get(sagaRef);
      if (!sagaDoc.exists) return;

      const saga = sagaDoc.data() as SagaRun;
      const updatedSteps = [...saga.steps];
      let hasUpdates = false;

      for (let i = 0; i < updatedSteps.length; i++) {
        const step = updatedSteps[i];
        const mappedJobId = stepIdToJobId.get(step.id);
        if (!mappedJobId) continue;

        updatedSteps[i] = {
          ...step,
          job_id: mappedJobId,
        };
        hasUpdates = true;
      }

      if (!hasUpdates) return;
      t.update(sagaRef, {
        steps: updatedSteps,
        updated_at: Timestamp.now().toDate(),
      });
    });
  }
}
