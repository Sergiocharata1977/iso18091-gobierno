import { AgentJob } from '@/types/agents';

/**
 * Contrato base para handlers de intents del Agent Worker.
 */
export interface IntentHandler {
  intent: string;
  handle(job: AgentJob): Promise<unknown>;
}
