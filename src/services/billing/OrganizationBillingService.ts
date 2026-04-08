import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  deriveOrganizationAccessState,
  toLegacyUserBillingFields,
} from '@/lib/billing/organizationBillingStatus';
import type {
  ActivateOrganizationSubscriptionInput,
  CancelOrganizationSubscriptionInput,
  MarkOrganizationPastDueInput,
  OrganizationBillingEvent,
  OrganizationBillingSnapshot,
  OrganizationCommercialState,
  OrganizationPlanCode,
  OrganizationSubscriptionStatus,
  OrganizationTrialState,
  UpsertOrganizationTrialInput,
} from '@/types/organization-billing';

type FirestoreDateLike = {
  toDate?: () => Date;
  _seconds?: number;
};

type RawOrganizationBillingDoc = {
  plan_code?: unknown;
  subscription_status?: unknown;
  owner_user_id?: unknown;
  owner_email?: unknown;
  provider?: unknown;
  provider_subscription_id?: unknown;
  provider_customer_id?: unknown;
  provider_reference?: unknown;
  current_period_start?: unknown;
  current_period_end?: unknown;
  canceled_at?: unknown;
  past_due_at?: unknown;
  activated_at?: unknown;
  last_payment_at?: unknown;
  last_payment_error?: unknown;
  trial?: unknown;
  metadata?: unknown;
  legacy_user_id?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

type RawUserBillingDoc = {
  planType?: unknown;
  billing_status?: unknown;
  expirationDate?: unknown;
  next_billing_date?: unknown;
  mobbex_subscription_id?: unknown;
  mobbex_transaction_id?: unknown;
  last_payment_error?: unknown;
  email?: unknown;
};

function assertOrganizationId(organizationId: string): string {
  const normalized = organizationId?.trim();
  if (!normalized) {
    throw new Error('organization_id is required');
  }
  return normalized;
}

function getOrgRef(organizationId: string) {
  const db = getAdminFirestore();
  return db.collection('organizations').doc(organizationId);
}

function getBillingDocRef(organizationId: string) {
  return getOrgRef(organizationId).collection('meta').doc('billing');
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null) {
    const maybe = value as FirestoreDateLike;
    if (typeof maybe.toDate === 'function') return maybe.toDate();
    if (typeof maybe._seconds === 'number') {
      return new Date(maybe._seconds * 1000);
    }
  }
  return null;
}

function normalizePlanCode(value: unknown): OrganizationPlanCode {
  switch (value) {
    case 'trial':
    case 'basic':
    case 'premium':
      return value;
    default:
      return 'none';
  }
}

function normalizeTrial(value: unknown): OrganizationTrialState | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const status =
    record.status === 'active' ||
    record.status === 'expired' ||
    record.status === 'converted'
      ? record.status
      : 'not_started';

  if (
    status === 'not_started' &&
    !record.started_at &&
    !record.starts_at &&
    !record.ends_at
  ) {
    return null;
  }

  return {
    status,
    startedAt: toDate(record.started_at ?? record.starts_at),
    endsAt: toDate(record.ends_at),
    grantedByUserId:
      typeof record.granted_by_user_id === 'string'
        ? record.granted_by_user_id
        : null,
    lastExtendedAt: toDate(record.last_extended_at),
    notes: typeof record.notes === 'string' ? record.notes : null,
  };
}

function normalizeSubscriptionStatus(
  value: unknown,
  planCode: OrganizationPlanCode,
  trial: OrganizationTrialState | null
): OrganizationSubscriptionStatus {
  switch (value) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'canceled':
      return value;
    case 'inactive':
      return value;
    default:
      if (trial?.status === 'active') return 'trialing';
      if (planCode === 'basic' || planCode === 'premium') return 'active';
      return 'inactive';
  }
}

