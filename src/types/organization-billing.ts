export type OrganizationPlanCode = 'none' | 'trial' | 'basic' | 'premium';

export type OrganizationSubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled';

export type OrganizationAccessState =
  | 'trial'
  | 'active'
  | 'grace_period'
  | 'blocked'
  | 'canceled';

export interface OrganizationTrialState {
  status: 'not_started' | 'active' | 'expired' | 'converted';
  startedAt: Date | null;
  endsAt: Date | null;
  grantedByUserId?: string | null;
  lastExtendedAt?: Date | null;
  notes?: string | null;
}

export interface OrganizationCommercialState {
  planCode: OrganizationPlanCode;
  subscriptionStatus: OrganizationSubscriptionStatus;
  accessState: OrganizationAccessState;
  accessEndsAt: Date | null;
  graceUntil: Date | null;
  lastPaymentError?: string | null;
  lockedReason?: string | null;
}

export interface OrganizationBillingEvent {
  id: string;
  organizationId: string;
  type:
    | 'checkout_started'
    | 'trial_started'
    | 'trial_extended'
    | 'subscription_activated'
    | 'subscription_past_due'
    | 'subscription_canceled'
    | 'legacy_imported';
  planCode: OrganizationPlanCode;
  subscriptionStatus: OrganizationSubscriptionStatus;
  accessState: OrganizationAccessState;
  provider?: 'mobbex' | 'manual' | 'legacy' | null;
  providerReference?: string | null;
  transactionId?: string | null;
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  source: 'organization' | 'legacy_user';
  payload?: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
}

export interface OrganizationBillingSnapshot {
  organizationId: string;
  planCode: OrganizationPlanCode;
  subscriptionStatus: OrganizationSubscriptionStatus;
  source: 'organization' | 'legacy_user' | 'none';
  ownerUserId: string | null;
  ownerEmail: string | null;
  trial: OrganizationTrialState | null;
  commercialState: OrganizationCommercialState;
  provider: 'mobbex' | 'manual' | 'legacy' | null;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  providerReference: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  pastDueAt: Date | null;
  activatedAt: Date | null;
  lastPaymentAt: Date | null;
  lastPaymentError: string | null;
  metadata: Record<string, unknown>;
  legacyUserId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface UpsertOrganizationTrialInput {
  planCode?: Extract<OrganizationPlanCode, 'trial' | 'basic' | 'premium'>;
  startedAt?: Date | string | null;
  endsAt: Date | string;
  grantedByUserId?: string | null;
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ActivateOrganizationSubscriptionInput {
  planCode: Extract<OrganizationPlanCode, 'basic' | 'premium'>;
  ownerUserId: string;
  ownerEmail: string;
  provider?: 'mobbex' | 'manual';
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  providerReference?: string | null;
  transactionId?: string | null;
  activatedAt?: Date | string | null;
  currentPeriodStart?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  metadata?: Record<string, unknown>;
}

export interface MarkOrganizationPastDueInput {
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  provider?: 'mobbex' | 'manual' | 'legacy';
  providerReference?: string | null;
  transactionId?: string | null;
  lastPaymentError?: string | null;
  graceUntil?: Date | string | null;
  occurredAt?: Date | string | null;
  metadata?: Record<string, unknown>;
}

export interface CancelOrganizationSubscriptionInput {
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  provider?: 'mobbex' | 'manual' | 'legacy';
  providerReference?: string | null;
  transactionId?: string | null;
  canceledAt?: Date | string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}
