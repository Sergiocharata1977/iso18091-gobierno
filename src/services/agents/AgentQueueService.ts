/**
 * Servicio de Cola de Trabajo para Agentes MCP
 * Maneja la creación, procesamiento y estado de trabajos asíncronos.
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentJob, CreateAgentJobRequest, JobStatus } from '@/types/agents';
import { Timestamp } from 'firebase-admin/firestore';

const JOBS_COLLECTION = 'agent_jobs';

export class AgentQueueService {
  private static readonly DEFAULT_LEASE_MINUTES = 5;

  private static buildIdempotencyKey(request: CreateAgentJobRequest): string {
    const explicitKey = request.idempotency_key?.trim();
    if (explicitKey) return explicitKey;

    if (!request.workflow_id || request.step_index === undefined) {
      return '';
    }

    return `${request.workflow_id}:${request.step_index}:${request.intent}`;
  }

  private static isRetryReady(nextRetry: AgentJob['next_retry']): boolean {
    if (!nextRetry) return true;

    const retryDate =
      nextRetry instanceof Date ? nextRetry : (nextRetry as any).toDate?.();
    if (!(retryDate instanceof Date)) return true;
    return retryDate.getTime() <= Date.now();
  }

  private static toDate(
    value?: Date | { toDate?: () => Date } | null
  ): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const converted = value.toDate?.();
    return converted instanceof Date ? converted : null;
  }

  private static buildLeaseExpiry(minutes: number): Date {
    const leaseMs = Math.max(minutes, 1) * 60_000;
    return new Date(Date.now() + leaseMs);
  }

  /**
   * Encola un nuevo trabajo para un agente
   */
  static async enqueueJob(
    request: CreateAgentJobRequest,
    agentInstanceId: string
  ): Promise<string> {
    const db = getAdminFirestore();
    const idempotencyKey = this.buildIdempotencyKey(request) || undefined;

    const jobData: Omit<AgentJob, 'id'> = {
      organization_id: request.organization_id,
      user_id: request.user_id,
      agent_instance_id: agentInstanceId,
      intent: request.intent,
      payload: request.payload,
      status: 'queued',
      priority: request.priority || 'normal',

      // Orquestación
      parent_job_id: request.parent_job_id,
      workflow_id: request.workflow_id,
      step_index: request.step_index,
      idempotency_key: idempotencyKey,

      attempts: 0,
      max_attempts: 3,
      created_at: Timestamp.now().toDate(),
      updated_at: Timestamp.now().toDate(),
    };

    if (idempotencyKey) {
      return await db.runTransaction(async t => {
        const existingJobSnapshot = await t.get(
          db
            .collection(JOBS_COLLECTION)
            .where('idempotency_key', '==', idempotencyKey)
            .limit(1)
        );

        if (!existingJobSnapshot.empty) {
          return existingJobSnapshot.docs[0].id;
        }

        const docRef = db.collection(JOBS_COLLECTION).doc();
        t.set(docRef, jobData);
        return docRef.id;
      });
    }

    const docRef = await db.collection(JOBS_COLLECTION).add(jobData);
    return docRef.id;
  }

  /**
   * Obtiene trabajos pendientes globalmente (para worker background)
   */
  static async getQueuedJobs(limit: number = 10): Promise<AgentJob[]> {
    const db = getAdminFirestore();

    // Requiere índice compuesto: status ASC, priority DESC, created_at ASC
    const snapshot = await db
      .collection(JOBS_COLLECTION)
      .where('status', '==', 'queued')
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc')
      .limit(Math.max(limit * 3, limit))
      .get();

    return snapshot.docs
      .map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as AgentJob
      )
      .filter(job => this.isRetryReady(job.next_retry))
      .slice(0, limit);
  }

  /**
   * Obtiene el siguiente trabajo pendiente para un agente o worker general
   * (Nota: En un entorno real, esto usaría transacciones o un sistema de leasing)
   */
  static async getNextPendingJob(
    organizationId: string,
    limit: number = 1
  ): Promise<AgentJob[]> {
    const db = getAdminFirestore();

    // Buscar jobs en estado 'queued' ordenados por prioridad y fecha
    // Nota: Requiere índice compuesto en Firestore
    const snapshot = await db
      .collection(JOBS_COLLECTION)
      .where('organization_id', '==', organizationId)
      .where('status', '==', 'queued')
      .orderBy('priority', 'desc') // Critical first
      .orderBy('created_at', 'asc') // Oldest first
      .limit(Math.max(limit * 3, limit))
      .get();

    return snapshot.docs
      .map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as AgentJob
      )
      .filter(job => this.isRetryReady(job.next_retry))
      .slice(0, limit);
  }

  /**
   * Marca un trabajo como 'running' (Leasing)
   */
  static async lockJob(
    jobId: string,
    leaseOwner: string = 'worker:unknown',
    leaseMinutes: number = this.DEFAULT_LEASE_MINUTES
  ): Promise<boolean> {
    const db = getAdminFirestore();
    const docRef = db.collection(JOBS_COLLECTION).doc(jobId);

    return await db.runTransaction(async t => {
      const doc = await t.get(docRef);
      if (!doc.exists) return false;

      const data = doc.data() as AgentJob;
      const now = Date.now();
      const leaseExpiresAt = this.toDate(data.lease_expires_at);
      const canClaimQueued = data.status === 'queued';
      const canReclaimExpired =
        data.status === 'running' &&
        (!leaseExpiresAt || leaseExpiresAt.getTime() <= now);

      if (!canClaimQueued && !canReclaimExpired) return false;

      const leaseExpiration = this.buildLeaseExpiry(leaseMinutes);
      t.update(docRef, {
        status: 'running',
        started_at: data.started_at || Timestamp.now().toDate(),
        lease_owner: leaseOwner,
        lease_expires_at: leaseExpiration,
        lease_heartbeat_at: Timestamp.now().toDate(),
        updated_at: Timestamp.now().toDate(),
      });
      return true;
    });
  }

  /**
   * Renueva lease de un job en ejecucion.
   * Devuelve false si el lease ya no pertenece al worker o no puede renovarse.
   */
  static async heartbeatJob(
    jobId: string,
    leaseOwner: string,
    leaseMinutes: number = this.DEFAULT_LEASE_MINUTES
  ): Promise<boolean> {
    const db = getAdminFirestore();
    const docRef = db.collection(JOBS_COLLECTION).doc(jobId);

    return await db.runTransaction(async t => {
      const doc = await t.get(docRef);
      if (!doc.exists) return false;

      const data = doc.data() as AgentJob;
      if (data.status !== 'running') return false;
      if (data.lease_owner !== leaseOwner) return false;

      const leaseExpiresAt = this.toDate(data.lease_expires_at);
      if (leaseExpiresAt && leaseExpiresAt.getTime() <= Date.now())
        return false;

      t.update(docRef, {
        lease_expires_at: this.buildLeaseExpiry(leaseMinutes),
        lease_heartbeat_at: Timestamp.now().toDate(),
        updated_at: Timestamp.now().toDate(),
      });
      return true;
    });
  }

  /**
   * Completa exitosamente un trabajo
   */
  static async completeJob(
    jobId: string,
    result: any,
    evidenceIds: string[] = []
  ): Promise<void> {
    const db = getAdminFirestore();
    const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);

    // 1. Marcar como completado
    await jobRef.update({
      status: 'completed',
      result,
      evidence_ids: evidenceIds,
      lease_owner: null,
      lease_expires_at: null,
      lease_heartbeat_at: null,
      completed_at: Timestamp.now().toDate(),
      updated_at: Timestamp.now().toDate(),
    });

    // 2. Notificar al SagaService (si corresponde)
    // Importamos dinámicamente para evitar dependencias circulares en runtime si fuera necesario
    const { SagaService } = await import('./SagaService');
    const jobDoc = await jobRef.get();
    const job = { id: jobDoc.id, ...jobDoc.data() } as AgentJob;

    if (job.workflow_id) {
      await SagaService.onJobComplete(job, result);
    }
  }

  /**
   * Pausa el trabajo esperando aprobación humana (Approval Gate)
   */
  static async requestApproval(
    jobId: string,
    metadata: { required_role?: string; description: string }
  ): Promise<void> {
    const db = getAdminFirestore();
    const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);

    await jobRef.update({
      status: 'pending_approval',
      approval_metadata: {
        required_role: metadata.required_role || 'user',
        requested_at: Timestamp.now().toDate(),
        status: 'pending',
        feedback: metadata.description, // Usamos feedback para describir qué se pide
      },
      updated_at: Timestamp.now().toDate(),
    });

    const jobDoc = await jobRef.get();
    const job = { id: jobDoc.id, ...jobDoc.data() } as AgentJob;
    if (job.workflow_id) {
      const { SagaService } = await import('./SagaService');
      await SagaService.onJobPendingApproval(job);
    }
  }

  /**
   * Aprueba (o rechaza) un trabajo pausado
   */
  static async approveJob(
    jobId: string,
    userId: string,
    approved: boolean,
    feedback?: string
  ): Promise<void> {
    const db = getAdminFirestore();
    const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);

    await db.runTransaction(async t => {
      const doc = await t.get(jobRef);
      if (!doc.exists) throw new Error('Job not found');

      const data = doc.data() as AgentJob;
      if (data.status !== 'pending_approval')
        throw new Error('Job is not pending approval');

      const newStatus = approved ? 'queued' : 'cancelled'; // Si aprueba, vuelve a la cola. Si no, muere.

      t.update(jobRef, {
        status: newStatus,
        lease_owner: null,
        lease_expires_at: null,
        lease_heartbeat_at: null,
        'approval_metadata.responded_at': Timestamp.now().toDate(),
        'approval_metadata.responded_by': userId,
        'approval_metadata.status': approved ? 'approved' : 'rejected',
        'approval_metadata.feedback': feedback,
        updated_at: Timestamp.now().toDate(),
      });
    });

    const jobDoc = await jobRef.get();
    const sagaJob = {
      ...(jobDoc.data() as AgentJob),
      id: jobDoc.id,
    } as AgentJob;
    if (sagaJob.workflow_id) {
      const { SagaService } = await import('./SagaService');
      await SagaService.onJobApprovalResolved(sagaJob, approved, feedback);
    }
  }

  /**
   * Marca un trabajo como fallido (con reintento si corresponde)
   */
  static async failJob(jobId: string, error: Error): Promise<void> {
    const db = getAdminFirestore();
    const docRef = db.collection(JOBS_COLLECTION).doc(jobId);

    const failedJob = await db.runTransaction(async t => {
      const doc = await t.get(docRef);
      if (!doc.exists) return null;

      const data = doc.data() as AgentJob;
      const newAttempts = (data.attempts || 0) + 1;

      let newStatus: JobStatus = 'failed';
      let nextRetry = null;

      if (newAttempts < data.max_attempts) {
        newStatus = 'queued'; // Re-encolar
        // Backoff exponencial simple: 1min, 2min, 4min...
        const delayMinutes = Math.pow(2, newAttempts - 1);
        const nextDate = new Date();
        nextDate.setMinutes(nextDate.getMinutes() + delayMinutes);
        nextRetry = Timestamp.fromDate(nextDate).toDate();
      }

      t.update(docRef, {
        status: newStatus,
        attempts: newAttempts,
        next_retry: nextRetry,
        lease_owner: null,
        lease_expires_at: null,
        lease_heartbeat_at: null,
        error: {
          code: error.name,
          message: error.message,
          stack: error.stack,
        },
        updated_at: Timestamp.now().toDate(),
      });

      if (newStatus === 'failed') {
        return { ...data, id: doc.id, status: 'failed' } as AgentJob;
      }
      return null;
    });

    if (failedJob && failedJob.workflow_id) {
      const { SagaService } = await import('./SagaService');
      await SagaService.onJobFailed(failedJob, {
        code: error.name || 'JOB_FAILED',
        message: error.message || 'Job failed',
      });
    }
  }
}
