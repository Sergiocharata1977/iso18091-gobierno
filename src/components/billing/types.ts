export interface BillingSummaryPlan {
  code: 'basic' | 'premium';
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface BillingSummaryTrial {
  status: 'not_started' | 'active' | 'expired' | 'converted';
  startedAt: string | null;
  endsAt: string | null;
  grantedByUserId?: string | null;
  lastExtendedAt?: string | null;
  notes?: string | null;
}

export interface BillingSummaryCommercialState {
  planCode: 'none' | 'trial' | 'basic' | 'premium';
  subscriptionStatus: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled';
  accessState: 'trial' | 'active' | 'grace_period' | 'blocked' | 'canceled';
  accessEndsAt: string | null;
  graceUntil: string | null;
  lastPaymentError?: string | null;
  lockedReason?: string | null;
}

export interface BillingSummarySnapshot {
  organizationId: string;
  planCode: 'none' | 'trial' | 'basic' | 'premium';
  subscriptionStatus: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled';
  source: 'organization' | 'legacy_user' | 'none';
  ownerUserId: string | null;
  ownerEmail: string | null;
  trial: BillingSummaryTrial | null;
  commercialState: BillingSummaryCommercialState;
  provider: 'mobbex' | 'manual' | 'legacy' | null;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  providerReference: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  pastDueAt: string | null;
  activatedAt: string | null;
  lastPaymentAt: string | null;
  lastPaymentError: string | null;
  metadata: Record<string, unknown>;
  legacyUserId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BillingSummaryResponse {
  success: true;
  organization: {
    id: string;
    name: string;
  };
  snapshot: BillingSummarySnapshot;
  viewer: {
    role: string;
    userId: string;
    canManage: boolean;
  };
  availablePlans: BillingSummaryPlan[];
}
