export const AI_CONTRACT_IDS = [
  'iso_gap_evaluation_v1',
  'iso_indicator_analysis_v1',
  'iso_action_recommendation_v1',
  'iso_document_generation_v1',
] as const;

export type AIContractId = (typeof AI_CONTRACT_IDS)[number];

export const AI_MATURITY_BANDS = ['B1', 'B2', 'B3'] as const;
export type AIMaturityBand = (typeof AI_MATURITY_BANDS)[number];

export type AIResponseMode = 'json' | 'text';

export interface VersionedAIPromptDefinition<TInput = Record<string, unknown>> {
  id: AIContractId;
  version: 'v1';
  domain: 'iso_sgc';
  responseMode: AIResponseMode;
  objective: string;
  buildPrompt: (input: TInput) => string;
}
