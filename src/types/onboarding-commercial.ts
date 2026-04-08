import type { TenantType } from '@/lib/onboarding/tenantTypeUtils';
import type { Edition } from '@/types/edition';

export type CommercialOnboardingPhase =
  | 'commercial_bootstrap_started'
  | 'commercial_bootstrap_completed';

export type CommercialBootstrapStatus =
  | 'pending'
  | 'organization_linked'
  | 'owner_assigned'
  | 'completed';

export interface CommercialOwnerProfile {
  user_id: string;
  display_name: string;
  email: string;
  role: 'admin';
  assigned_at?: Date | string | null;
}

export interface CommercialCompanyDraft {
  organization_name: string;
  tenant_type: TenantType | string;
  edition?: Edition | null;
  industry?: string | null;
  plan_intent?: string | null;
}

export interface OrganizationCommercialBootstrapState {
  status: CommercialBootstrapStatus;
  phase: CommercialOnboardingPhase;
  organization_id: string;
  owner: CommercialOwnerProfile;
  company: CommercialCompanyDraft;
  initialized_at?: Date | string | null;
  completed_at?: Date | string | null;
}

export interface BootstrapOrganizationInput {
  actor_user_id: string;
  actor_email?: string | null;
  actor_organization_id?: string | null;
  organization_name: string;
  tenant_type: TenantType | string;
  edition?: Edition | null;
  owner_name: string;
  owner_email: string;
  industry?: string | null;
  plan_intent?: string | null;
}
