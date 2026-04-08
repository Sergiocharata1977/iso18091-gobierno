export type OnboardingPhase =
  | 'pending_assignment'
  | 'strategy_pending'
  | 'strategy_in_progress'
  | 'strategy_complete'
  | 'draft_generation_running'
  | 'drafts_generated'
  | 'onboarding_completed';

export type OnboardingStrategyChecklistSectionKey =
  | 'identidad'
  | 'alcance'
  | 'contexto'
  | 'estructura'
  | 'politicas';

export type OnboardingChecklistItemStatus =
  | 'pending'
  | 'in_progress'
  | 'complete';

export interface OnboardingStrategyChecklistItem {
  key: OnboardingStrategyChecklistSectionKey;
  label: string;
  status: OnboardingChecklistItemStatus;
  required: boolean;
  completed: boolean;
  missingFields?: string[];
  detail?: string;
}

export interface StrategyChecklistResult {
  progressPercent: number;
  items: OnboardingStrategyChecklistItem[];
  missingRequired: OnboardingStrategyChecklistSectionKey[];
  canGenerateDrafts: boolean;
}

export interface OnboardingStateDTO {
  organization_id: string;
  onboarding_phase: OnboardingPhase;
  onboarding_owner_user_id?: string | null;
  onboarding_system_id?: string | null;
  onboarding_started_at?: string | null;
  onboarding_completed_at?: string | null;
}

export interface GetOnboardingStrategyStatusRequest {
  organization_id: string;
  system_id?: string;
}

export interface GetOnboardingStrategyStatusResponse {
  onboardingState: OnboardingStateDTO;
  checklist: StrategyChecklistResult;
  isOwner: boolean;
  ctaEnabled: boolean;
  nextAction: string;
}

export interface GenerateDraftsFromStrategyRequest {
  organization_id: string;
  system_id: string;
  source_revision_id?: string;
  source_section_refs?: string[];
  mode: 'draft';
  force_regenerate?: boolean;
}

export interface DraftGenerationSummary {
  created: string[];
  skipped: string[];
  errors: string[];
}

export interface GenerateDraftsFromStrategyResponse {
  ok: boolean;
  onboardingPhase: OnboardingPhase;
  summary: DraftGenerationSummary;
  generatedAt?: string;
}
