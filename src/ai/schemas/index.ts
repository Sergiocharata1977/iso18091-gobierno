import { z } from 'zod';

import type { AIContractId } from '@/ai/types';

import { isoActionRecommendationSchemaV1 } from './iso-action-recommendation.v1';
import { isoDocumentGenerationSchemaV1 } from './iso-document-generation.v1';
import { isoGapEvaluationSchemaV1 } from './iso-gap-evaluation.v1';
import { isoIndicatorAnalysisSchemaV1 } from './iso-indicator-analysis.v1';

export * from './common';
export * from './iso-action-recommendation.v1';
export * from './iso-document-generation.v1';
export * from './iso-gap-evaluation.v1';
export * from './iso-indicator-analysis.v1';

export const aiStructuredOutputSchemas: Record<AIContractId, z.ZodTypeAny> = {
  iso_gap_evaluation_v1: isoGapEvaluationSchemaV1,
  iso_indicator_analysis_v1: isoIndicatorAnalysisSchemaV1,
  iso_action_recommendation_v1: isoActionRecommendationSchemaV1,
  iso_document_generation_v1: isoDocumentGenerationSchemaV1,
};
