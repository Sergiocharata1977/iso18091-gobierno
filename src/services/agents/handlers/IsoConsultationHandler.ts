import { AgentJob } from '@/types/agents';
import { ContextRetrievalService } from '../memory/ContextRetrievalService';
import { IntentHandler } from './IntentHandler';

/**
 * Handler para consultas ISO asistidas por contexto (RAG + datos de organizacion).
 */
export class IsoConsultationHandler implements IntentHandler {
  intent = 'iso.consultation';
  private readonly contextRetrievalService: ContextRetrievalService;

  constructor(contextRetrievalService: ContextRetrievalService) {
    this.contextRetrievalService = contextRetrievalService;
  }

  /**
   * Genera respuesta textual orientada a operacion con trazabilidad de fuentes.
   */
  async handle(job: AgentJob): Promise<unknown> {
    const payload = job.payload || {};
    const question =
      payload.query || payload.question || payload.topic || 'consulta ISO';

    const context = await this.contextRetrievalService.retrieveContextBundle(
      job.intent,
      payload,
      job.organization_id
    );

    const responseText =
      context.sources.length > 0
        ? `Consulta: ${question}\n${context.summary}`
        : `Consulta: ${question}\nNo encontre contexto suficiente en la organizacion para responder con precision.`;

    return {
      response_text: responseText,
      sources: context.sources,
      confidence: context.confidence,
    };
  }
}
