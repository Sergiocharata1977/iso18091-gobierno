import { invalidateUserCache } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { normalizeTenantType } from '@/lib/onboarding/tenantTypeUtils';
import { PluginLifecycleService } from '@/lib/plugins/PluginLifecycleService';
import type { Edition } from '@/types/edition';
import type {
  BootstrapOrganizationInput,
  OrganizationCommercialBootstrapState,
} from '@/types/onboarding-commercial';
import type { OrganizationOnboardingState } from '@/types/onboarding';
import { OrganizationOnboardingService } from '@/services/onboarding/OrganizationOnboardingService';

const DEFAULT_SYSTEM_ID = 'iso9001';
const DEFAULT_TENANT_TYPE = 'iso_puro';
const COMMERCIAL_BOOTSTRAP_PHASE = 'commercial_bootstrap_completed';

function normalizeRequiredText(
  value: string | null | undefined,
  field: string
) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function slugifyOrganizationName(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || 'organization';
}

async function resolveOrganizationId(
  requestedOrganizationId: string | null | undefined,
  organizationName: string
): Promise<string> {
  const explicit = requestedOrganizationId?.trim();
  if (explicit) return explicit;

  const db = getAdminFirestore();
  const baseId = `org_${slugifyOrganizationName(organizationName)}`;
  const baseRef = db.collection('organizations').doc(baseId);
  const baseDoc = await baseRef.get();

  if (!baseDoc.exists) return baseId;

  const suffix = Date.now().toString(36).slice(-6);
  return `${baseId}_${suffix}`;
}

function buildBootstrapState(input: {
  organizationId: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  organizationName: string;
  tenantType: string;
  edition: Edition;
  industry: string | null;
  planIntent: string | null;
  now: Date;
}): OrganizationCommercialBootstrapState {
  return {
    status: 'completed',
    phase: COMMERCIAL_BOOTSTRAP_PHASE,
    organization_id: input.organizationId,
    owner: {
      user_id: input.ownerUserId,
      display_name: input.ownerName,
      email: input.ownerEmail,
      role: 'admin',
      assigned_at: input.now,
    },
    company: {
      organization_name: input.organizationName,
      tenant_type: input.tenantType,
      edition: input.edition,
      industry: input.industry,
      plan_intent: input.planIntent,
    },
    initialized_at: input.now,
    completed_at: input.now,
  };
}

export class OrganizationBootstrapService {
  static async bootstrapOrganization(
    input: BootstrapOrganizationInput
  ): Promise<OrganizationOnboardingState> {
    const actorUserId = normalizeRequiredText(
      input.actor_user_id,
      'actor_user_id'
    );
    const organizationName = normalizeRequiredText(
      input.organization_name,
      'organization_name'
    );
    const ownerName = normalizeRequiredText(input.owner_name, 'owner_name');
    const ownerEmail = normalizeRequiredText(input.owner_email, 'owner_email');
    const tenantType =
      normalizeTenantType(input.tenant_type) || DEFAULT_TENANT_TYPE;
    const edition: Edition =
      input.edition === 'government' ? 'government' : 'enterprise';
    const industry = normalizeOptionalText(input.industry);
    const planIntent = normalizeOptionalText(input.plan_intent);
    const now = new Date();
    const organizationId = await resolveOrganizationId(
      input.actor_organization_id,
      organizationName
    );
    const bootstrap = buildBootstrapState({
      organizationId,
      ownerUserId: actorUserId,
      ownerName,
      ownerEmail,
      organizationName,
      tenantType,
      edition,
      industry,
      planIntent,
      now,
    });

    const db = getAdminFirestore();
    const orgRef = db.collection('organizations').doc(organizationId);
    const userRef = db.collection('users').doc(actorUserId);
    const onboardingRef = orgRef.collection('meta').doc('onboarding');

    await db.runTransaction(async transaction => {
      const [orgDoc, userDoc, onboardingDoc] = await Promise.all([
        transaction.get(orgRef),
        transaction.get(userRef),
        transaction.get(onboardingRef),
      ]);

      const orgData = orgDoc.exists ? orgDoc.data() : null;
      const userData = userDoc.exists ? userDoc.data() : null;
      const onboardingData = onboardingDoc.exists ? onboardingDoc.data() : null;

      transaction.set(
        orgRef,
        {
          id: organizationId,
          name: organizationName,
          slug: slugifyOrganizationName(organizationName),
          tenant_type: tenantType,
          tenantType: tenantType,
          edition,
          industry: industry,
          plan_intent: planIntent,
          owner_user_id: actorUserId,
          owner_email: ownerEmail,
          owner_name: ownerName,
          onboarding_owner_user_id: actorUserId,
          onboardingPhase: COMMERCIAL_BOOTSTRAP_PHASE,
          onboarding_phase: COMMERCIAL_BOOTSTRAP_PHASE,
          onboardingPhaseUpdatedAt: now,
          created_at: orgData?.created_at ?? now,
          updated_at: now,
        },
        { merge: true }
      );

      transaction.set(
        onboardingRef,
        {
          onboarding_phase: COMMERCIAL_BOOTSTRAP_PHASE,
          organization_phase: COMMERCIAL_BOOTSTRAP_PHASE,
          system_id:
            typeof onboardingData?.system_id === 'string' &&
            onboardingData.system_id.trim()
              ? onboardingData.system_id
              : DEFAULT_SYSTEM_ID,
          owner: {
            user_id: actorUserId,
            display_name: ownerName,
            email: ownerEmail,
          },
          bootstrap,
          created_at: onboardingData?.created_at ?? now,
          updated_at: now,
          phase_updated_at: now,
          completed_at: onboardingData?.completed_at ?? null,
        },
        { merge: true }
      );

      transaction.set(
        userRef,
        {
          email: input.actor_email?.trim() || userData?.email || ownerEmail,
          organization_id: organizationId,
          rol: 'admin',
          activo: true,
          status: 'active',
          company_name: organizationName,
          owner_name: ownerName,
          onboarding_owner_user_id: actorUserId,
          onboarding_phase: COMMERCIAL_BOOTSTRAP_PHASE,
          updated_at: now,
          created_at: userData?.created_at ?? now,
        },
        { merge: true }
      );
    });

    invalidateUserCache(actorUserId);

    const onboardingState =
      await OrganizationOnboardingService.upsertOrganizationOnboardingState({
      organization_id: organizationId,
      onboarding_phase: COMMERCIAL_BOOTSTRAP_PHASE,
      system_id: DEFAULT_SYSTEM_ID,
      owner: {
        user_id: actorUserId,
        display_name: ownerName,
        email: ownerEmail,
      },
      bootstrap,
      phase_updated_at: now,
    });

    if (edition === 'government') {
      await PluginLifecycleService.autoInstallEditionPlugins(
        organizationId,
        edition
      );
    }

    return onboardingState;
  }
}

export async function bootstrapOrganization(input: BootstrapOrganizationInput) {
  return OrganizationBootstrapService.bootstrapOrganization(input);
}