function normalizeSnapshot(
  organizationId: string,
  data: RawOrganizationBillingDoc | null | undefined,
  source: 'organization' | 'legacy_user' | 'none'
): OrganizationBillingSnapshot {
  const trial = normalizeTrial(data?.trial);
  const planCode = normalizePlanCode(data?.plan_code);
  const subscriptionStatus = normalizeSubscriptionStatus(
    data?.subscription_status,
    planCode,
    trial
  );

  const snapshot: OrganizationBillingSnapshot = {
    organizationId,
    planCode,
    subscriptionStatus,
    source,
    ownerUserId:
      typeof data?.owner_user_id === 'string' ? data.owner_user_id : null,
    ownerEmail: typeof data?.owner_email === 'string' ? data.owner_email : null,
    trial,
    commercialState: {} as OrganizationCommercialState,
    provider:
      data?.provider === 'mobbex' || data?.provider === 'manual'
        ? data.provider
        : source === 'legacy_user'
          ? 'legacy'
          : null,
    providerSubscriptionId:
      typeof data?.provider_subscription_id === 'string'
        ? data.provider_subscription_id
        : null,
    providerCustomerId:
      typeof data?.provider_customer_id === 'string'
        ? data.provider_customer_id
        : null,
    providerReference:
      typeof data?.provider_reference === 'string'
        ? data.provider_reference
        : null,
    currentPeriodStart: toDate(data?.current_period_start),
    currentPeriodEnd: toDate(data?.current_period_end),
    canceledAt: toDate(data?.canceled_at),
    pastDueAt: toDate(data?.past_due_at),
    activatedAt: toDate(data?.activated_at),
    lastPaymentAt: toDate(data?.last_payment_at),
    lastPaymentError:
      typeof data?.last_payment_error === 'string'
        ? data.last_payment_error
        : null,
    metadata:
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {},
    legacyUserId:
      typeof data?.legacy_user_id === 'string' ? data.legacy_user_id : null,
    createdAt: toDate(data?.created_at),
    updatedAt: toDate(data?.updated_at),
  };

  snapshot.commercialState = deriveOrganizationAccessState(snapshot);
  return snapshot;
}

function makeEvent(
  snapshot: OrganizationBillingSnapshot,
  input: {
    type: OrganizationBillingEvent['type'];
    planCode?: OrganizationBillingEvent['planCode'];
    provider?: OrganizationBillingEvent['provider'];
    providerReference?: string | null;
    transactionId?: string | null;
    payload?: Record<string, unknown>;
  }
): OrganizationBillingEvent {
  const now = new Date();
  return {
    id: '',
    organizationId: snapshot.organizationId,
    type: input.type,
    planCode: input.planCode ?? snapshot.planCode,
    subscriptionStatus: snapshot.subscriptionStatus,
    accessState: snapshot.commercialState.accessState,
    provider: input.provider ?? snapshot.provider,
    providerReference: input.providerReference ?? snapshot.providerReference,
    transactionId: input.transactionId ?? null,
    ownerUserId: snapshot.ownerUserId,
    ownerEmail: snapshot.ownerEmail,
    source: snapshot.source === 'none' ? 'organization' : snapshot.source,
    payload: input.payload,
    occurredAt: now,
    createdAt: now,
  };
}

async function findLegacyBillingUser(
  organizationId: string
): Promise<{ id: string; data: RawUserBillingDoc } | null> {
  const snapshot = await getAdminFirestore()
    .collection('users')
    .where('organization_id', '==', organizationId)
    .limit(25)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data() as RawUserBillingDoc;
    const hasBillingData =
      typeof data.planType === 'string' ||
      typeof data.billing_status === 'string' ||
      !!data.expirationDate ||
      !!data.next_billing_date;

    if (hasBillingData) {
      return { id: doc.id, data };
    }
  }

  return null;
}

