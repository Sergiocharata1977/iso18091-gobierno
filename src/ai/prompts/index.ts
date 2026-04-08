import type { AIContractId, VersionedAIPromptDefinition } from '@/ai/types';

import {
  isoActionRecommendationPromptV1,
  type IsoActionRecommendationPromptInput,
} from './iso-action-recommendation.v1';
import {
  isoDocumentGenerationPromptV1,
  type IsoDocumentGenerationPromptInput,
} from './iso-document-generation.v1';
import {
  isoGapEvaluationPromptV1,
  type IsoGapEvaluationPromptInput,
} from './iso-gap-evaluation.v1';
import {
  isoIndicatorAnalysisPromptV1,
  type IsoIndicatorAnalysisPromptInput,
} from './iso-indicator-analysis.v1';

export * from './iso-action-recommendation.v1';
export * from './iso-document-generation.v1';
export * from './iso-gap-evaluation.v1';
export * from './iso-indicator-analysis.v1';

export const aiPromptRegistry: Record<
  AIContractId,
  VersionedAIPromptDefinition<any>
> = {
  iso_gap_evaluation_v1: isoGapEvaluationPromptV1,
  iso_indicator_analysis_v1: isoIndicatorAnalysisPromptV1,
  iso_action_recommendation_v1: isoActionRecommendationPromptV1,
  iso_document_generation_v1: isoDocumentGenerationPromptV1,
};

export type AIPromptInputByContract = {
  iso_gap_evaluation_v1: IsoGapEvaluationPromptInput;
  iso_indicator_analysis_v1: IsoIndicatorAnalysisPromptInput;
  iso_action_recommendation_v1: IsoActionRecommendationPromptInput;
  iso_document_generation_v1: IsoDocumentGenerationPromptInput;
};

export function buildVersionedAIPrompt<TContractId extends AIContractId>(
  contractId: TContractId,
  input: AIPromptInputByContract[TContractId]
): string {
  const prompt = aiPromptRegistry[contractId];
  return prompt.buildPrompt(input);
}
