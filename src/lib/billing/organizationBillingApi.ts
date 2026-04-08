import type { AuthContext } from '@/lib/api/withAuth';
import {
  MOBBEX_PLANS,
  normalizeMobbexPlanCode,
} from '@/lib/billing/mobbexPlans';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  recordOrganizationCheckoutStarted,
  getOrganizationBillingSnapshot,
} from '@/services/billing/OrganizationBillingService';
import { mobbexService } from '@/services/billing/MobbexService';

function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serializeSnapshot(
  snapshot: Awaited<ReturnType<typeof getOrganizationBillingSnapshot>>
) {
  return {
    organizationId: snapshot.organizationId,
    planCode: snapshot.planCode,
    subscriptionStatus: snapshot.subscriptionStatus,
    source: snapshot.source,
    ownerUserId: snapshot.ownerUserId,
    ownerEmail: snapshot.ownerEmail,
    trial: snapshot.trial
      ? {
          ...snapshot.trial,
          startedAt: toIsoDate(snapshot.trial.startedAt),
          endsAt: toIsoDate(snapshot.trial.endsAt),
          lastExtendedAt: toIsoDate(snapshot.trial.lastExtendedAt ?? null),
        }
      : null,
    commercialState: {
      ...snapshot.commercialState,
      accessEndsAt: toIsoDate(snapshot.commercialState.accessEndsAt),
      graceUntil: toIsoDate(snapshot.commercialState.graceUntil),
    },
    provider: snapshot.provider,
    providerSubscriptionId: snapshot.providerSubscriptionId,
    providerCustomerId: snapshot.providerCustomerId,
    providerReference: snapshot.providerReference,
    currentPeriodStart: toIsoDate(snapshot.currentPeriodStart),
    currentPeriodEnd: toIsoDate(snapshot.currentPeriodEnd),
    canceledAt: toIsoDate(snapshot.canceledAt),
    pastDueAt: toIsoDate(snapshot.pastDueAt),
    activatedAt: toIsoDate(snapshot.activatedAt),
    lastPaymentAt: toIsoDate(snapshot.lastPaymentAt),
    lastPaymentError: snapshot.lastPaymentError,
    metadata: snapshot.metadata,
    legacyUserId: snapshot.legacyUserId,
    createdAt: toIsoDate(snapshot.createdAt),
    updatedAt: toIsoDate(snapshot.updatedAt),
  };
}

async function getOrganizationName(organizationId: string): Promise<string | null> {
  const orgDoc = await getAdminFirestore()
    .collection('organizations')
    .doc(organizationId)
    .get();

  if (!orgDoc.exists) {
    return null;
  }

  const data = orgDoc.data();
  const nameCandidates = [
    data?.name,
    data?.organization_name,
    data?.company_name,
    data?.razon_social,
  ];
  const name = nameCandidates.find(value => typeof value === 'string' && value.trim());
  return typeof name === 'string' ? name : null;
}

export async function getOrganizationBillingSummaryResponse(
  organizationId: string
) {
  const [snapshot, organizationName] = await Promise.all([
    getOrganizationBillingSnapshot(organizationId),
    getOrganizationName(organizationId),
  ]);

  return {
    organization: {
      id: organizationId,
      name: organizationName ?? organizationId,
    },
    snapshot: serializeSnapshot(snapshot),
  };
}

export async function createOrganizationCheckout(
  auth: AuthContext,
  input: { planCode?: string; planId?: string; userName?: string }
) {
  const requestedPlan = input.planCode || input.planId;
  if (!requestedPlan) {
    throw new Error('Missing required field: planCode');
  }

  const resolvedPlanCode = normalizeMobbexPlanCode(requestedPlan);
  if (!resolvedPlanCode) {
    throw new Error(
      `Invalid planCode. Valid options: ${Object.keys(MOBBEX_PLANS).join(', ')}`
    );
  }

  const ownerUserId = auth.uid;
  const ownerEmail = auth.email;
  const organizationId = auth.organizationId || auth.user?.organization_id;

  if (!ownerEmail) {
    throw new Error('Missing authenticated user email');
  }
  if (!organizationId) {
    throw new Error('Missing authenticated organization_id');
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reference = `orgsub_${organizationId}_${Date.now()}`;
  const returnUrl = `${baseUrl}/billing/success`;
  const webhookUrl = `${baseUrl}/api/billing/mobbex/webhook`;

  const checkout = await mobbexService.createSubscriptionCheckout({
    organizationId,
    ownerUserId,
    ownerEmail,
    userName: input.userName || ownerEmail.split('@')[0],
    planCode: resolvedPlanCode,
    reference,
    returnUrl,
    webhookUrl,
  });

  if (!checkout.result) {
    throw new Error('Failed to create Mobbex checkout');
  }

  await recordOrganizationCheckoutStarted(organizationId, {
    planCode: resolvedPlanCode,
    ownerUserId,
    ownerEmail,
    provider: 'mobbex',
    providerReference: reference,
    metadata: {
      checkoutId: checkout.data.id,
      checkoutUrl: checkout.data.url,
      planCode: resolvedPlanCode,
    },
  });

  return {
    success: true,
    checkoutUrl: checkout.data.url,
    checkoutId: checkout.data.id,
    organizationId,
    reference,
    plan: MOBBEX_PLANS[resolvedPlanCode],
  };
}