function snapshotFromLegacyUser(
  organizationId: string,
  legacyUser: { id: string; data: RawUserBillingDoc }
): OrganizationBillingSnapshot {
  const expirationDate = toDate(legacyUser.data.expirationDate);
  const nextBillingDate = toDate(legacyUser.data.next_billing_date);
  const planCode = normalizePlanCode(legacyUser.data.planType);
  const trial: OrganizationTrialState | null =
    planCode === 'trial'
      ? {
          status:
            expirationDate && expirationDate.getTime() >= Date.now()
              ? 'active'
              : 'expired',
          startedAt: null,
          endsAt: expirationDate,
          grantedByUserId: legacyUser.id,
          lastExtendedAt: null,
          notes: 'legacy users collection fallback',
        }
      : null;

  return normalizeSnapshot(
    organizationId,
    {
      plan_code: planCode,
      subscription_status:
        legacyUser.data.billing_status === 'active'
          ? 'active'
          : legacyUser.data.billing_status === 'past_due'
            ? 'past_due'
            : legacyUser.data.billing_status === 'canceled'
              ? 'canceled'
              : trial?.status === 'active'
                ? 'trialing'
                : 'inactive',
      owner_user_id: legacyUser.id,
      owner_email: legacyUser.data.email,
      provider: 'legacy',
      provider_subscription_id:
        typeof legacyUser.data.mobbex_subscription_id === 'string'
          ? legacyUser.data.mobbex_subscription_id
          : null,
      provider_reference:
        typeof legacyUser.data.mobbex_transaction_id === 'string'
          ? legacyUser.data.mobbex_transaction_id
          : null,
      current_period_end: nextBillingDate ?? expirationDate,
      last_payment_error:
        typeof legacyUser.data.last_payment_error === 'string'
          ? legacyUser.data.last_payment_error
          : null,
      trial: trial
        ? {
            status: trial.status,
            ends_at: trial.endsAt,
            granted_by_user_id: legacyUser.id,
            notes: trial.notes,
          }
        : null,
      legacy_user_id: legacyUser.id,
    },
    'legacy_user'
  );
}

async function syncLegacyUserProjection(
  snapshot: OrganizationBillingSnapshot,
  explicitUserId?: string | null
): Promise<void> {
  const userId = explicitUserId ?? snapshot.ownerUserId ?? snapshot.legacyUserId;
  if (!userId) return;

  const legacyFields = toLegacyUserBillingFields(snapshot);
  const transactionId =
    typeof snapshot.metadata.transactionId === 'string'
      ? snapshot.metadata.transactionId
      : null;

  await getAdminFirestore()
    .collection('users')
    .doc(userId)
    .set(
      {
        planType: legacyFields.planType,
        billing_status: legacyFields.billing_status,
        expirationDate: legacyFields.expirationDate,
        next_billing_date: legacyFields.next_billing_date,
        activo: legacyFields.activo,
        status: legacyFields.status,
        mobbex_subscription_id: snapshot.providerSubscriptionId,
        mobbex_transaction_id: transactionId,
        last_payment_error: snapshot.lastPaymentError,
        updated_at: new Date(),
      },
      { merge: true }
    );
}

