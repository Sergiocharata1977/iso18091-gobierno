import type {
  OrganizationAccessState,
  OrganizationBillingSnapshot,
  OrganizationCommercialState,
} from '@/types/organization-billing';
import type { PlanType, UserStatus } from '@/types/auth';

export type LegacyUserBillingFields = {
  planType: PlanType;
  billing_status: 'active' | 'past_due' | 'canceled' | null;
  expirationDate: Date | null;
  next_billing_date: Date | null;
  status: UserStatus;
  activo: boolean;
};

export function deriveOrganizationAccessState(
  snapshot: Pick<
    OrganizationBillingSnapshot,
    | 'planCode'
    | 'subscriptionStatus'
    | 'trial'
    | 'currentPeriodEnd'
    | 'canceledAt'
    | 'lastPaymentError'
  >,
  now: Date = new Date()
): OrganizationCommercialState {
  const currentPeriodEnd = snapshot.currentPeriodEnd;
  const trialEndsAt = snapshot.trial?.endsAt ?? null;
  const isTrialActive =
    snapshot.subscriptionStatus === 'trialing' &&
    !!trialEndsAt &&
    trialEndsAt.getTime() >= now.getTime();

  if (isTrialActive) {
    return {
      planCode: snapshot.planCode,
      subscriptionStatus: snapshot.subscriptionStatus,
      accessState: 'trial',
      accessEndsAt: trialEndsAt,
      graceUntil: null,
      lastPaymentError: null,
      lockedReason: null,
    };
  }

  if (snapshot.subscriptionStatus === 'active') {
    return {
      planCode: snapshot.planCode,
      subscriptionStatus: snapshot.subscriptionStatus,
      accessState: 'active',
      accessEndsAt: currentPeriodEnd,
      graceUntil: null,
      lastPaymentError: null,
      lockedReason: null,
    };
  }

  if (snapshot.subscriptionStatus === 'past_due') {
    const graceUntil = currentPeriodEnd ?? trialEndsAt ?? null;
    const stillInGrace =
      !!graceUntil && graceUntil.getTime() >= now.getTime();

    return {
      planCode: snapshot.planCode,
      subscriptionStatus: snapshot.subscriptionStatus,
      accessState: stillInGrace ? 'grace_period' : 'blocked',
      accessEndsAt: graceUntil,
      graceUntil,
      lastPaymentError: snapshot.lastPaymentError,
      lockedReason: stillInGrace ? null : 'payment_required',
    };
  }

  if (snapshot.subscriptionStatus === 'canceled') {
    const accessUntil = currentPeriodEnd ?? snapshot.canceledAt ?? null;
    const hasAccess =
      !!accessUntil && accessUntil.getTime() >= now.getTime();

    return {
      planCode: snapshot.planCode,
      subscriptionStatus: snapshot.subscriptionStatus,
      accessState: hasAccess ? 'canceled' : 'blocked',
      accessEndsAt: accessUntil,
      graceUntil: null,
      lastPaymentError: snapshot.lastPaymentError,
      lockedReason: hasAccess ? null : 'subscription_canceled',
    };
  }

  return {
    planCode: snapshot.planCode,
    subscriptionStatus: snapshot.subscriptionStatus,
    accessState: 'blocked',
    accessEndsAt: trialEndsAt,
    graceUntil: null,
    lastPaymentError: snapshot.lastPaymentError,
    lockedReason: 'no_active_billing',
  };
}

export function toLegacyUserBillingFields(
  snapshot: OrganizationBillingSnapshot
): LegacyUserBillingFields {
  const accessState = snapshot.commercialState.accessState;
  const expirationDate =
    snapshot.commercialState.accessEndsAt ??
    snapshot.currentPeriodEnd ??
    snapshot.trial?.endsAt ??
    null;

  let billingStatus: LegacyUserBillingFields['billing_status'] = null;
  if (snapshot.subscriptionStatus === 'active') billingStatus = 'active';
  if (snapshot.subscriptionStatus === 'past_due') billingStatus = 'past_due';
  if (snapshot.subscriptionStatus === 'canceled') billingStatus = 'canceled';

  const status: UserStatus =
    accessState === 'blocked' ? 'expired' : 'active';

  return {
    planType: snapshot.planCode as PlanType,
    billing_status: billingStatus,
    expirationDate,
    next_billing_date: snapshot.currentPeriodEnd,
    status,
    activo: accessState !== 'blocked',
  };
}

export function hasOrganizationBillingAccess(
  accessState: OrganizationAccessState
): boolean {
  return accessState !== 'blocked';
}
