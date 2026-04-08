import { hasOrganizationBillingAccess } from '@/lib/billing/organizationBillingStatus';
import type { OrganizationAccessState } from '@/types/organization-billing';

export const BOOTSTRAP_ROUTE = '/onboarding/empresa';
export const ONBOARDING_ROUTE = '/onboarding';
export const HOME_ROUTE = '/noticias';
export const SUBSCRIPTION_ROUTE = '/organization/billing';
export const BILLING_REQUIRED_ROUTE = '/billing-required';
export const SUPER_ADMIN_ROUTE = '/super-admin';
export const PENDING_ROUTE = '/pending';

type AccessUserLike = {
  id?: string | null;
  uid?: string | null;
  rol?: string | null;
  organization_id?: string | null;
  status?: string | null;
  activo?: boolean | null;
  first_login?: boolean | null;
  is_first_login?: boolean | null;
  onboarding_phase?: string | null;
  onboarding_bootstrap_status?: string | null;
  onboarding_owner_user_id?: string | null;
  billing_status?: 'active' | 'past_due' | 'canceled' | null;
  expirationDate?: Date | string | null;
  onboardingState?: {
    onboarding_phase?: string | null;
    onboarding_owner_user_id?: string | null;
    bootstrap?: {
      status?: string | null;
    } | null;
  } | null;
  commercialState?: {
    accessState?: OrganizationAccessState | null;
  } | null;
};

export type OnboardingAccessReason =
  | 'anonymous'
  | 'super_admin'
  | 'bootstrap_required'
  | 'organization_pending'
  | 'onboarding_required'
  | 'billing_required'
  | 'home';

export type OnboardingAccessDecision = {
  route: string;
  reason: OnboardingAccessReason;
};

const INCOMPLETE_ONBOARDING_PHASES = new Set([
  'started',
  'commercial_bootstrap_started',
  'commercial_bootstrap_completed',
  'systems_selected',
  'provisioning',
  'provisioned',
  'pending_assignment',
  'strategy_pending',
  'strategy_in_progress',
  'strategy_complete',
  'draft_generation_running',
  'drafts_generated',
]);

const COMPLETED_ONBOARDING_PHASES = new Set([
  'completed',
  'onboarding_completed',
]);

function normalizeText(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function parseDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveOnboardingPhase(user?: AccessUserLike | null): string {
  return normalizeText(
    user?.onboarding_phase ?? user?.onboardingState?.onboarding_phase
  );
}

function resolveBootstrapStatus(user?: AccessUserLike | null): string {
  return normalizeText(
    user?.onboarding_bootstrap_status ??
      user?.onboardingState?.bootstrap?.status
  );
}

function hasBillingAccess(
  user?: AccessUserLike | null,
  now: Date = new Date()
): boolean {
  const accessState = user?.commercialState?.accessState;
  if (accessState) {
    return hasOrganizationBillingAccess(accessState);
  }

  if (user?.billing_status === 'active' || user?.billing_status === 'past_due') {
    return true;
  }

  if (normalizeText(user?.status) === 'expired') {
    return false;
  }

  if (user?.billing_status === 'canceled') {
    const expirationDate = parseDate(user.expirationDate);
    return !!expirationDate && expirationDate.getTime() >= now.getTime();
  }

  return true;
}

export function resolveOnboardingAccess(
  user?: AccessUserLike | null,
  options?: { now?: Date }
): OnboardingAccessDecision {
  if (!user) {
    return { route: HOME_ROUTE, reason: 'anonymous' };
  }

  if (normalizeText(user.rol) === 'super_admin') {
    return { route: SUPER_ADMIN_ROUTE, reason: 'super_admin' };
  }

  if (!user.organization_id) {
    return { route: BOOTSTRAP_ROUTE, reason: 'bootstrap_required' };
  }

  const onboardingPhase = resolveOnboardingPhase(user);
  const bootstrapStatus = resolveBootstrapStatus(user);
  const isFirstLogin =
    user.first_login === true || user.is_first_login === true;

  if (
    normalizeText(user.status) === 'pending_approval' &&
    !onboardingPhase &&
    !bootstrapStatus
  ) {
    return { route: PENDING_ROUTE, reason: 'organization_pending' };
  }

  if (
    isFirstLogin ||
    onboardingPhase === 'not_started' ||
    INCOMPLETE_ONBOARDING_PHASES.has(onboardingPhase) ||
    bootstrapStatus === 'pending' ||
    bootstrapStatus === 'organization_linked' ||
    bootstrapStatus === 'owner_assigned'
  ) {
    return { route: ONBOARDING_ROUTE, reason: 'onboarding_required' };
  }

  if (
    COMPLETED_ONBOARDING_PHASES.has(onboardingPhase) &&
    !hasBillingAccess(user, options?.now)
  ) {
    return { route: BILLING_REQUIRED_ROUTE, reason: 'billing_required' };
  }

  if (!onboardingPhase && !hasBillingAccess(user, options?.now)) {
    return { route: BILLING_REQUIRED_ROUTE, reason: 'billing_required' };
  }

  return { route: HOME_ROUTE, reason: 'home' };
}