async function writeBillingState(
  snapshot: OrganizationBillingSnapshot,
  event: OrganizationBillingEvent
): Promise<void> {
  const now = new Date();
  const orgRef = getOrgRef(snapshot.organizationId);
  const billingRef = getBillingDocRef(snapshot.organizationId);
  const eventRef = orgRef.collection('billing_events').doc();

  await orgRef.set(
    {
      billing_plan_code: snapshot.planCode,
      billing_subscription_status: snapshot.subscriptionStatus,
      billing_access_state: snapshot.commercialState.accessState,
      billing_access_ends_at: snapshot.commercialState.accessEndsAt,
      billing_owner_user_id: snapshot.ownerUserId,
      billing_updated_at: now,
      updated_at: now,
    },
    { merge: true }
  );

  await billingRef.set(
    {
      plan_code: snapshot.planCode,
      subscription_status: snapshot.subscriptionStatus,
      owner_user_id: snapshot.ownerUserId,
      owner_email: snapshot.ownerEmail,
      provider: snapshot.provider,
      provider_subscription_id: snapshot.providerSubscriptionId,
      provider_customer_id: snapshot.providerCustomerId,
      provider_reference: snapshot.providerReference,
      current_period_start: snapshot.currentPeriodStart,
      current_period_end: snapshot.currentPeriodEnd,
      canceled_at: snapshot.canceledAt,
      past_due_at: snapshot.pastDueAt,
      activated_at: snapshot.activatedAt,
      last_payment_at: snapshot.lastPaymentAt,
      last_payment_error: snapshot.lastPaymentError,
      trial: snapshot.trial
        ? {
            status: snapshot.trial.status,
            started_at: snapshot.trial.startedAt,
            ends_at: snapshot.trial.endsAt,
            granted_by_user_id: snapshot.trial.grantedByUserId ?? null,
            last_extended_at: snapshot.trial.lastExtendedAt ?? null,
            notes: snapshot.trial.notes ?? null,
          }
        : null,
      metadata: snapshot.metadata,
      legacy_user_id: snapshot.legacyUserId,
      created_at: snapshot.createdAt ?? now,
      updated_at: now,
    },
    { merge: true }
  );

  await eventRef.set({
    ...event,
    id: eventRef.id,
  });
}

export class OrganizationBillingService {
  static deriveAccessState(
    snapshot: OrganizationBillingSnapshot
  ): OrganizationCommercialState {
    return deriveOrganizationAccessState(snapshot);
  }

  static async getSnapshot(
    organizationId: string
  ): Promise<OrganizationBillingSnapshot> {
    const orgId = assertOrganizationId(organizationId);
    const billingDoc = await getBillingDocRef(orgId).get();

    if (billingDoc.exists) {
      return normalizeSnapshot(
        orgId,
        billingDoc.data() as RawOrganizationBillingDoc,
        'organization'
      );
    }

    const legacyUser = await findLegacyBillingUser(orgId);
    if (legacyUser) {
      return snapshotFromLegacyUser(orgId, legacyUser);
    }

    return normalizeSnapshot(orgId, null, 'none');
  }

  static async upsertTrial(
    organizationId: string,
    input: UpsertOrganizationTrialInput
  ): Promise<OrganizationBillingSnapshot> {
    const current = await this.getSnapshot(organizationId);
    const now = new Date();
    const startedAt = toDate(input.startedAt) ?? current.trial?.startedAt ?? now;
    const endsAt = toDate(input.endsAt) ?? now;
    const nextSnapshot: OrganizationBillingSnapshot = {
      ...current,
      planCode: input.planCode ?? 'trial',
      subscriptionStatus: 'trialing',
      source: 'organization',
      ownerUserId: input.ownerUserId ?? current.ownerUserId,
      ownerEmail: input.ownerEmail ?? current.ownerEmail,
      trial: {
        status: endsAt.getTime() >= now.getTime() ? 'active' : 'expired',
        startedAt,
        endsAt,
        grantedByUserId: input.grantedByUserId ?? current.trial?.grantedByUserId,
        lastExtendedAt: current.trial ? now : null,
        notes: input.notes ?? current.trial?.notes ?? null,
      },
      currentPeriodStart: null,
      currentPeriodEnd: null,
      canceledAt: null,
      pastDueAt: null,
      lastPaymentError: null,
      metadata: { ...current.metadata, ...(input.metadata ?? {}) },
      legacyUserId: current.legacyUserId ?? input.ownerUserId ?? null,
      createdAt: current.createdAt ?? now,
      updatedAt: now,
    };
    nextSnapshot.commercialState = deriveOrganizationAccessState(nextSnapshot);

    await writeBillingState(
      nextSnapshot,
      makeEvent(nextSnapshot, {
        type: current.trial ? 'trial_extended' : 'trial_started',
        provider: 'manual',
        payload: input.metadata,
      })
    );
    await syncLegacyUserProjection(nextSnapshot, input.ownerUserId);
    return nextSnapshot;
  }

