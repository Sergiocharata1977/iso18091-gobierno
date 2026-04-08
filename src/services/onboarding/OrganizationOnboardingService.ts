import { getAdminFirestore } from '@/lib/firebase/admin';
import type { OrganizationCommercialBootstrapState } from '@/types/onboarding-commercial';
import type {
  MarkOnboardingPhaseInput,
  OrganizationOnboardingOwner,
  OrganizationOnboardingState,
  UpsertOrganizationOnboardingStateInput,
} from '@/types/onboarding';

const DEFAULT_SYSTEM_ID = 'iso9001';

type FirestoreDateLike = {
  toDate?: () => Date;
  _seconds?: number;
};

type RawOnboardingState = {
  onboarding_phase?: unknown;
  system_id?: unknown;
  owner?: unknown;
  bootstrap?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  phase_updated_at?: unknown;
  completed_at?: unknown;
};

function assertOrganizationId(organizationId: string): string {
  const normalized = organizationId?.trim();
  if (!normalized) {
    throw new Error('organization_id is required');
  }
  return normalized;
}

function getOnboardingDocRef(organizationId: string) {
  const db = getAdminFirestore();
  return db
    .collection('organizations')
    .doc(organizationId)
    .collection('meta')
    .doc('onboarding');
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

function normalizeOwner(value: unknown): OrganizationOnboardingOwner | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const userId =
    typeof record.user_id === 'string' ? record.user_id.trim() : '';

  if (!userId) return null;

  return {
    user_id: userId,
    display_name:
      typeof record.display_name === 'string' ? record.display_name : null,
    email: typeof record.email === 'string' ? record.email : null,
  };
}

function normalizeBootstrap(
  value: unknown
): OrganizationCommercialBootstrapState | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const organizationId =
    typeof record.organization_id === 'string'
      ? record.organization_id.trim()
      : '';
  const status = typeof record.status === 'string' ? record.status.trim() : '';
  const phase = typeof record.phase === 'string' ? record.phase.trim() : '';
  const owner =
    record.owner && typeof record.owner === 'object'
      ? (record.owner as OrganizationCommercialBootstrapState['owner'])
      : null;
  const company =
    record.company && typeof record.company === 'object'
      ? (record.company as OrganizationCommercialBootstrapState['company'])
      : null;

  if (!organizationId || !status || !phase || !owner || !company) {
    return null;
  }

  return {
    organization_id: organizationId,
    status: status as OrganizationCommercialBootstrapState['status'],
    phase: phase as OrganizationCommercialBootstrapState['phase'],
    owner,
    company,
    initialized_at: toDate(record.initialized_at),
    completed_at: toDate(record.completed_at),
  };
}

function normalizeState(
  organizationId: string,
  data: RawOnboardingState | null | undefined
): OrganizationOnboardingState | null {
  if (!data) return null;

  return {
    organization_id: organizationId,
    system_id:
      typeof data.system_id === 'string' && data.system_id.trim()
        ? data.system_id
        : DEFAULT_SYSTEM_ID,
    onboarding_phase:
      typeof data.onboarding_phase === 'string' && data.onboarding_phase.trim()
        ? data.onboarding_phase
        : 'not_started',
    owner: normalizeOwner(data.owner),
    bootstrap: normalizeBootstrap(data.bootstrap),
    created_at: toDate(data.created_at),
    updated_at: toDate(data.updated_at),
    phase_updated_at: toDate(data.phase_updated_at),
    completed_at: toDate(data.completed_at),
  };
}

function shouldRefreshPhaseTimestamp(
  existing: RawOnboardingState | null,
  nextPhase: string
): boolean {
  if (!existing) return true;
  return existing.onboarding_phase !== nextPhase;
}

export class OrganizationOnboardingService {
  static async getOrganizationOnboardingState(
    organizationId: string
  ): Promise<OrganizationOnboardingState | null> {
    const orgId = assertOrganizationId(organizationId);
    const snapshot = await getOnboardingDocRef(orgId).get();

    if (!snapshot.exists) return null;

    return normalizeState(orgId, snapshot.data() as RawOnboardingState);
  }

  static async upsertOrganizationOnboardingState(
    input: UpsertOrganizationOnboardingStateInput
  ): Promise<OrganizationOnboardingState> {
    const orgId = assertOrganizationId(input.organization_id);
    const ref = getOnboardingDocRef(orgId);
    const snapshot = await ref.get();
    const existing = snapshot.exists
      ? (snapshot.data() as RawOnboardingState)
      : null;
    const now = new Date();

    const explicitPhaseUpdatedAt =
      input.phase_updated_at === undefined
        ? undefined
        : (toDate(input.phase_updated_at) ?? now);
    const phaseUpdatedAt =
      explicitPhaseUpdatedAt ??
      (shouldRefreshPhaseTimestamp(existing, input.onboarding_phase)
        ? now
        : (toDate(existing?.phase_updated_at) ??
          toDate(existing?.updated_at) ??
          now));

    const nextCompletedAt =
      input.completed_at === undefined
        ? toDate(existing?.completed_at)
        : input.completed_at === null
          ? null
          : (toDate(input.completed_at) ?? now);

    const payload: RawOnboardingState = {
      onboarding_phase: input.onboarding_phase,
      system_id:
        (typeof input.system_id === 'string' && input.system_id.trim()) ||
        (typeof existing?.system_id === 'string' &&
          existing.system_id.trim()) ||
        DEFAULT_SYSTEM_ID,
      owner:
        input.owner === undefined
          ? (existing?.owner ?? null)
          : (input.owner ?? null),
      bootstrap:
        input.bootstrap === undefined
          ? (existing?.bootstrap ?? null)
          : (input.bootstrap ?? null),
      created_at: existing?.created_at ?? now,
      updated_at: now,
      phase_updated_at: phaseUpdatedAt,
      completed_at: nextCompletedAt,
    };

    await ref.set(payload, { merge: true });

    return normalizeState(orgId, payload)!;
  }

  static async markOnboardingPhase(
    input: MarkOnboardingPhaseInput
  ): Promise<OrganizationOnboardingState> {
    const at = input.at ? (toDate(input.at) ?? new Date()) : new Date();
    const shouldMarkCompleted =
      input.completed ?? input.onboarding_phase === 'completed';
    const completedAt =
      input.completed === false ? null : shouldMarkCompleted ? at : undefined;

    return this.upsertOrganizationOnboardingState({
      organization_id: input.organization_id,
      onboarding_phase: input.onboarding_phase,
      system_id: input.system_id,
      owner: input.owner,
      bootstrap: input.bootstrap,
      phase_updated_at: at,
      completed_at: completedAt,
    });
  }
}

export async function getOrganizationOnboardingState(organizationId: string) {
  return OrganizationOnboardingService.getOrganizationOnboardingState(
    organizationId
  );
}

export async function upsertOrganizationOnboardingState(
  input: UpsertOrganizationOnboardingStateInput
) {
  return OrganizationOnboardingService.upsertOrganizationOnboardingState(input);
}

export async function markOnboardingPhase(input: MarkOnboardingPhaseInput) {
  return OrganizationOnboardingService.markOnboardingPhase(input);
}
