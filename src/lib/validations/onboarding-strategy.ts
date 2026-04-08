import { z } from 'zod';
import type {
  DraftGenerationSummary,
  GenerateDraftsFromStrategyRequest,
  GenerateDraftsFromStrategyResponse,
  GetOnboardingStrategyStatusRequest,
  GetOnboardingStrategyStatusResponse,
  OnboardingChecklistItemStatus,
  OnboardingPhase,
  OnboardingStateDTO,
  OnboardingStrategyChecklistItem,
  OnboardingStrategyChecklistSectionKey,
  StrategyChecklistResult,
} from '@/types/onboarding-strategy';

export const onboardingPhaseSchema = z.enum([
  'pending_assignment',
  'strategy_pending',
  'strategy_in_progress',
  'strategy_complete',
  'draft_generation_running',
  'drafts_generated',
  'onboarding_completed',
]);

export const onboardingStrategyChecklistSectionKeySchema = z.enum([
  'identidad',
  'alcance',
  'contexto',
  'estructura',
  'politicas',
]);

export const onboardingChecklistItemStatusSchema = z.enum([
  'pending',
  'in_progress',
  'complete',
]);

export const onboardingStrategyChecklistItemSchema = z.object({
  key: onboardingStrategyChecklistSectionKeySchema,
  label: z.string().min(1),
  status: onboardingChecklistItemStatusSchema,
  required: z.boolean(),
  completed: z.boolean(),
  missingFields: z.array(z.string().min(1)).optional(),
  detail: z.string().optional(),
});

export const strategyChecklistResultSchema = z.object({
  progressPercent: z.number().min(0).max(100),
  items: z.array(onboardingStrategyChecklistItemSchema),
  missingRequired: z.array(onboardingStrategyChecklistSectionKeySchema),
  canGenerateDrafts: z.boolean(),
});

export const onboardingStateSchema = z.object({
  organization_id: z.string().min(1),
  onboarding_phase: onboardingPhaseSchema,
  onboarding_owner_user_id: z.string().min(1).nullable().optional(),
  onboarding_system_id: z.string().min(1).nullable().optional(),
  onboarding_started_at: z.string().datetime().nullable().optional(),
  onboarding_completed_at: z.string().datetime().nullable().optional(),
});

export const getOnboardingStrategyStatusRequestSchema = z.object({
  organization_id: z.string().min(1),
  system_id: z.string().min(1).optional(),
});

export const getOnboardingStrategyStatusResponseSchema = z.object({
  onboardingState: onboardingStateSchema,
  checklist: strategyChecklistResultSchema,
  isOwner: z.boolean(),
  ctaEnabled: z.boolean(),
  nextAction: z.string().min(1),
});

export const generateDraftsFromStrategyRequestSchema = z.object({
  organization_id: z.string().min(1),
  system_id: z.string().min(1),
  source_revision_id: z.string().min(1).optional(),
  source_section_refs: z.array(z.string().min(1)).min(1).optional(),
  mode: z.literal('draft'),
  force_regenerate: z.boolean().optional(),
});

export const draftGenerationSummarySchema = z.object({
  created: z.array(z.string()),
  skipped: z.array(z.string()),
  errors: z.array(z.string()),
});

export const generateDraftsFromStrategyResponseSchema = z.object({
  ok: z.boolean(),
  onboardingPhase: onboardingPhaseSchema,
  summary: draftGenerationSummarySchema,
  generatedAt: z.string().datetime().optional(),
});

export type OnboardingPhaseInput = z.infer<typeof onboardingPhaseSchema>;
export type OnboardingStrategyChecklistSectionKeyInput = z.infer<
  typeof onboardingStrategyChecklistSectionKeySchema
>;
export type OnboardingChecklistItemStatusInput = z.infer<
  typeof onboardingChecklistItemStatusSchema
>;
export type OnboardingStrategyChecklistItemInput = z.infer<
  typeof onboardingStrategyChecklistItemSchema
>;
export type StrategyChecklistResultInput = z.infer<
  typeof strategyChecklistResultSchema
>;
export type OnboardingStateInput = z.infer<typeof onboardingStateSchema>;
export type GetOnboardingStrategyStatusRequestInput = z.infer<
  typeof getOnboardingStrategyStatusRequestSchema
>;
export type GetOnboardingStrategyStatusResponseInput = z.infer<
  typeof getOnboardingStrategyStatusResponseSchema
>;
export type GenerateDraftsFromStrategyRequestInput = z.infer<
  typeof generateDraftsFromStrategyRequestSchema
>;
export type DraftGenerationSummaryInput = z.infer<
  typeof draftGenerationSummarySchema
>;
export type GenerateDraftsFromStrategyResponseInput = z.infer<
  typeof generateDraftsFromStrategyResponseSchema
>;

// Compile-time drift guards: if interfaces and schemas diverge, type-check fails.
type AssertTrue<T extends true> = T;
type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type _OnboardingPhaseExact = AssertTrue<
  IsExact<OnboardingPhaseInput, OnboardingPhase>
>;
type _ChecklistSectionKeyExact = AssertTrue<
  IsExact<
    OnboardingStrategyChecklistSectionKeyInput,
    OnboardingStrategyChecklistSectionKey
  >
>;
type _ChecklistItemStatusExact = AssertTrue<
  IsExact<OnboardingChecklistItemStatusInput, OnboardingChecklistItemStatus>
>;
type _ChecklistItemExact = AssertTrue<
  IsExact<OnboardingStrategyChecklistItemInput, OnboardingStrategyChecklistItem>
>;
type _ChecklistResultExact = AssertTrue<
  IsExact<StrategyChecklistResultInput, StrategyChecklistResult>
>;
type _OnboardingStateExact = AssertTrue<
  IsExact<OnboardingStateInput, OnboardingStateDTO>
>;
type _GetStatusReqExact = AssertTrue<
  IsExact<
    GetOnboardingStrategyStatusRequestInput,
    GetOnboardingStrategyStatusRequest
  >
>;
type _GetStatusResExact = AssertTrue<
  IsExact<
    GetOnboardingStrategyStatusResponseInput,
    GetOnboardingStrategyStatusResponse
  >
>;
type _GenerateReqExact = AssertTrue<
  IsExact<
    GenerateDraftsFromStrategyRequestInput,
    GenerateDraftsFromStrategyRequest
  >
>;
type _DraftSummaryExact = AssertTrue<
  IsExact<DraftGenerationSummaryInput, DraftGenerationSummary>
>;
type _GenerateResExact = AssertTrue<
  IsExact<
    GenerateDraftsFromStrategyResponseInput,
    GenerateDraftsFromStrategyResponse
  >
>;