  static async activateSubscription(
    organizationId: string,
    input: ActivateOrganizationSubscriptionInput
  ): Promise<OrganizationBillingSnapshot> {
    const current = await this.getSnapshot(organizationId);
    const now = new Date();
    const activatedAt = toDate(input.activatedAt) ?? now;
    const nextSnapshot: OrganizationBillingSnapshot = {
      ...current,
      planCode: input.planCode,
      subscriptionStatus: 'active',
      source: 'organization',
      ownerUserId: input.ownerUserId,
      ownerEmail: input.ownerEmail,
      trial: current.trial
        ? { ...current.trial, status: 'converted' }
        : current.trial,
      provider: input.provider ?? 'mobbex',
      providerSubscriptionId: input.providerSubscriptionId ?? null,
      providerCustomerId: input.providerCustomerId ?? null,
      providerReference: input.providerReference ?? null,
      currentPeriodStart: toDate(input.currentPeriodStart) ?? activatedAt,
      currentPeriodEnd: toDate(input.currentPeriodEnd),
      canceledAt: null,
      pastDueAt: null,
      activatedAt,
      lastPaymentAt: activatedAt,
      lastPaymentError: null,
      metadata: {
        ...current.metadata,
        ...(input.metadata ?? {}),
        transactionId: input.transactionId ?? null,
      },
      legacyUserId: current.legacyUserId ?? input.ownerUserId,
      createdAt: current.createdAt ?? now,
      updatedAt: now,
    };
    nextSnapshot.commercialState = deriveOrganizationAccessState(nextSnapshot);

    await writeBillingState(
      nextSnapshot,
      makeEvent(nextSnapshot, {
        type: 'subscription_activated',
        provider: nextSnapshot.provider,
        providerReference: nextSnapshot.providerReference,
        transactionId: input.transactionId,
        payload: input.metadata,
      })
    );
    await syncLegacyUserProjection(nextSnapshot, input.ownerUserId);
    return nextSnapshot;
  }

  static async markPastDue(
    organizationId: string,
    input: MarkOrganizationPastDueInput
  ): Promise<OrganizationBillingSnapshot> {
    const current = await this.getSnapshot(organizationId);
    const now = toDate(input.occurredAt) ?? new Date();
    const nextSnapshot: OrganizationBillingSnapshot = {
      ...current,
      subscriptionStatus:
        current.subscriptionStatus === 'inactive' ? 'inactive' : 'past_due',
      source: 'organization',
      ownerUserId: input.ownerUserId ?? current.ownerUserId,
      ownerEmail: input.ownerEmail ?? current.ownerEmail,
      provider: input.provider ?? current.provider ?? 'mobbex',
      providerReference: input.providerReference ?? current.providerReference,
      pastDueAt: now,
      currentPeriodEnd:
        toDate(input.graceUntil) ??
        current.currentPeriodEnd ??
        current.trial?.endsAt ??
        null,
      lastPaymentError: input.lastPaymentError ?? current.lastPaymentError,
      metadata: {
        ...current.metadata,
        ...(input.metadata ?? {}),
        transactionId: input.transactionId ?? null,
      },
      updatedAt: now,
    };
    nextSnapshot.commercialState = deriveOrganizationAccessState(nextSnapshot);

    await writeBillingState(
      nextSnapshot,
      makeEvent(nextSnapshot, {
        type: 'subscription_past_due',
        provider: nextSnapshot.provider,
        providerReference: nextSnapshot.providerReference,
        transactionId: input.transactionId,
        payload: input.metadata,
      })
    );
    await syncLegacyUserProjection(nextSnapshot, input.ownerUserId);
    return nextSnapshot;
  }

