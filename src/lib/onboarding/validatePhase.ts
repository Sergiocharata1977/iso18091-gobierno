import 'server-only';

import { AuditLogService } from '@/services/audit/AuditLogService';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import type { OnboardingPhase } from '@/types/onboarding';
import {
  normalizeTenantType,
  shouldAutoInstallCrmForTenantType,
} from '@/lib/onboarding/tenantTypeUtils';

// Re-export so existing server-side callers don't break
export type { TenantType } from '@/lib/onboarding/tenantTypeUtils';
export {
  normalizeTenantType,
  shouldAutoInstallCrmForTenantType,
} from '@/lib/onboarding/tenantTypeUtils';

const COMMERCIAL_BOOTSTRAP_PHASES: readonly OnboardingPhase[] = [
  'commercial_bootstrap_started',
  'commercial_bootstrap_completed',
] as const;

type TransitionActor = {
  userId: string;
  userEmail?: string;
  userRole?: string;
};

type TransitionInput = {
  orgId: string;
  nextPhase: OnboardingPhase;
  adminDb: FirebaseFirestore.Firestore;
  actor?: TransitionActor;
  details?: Record<string, unknown>;
};

type OrganizationRecord = Record<string, unknown> | undefined;

type EnsureTenantSetupInput = {
  orgId: string;
  adminDb: FirebaseFirestore.Firestore;
  userId: string;
  systemId?: string;
  tenantType?: unknown;
};

function normalizePhase(value: unknown): OnboardingPhase {
  return typeof value === 'string' && value.trim() ? value : 'not_started';
}

export function isCommercialBootstrapPhase(
  value: unknown
): value is (typeof COMMERCIAL_BOOTSTRAP_PHASES)[number] {
  return COMMERCIAL_BOOTSTRAP_PHASES.includes(
    normalizePhase(value) as (typeof COMMERCIAL_BOOTSTRAP_PHASES)[number]
  );
}

function readPhaseFromOrganizationData(
  data: OrganizationRecord
): OnboardingPhase {
  return normalizePhase(data?.onboardingPhase ?? data?.onboarding_phase);
}

export async function readOrganizationTenantType(
  orgId: string,
  adminDb: FirebaseFirestore.Firestore
): Promise<ReturnType<typeof normalizeTenantType>> {
  const orgDoc = await adminDb.collection('organizations').doc(orgId).get();
  if (!orgDoc.exists) {
    return null;
  }

  const data = orgDoc.data();
  return normalizeTenantType(data?.tenant_type ?? data?.tenantType);
}

export async function ensureTenantSetupCapabilities(
  input: EnsureTenantSetupInput
): Promise<{
  tenantType: ReturnType<typeof normalizeTenantType>;
  crmInstalled: boolean;
  crmAlreadyInstalled: boolean;
}> {
  const systemId = input.systemId || 'iso9001';
  const resolvedTenantType =
    normalizeTenantType(input.tenantType) ||
    (await readOrganizationTenantType(input.orgId, input.adminDb));

  if (
    !resolvedTenantType ||
    !shouldAutoInstallCrmForTenantType(resolvedTenantType)
  ) {
    return {
      tenantType: resolvedTenantType,
      crmInstalled: false,
      crmAlreadyInstalled: false,
    };
  }

  await input.adminDb.collection('organizations').doc(input.orgId).set(
    {
      tenant_type: resolvedTenantType,
      tenantType: resolvedTenantType,
      updated_at: new Date(),
    },
    { merge: true }
  );

  const installedCrm = await CapabilityService.getInstalledCapability(
    input.orgId,
    'crm'
  );

  if (installedCrm?.enabled && installedCrm.status === 'enabled') {
    return {
      tenantType: resolvedTenantType,
      crmInstalled: false,
      crmAlreadyInstalled: true,
    };
  }

  await CapabilityService.installCapability({
    organizationId: input.orgId,
    capabilityId: 'crm',
    systemId,
    userId: input.userId,
    enabled: true,
  });

  return {
    tenantType: resolvedTenantType,
    crmInstalled: true,
    crmAlreadyInstalled: false,
  };
}

export async function readOrganizationOnboardingPhase(
  orgId: string,
  adminDb: FirebaseFirestore.Firestore
): Promise<OnboardingPhase> {
  const orgRef = adminDb.collection('organizations').doc(orgId);
  const orgDoc = await orgRef.get();

  if (!orgDoc.exists) {
    return 'not_started';
  }

  const rootPhase = readPhaseFromOrganizationData(orgDoc.data());
  if (rootPhase !== 'not_started') {
    return rootPhase;
  }

  const legacyDoc = await orgRef.collection('meta').doc('onboarding').get();
  if (!legacyDoc.exists) {
    return rootPhase;
  }

  return normalizePhase(
    legacyDoc.data()?.organization_phase ?? legacyDoc.data()?.onboarding_phase
  );
}

export async function validateOnboardingPhase(
  orgId: string,
  requiredPhase: OnboardingPhase,
  adminDb: FirebaseFirestore.Firestore
): Promise<{ valid: boolean; currentPhase: OnboardingPhase }> {
  const currentPhase = await readOrganizationOnboardingPhase(orgId, adminDb);

  return {
    valid: currentPhase === requiredPhase,
    currentPhase,
  };
}

export async function transitionOrganizationOnboardingPhase(
  input: TransitionInput
): Promise<{ previousPhase: OnboardingPhase; currentPhase: OnboardingPhase }> {
  const orgRef = input.adminDb.collection('organizations').doc(input.orgId);
  const previousPhase = await readOrganizationOnboardingPhase(
    input.orgId,
    input.adminDb
  );
  const now = new Date();

  await orgRef.set(
    {
      onboardingPhase: input.nextPhase,
      onboarding_phase: input.nextPhase,
      onboardingPhaseUpdatedAt: now,
      updated_at: now,
    },
    { merge: true }
  );

  if (previousPhase !== input.nextPhase) {
    console.info(
      `[OnboardingPhase] org=${input.orgId} ${previousPhase} -> ${input.nextPhase}`
    );

    await AuditLogService.log({
      user_id: input.actor?.userId || 'system',
      user_email: input.actor?.userEmail || 'system@local',
      user_role: input.actor?.userRole || 'system',
      organization_id: input.orgId,
      action: 'update',
      module: 'system',
      resource_type: 'onboarding_phase',
      resource_id: input.orgId,
      resource_name: 'organization_onboarding_phase',
      status: 'success',
      details: {
        previous_phase: previousPhase,
        next_phase: input.nextPhase,
        ...input.details,
      },
    });
  }

  return {
    previousPhase,
    currentPhase: input.nextPhase,
  };
}
