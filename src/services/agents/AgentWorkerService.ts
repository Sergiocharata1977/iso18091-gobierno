/**
 * Agent Worker Service (Ejecutor)
 *
 * Procesa trabajos de `agent_jobs` usando handlers modulares por intent.
 */

import { AgentJob } from '@/types/agents';
import { AgentQueueService } from './AgentQueueService';
import { CrmLeadScoringHandler } from './handlers/CrmLeadScoringHandler';
import { GovernanceAlertHandler } from './handlers/GovernanceAlertHandler';
import { IntentHandler } from './handlers/IntentHandler';
import { IsoConsultationHandler } from './handlers/IsoConsultationHandler';
import { QualityMeasurementOverdueReminderHandler } from './handlers/QualityMeasurementOverdueReminderHandler';
import { TaskAssignHandler } from './handlers/TaskAssignHandler';
import { TaskReminderHandler } from './handlers/TaskReminderHandler';
import { WhatsappMessageReceivedHandler } from './handlers/WhatsappMessageReceivedHandler';
import { ContextRetrievalService } from './memory/ContextRetrievalService';

const contextRetriever = new ContextRetrievalService();

export class AgentWorkerService {
  private static readonly LEASE_OWNER = `agent-worker:${process.pid}`;
  private static readonly handlers = this.buildHandlerRegistry();

  /**
   * Procesa un lote de trabajos pendientes.
   */
  static async processPendingJobs(limit: number = 10): Promise<number> {
    console.log('[AgentWorker] Buscando trabajos pendientes...');

    const jobs = await AgentQueueService.getQueuedJobs(limit);

    if (jobs.length === 0) {
      console.log('[AgentWorker] No hay trabajos pendientes.');
      return 0;
    }

    let processedCount = 0;

    for (const job of jobs) {
      console.log(
        `[AgentWorker] Procesando job ${job.id} (intent: ${job.intent})...`
      );

      try {
        const locked = await AgentQueueService.lockJob(
          job.id,
          this.LEASE_OWNER
        );

        if (!locked) {
          console.log(
            `[AgentWorker] Job ${job.id} omitido: lease activo en otro worker.`
          );
          continue;
        }

        const enrichedPayload = await contextRetriever.enrichPayload(job);
        const enrichedJob: AgentJob = {
          ...job,
          payload: enrichedPayload,
        };

        await AgentQueueService.heartbeatJob(job.id, this.LEASE_OWNER);

        const result = await this.executeIntent(enrichedJob);
        await AgentQueueService.completeJob(job.id, result);
        processedCount++;
      } catch (error: any) {
        console.error(`[AgentWorker] Error procesando job ${job.id}:`, error);
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
        await AgentQueueService.failJob(job.id, normalizedError);
      }
    }

    return processedCount;
  }

  /**
   * Ejecuta un handler registrado por intent.
   */
  private static async executeIntent(job: AgentJob): Promise<unknown> {
    const handler = this.handlers.get(job.intent);

    if (!handler) {
      console.warn(`[AgentWorker] Intent no reconocido: ${job.intent}`);
      return { error: 'Unknown intent', intent: job.intent };
    }

    return handler.handle(job);
  }

  /**
   * Construye el registry de handlers disponibles.
   */
  private static buildHandlerRegistry(): Map<string, IntentHandler> {
    const handlers: IntentHandler[] = [
      new GovernanceAlertHandler(),
      new WhatsappMessageReceivedHandler(),
      new TaskAssignHandler(),
      new TaskReminderHandler(),
      new QualityMeasurementOverdueReminderHandler(),
      new IsoConsultationHandler(contextRetriever),
      new CrmLeadScoringHandler(),
    ];

    return new Map(handlers.map(handler => [handler.intent, handler]));
  }
}
