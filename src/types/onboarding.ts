import type { OrganizationCommercialBootstrapState } from '@/types/onboarding-commercial';

export type OnboardingPhase =
  | 'not_started'
  | 'started'
  | 'commercial_bootstrap_started'
  | 'commercial_bootstrap_completed'
  | 'systems_selected'
  | 'provisioning'
  | 'provisioned'
  | 'completed'
  | 'blocked'
  | (string & {});

export const ONBOARDING_PHASES_IN_ORDER: readonly OnboardingPhase[] = [
  'not_started',
  'started',
  'commercial_bootstrap_started',
  'commercial_bootstrap_completed',
  'systems_selected',
  'provisioning',
  'provisioned',
  'completed',
  'blocked',
] as const;

export interface OrganizationOnboardingOwner {
  user_id: string;
  display_name?: string | null;
  email?: string | null;
}

export interface OrganizationOnboardingState {
  organization_id: string;
  system_id: string;
  onboarding_phase: OnboardingPhase;
  owner: OrganizationOnboardingOwner | null;
  bootstrap: OrganizationCommercialBootstrapState | null;
  created_at: Date | null;
  updated_at: Date | null;
  phase_updated_at: Date | null;
  completed_at: Date | null;
}

export interface UpsertOrganizationOnboardingStateInput {
  organization_id: string;
  onboarding_phase: OnboardingPhase;
  system_id?: string;
  owner?: OrganizationOnboardingOwner | null;
  bootstrap?: OrganizationCommercialBootstrapState | null;
  phase_updated_at?: Date | string | null;
  completed_at?: Date | string | null;
}

export interface MarkOnboardingPhaseInput {
  organization_id: string;
  onboarding_phase: OnboardingPhase;
  system_id?: string;
  owner?: OrganizationOnboardingOwner | null;
  bootstrap?: OrganizationCommercialBootstrapState | null;
  at?: Date | string;
  completed?: boolean;
}