  static async cancelSubscription(
    organizationId: string,
    input: CancelOrganizationSubscriptionInput
  ): Promise<OrganizationBillingSnapshot> {
    const current = await this.getSnapshot(organizationId);
    const canceledAt = toDate(input.canceledAt) ?? new Date();
    const nextSnapshot: OrganizationBillingSnapshot = {
      ...current,
      subscriptionStatus: 'canceled',
      source: 'organization',
      ownerUserId: input.ownerUserId ?? current.ownerUserId,
      ownerEmail: input.ownerEmail ?? current.ownerEmail,
      provider: input.provider ?? current.provider ?? 'mobbex',
      providerReference: input.providerReference ?? current.providerReference,
      canceledAt,
      lastPaymentError: input.reason ?? current.lastPaymentError,
      metadata: { ...current.metadata, ...(input.metadata ?? {}) },
      updatedAt: canceledAt,
    };
    nextSnapshot.commercialState = deriveOrganizationAccessState(nextSnapshot);

    await writeBillingState(
      nextSnapshot,
      makeEvent(nextSnapshot, {
        type: 'subscription_canceled',
        provider: nextSnapshot.provider,
        providerReference: nextSnapshot.providerReference,
        transactionId: input.transactionId,
        payload: {
          reason: input.reason ?? null,
          ...(input.metadata ?? {}),
        },
      })
    );
    await syncLegacyUserProjection(nextSnapshot, input.ownerUserId);
    return nextSnapshot;
  }

  static async recordCheckoutStarted(
    organizationId: string,
    input: {
      planCode: Extract<OrganizationPlanCode, 'basic' | 'premium'>;
      ownerUserId: string;
      ownerEmail: string;
      provider?: 'mobbex' | 'manual';
      providerReference?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<OrganizationBillingSnapshot> {
    const current = await this.getSnapshot(organizationId);
    const now = new Date();
    const nextSnapshot: OrganizationBillingSnapshot = {
      ...current,
      source: 'organization',
      ownerUserId: input.ownerUserId,
      ownerEmail: input.ownerEmail,
      provider: input.provider ?? current.provider ?? 'mobbex',
      providerReference: input.providerReference ?? current.providerReference,
      metadata: {
        ...current.metadata,
        pendingCheckout: {
          planCode: input.planCode,
          provider: input.provider ?? current.provider ?? 'mobbex',
          providerReference:
            input.providerReference ?? current.providerReference ?? null,
          startedAt: now.toISOString(),
          ...(input.metadata ?? {}),
        },
      },
      createdAt: current.createdAt ?? now,
      updatedAt: now,
    };
    nextSnapshot.commercialState = deriveOrganizationAccessState(nextSnapshot);

    await writeBillingState(
      nextSnapshot,
      makeEvent(nextSnapshot, {
        type: 'checkout_started',
        planCode: input.planCode,
        provider: nextSnapshot.provider,
        providerReference: input.providerReference ?? null,
        payload: input.metadata,
      })
    );
    await syncLegacyUserProjection(nextSnapshot, input.ownerUserId);
    return nextSnapshot;
  }
}

export async function getOrganizationBillingSnapshot(organizationId: string) {
  return OrganizationBillingService.getSnapshot(organizationId);
}

export async function upsertOrganizationTrial(
  organizationId: string,
  input: UpsertOrganizationTrialInput
) {
  return OrganizationBillingService.upsertTrial(organizationId, input);
}

export async function activateOrganizationSubscription(
  organizationId: string,
  input: ActivateOrganizationSubscriptionInput
) {
  return OrganizationBillingService.activateSubscription(organizationId, input);
}

export async function markOrganizationPastDue(
  organizationId: string,
  input: MarkOrganizationPastDueInput
) {
  return OrganizationBillingService.markPastDue(organizationId, input);
}

export async function cancelOrganizationSubscription(
  organizationId: string,
  input: CancelOrganizationSubscriptionInput
) {
  return OrganizationBillingService.cancelSubscription(organizationId, input);
}

export async function recordOrganizationCheckoutStarted(
  organizationId: string,
  input: {
    planCode: Extract<OrganizationPlanCode, 'basic' | 'premium'>;
    ownerUserId: string;
    ownerEmail: string;
    provider?: 'mobbex' | 'manual';
    providerReference?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  return OrganizationBillingService.recordCheckoutStarted(organizationId, input);
}
