export type OnboardingOwnerSource = 'explicit' | 'fallback' | 'none';

export interface OnboardingOwnerResolution {
  isOwner: boolean;
  source: OnboardingOwnerSource;
}

type UserLike =
  | {
      id?: string | null;
      uid?: string | null;
      rol?: string | null;
    }
  | null
  | undefined;

type OnboardingStateLike =
  | {
      onboarding_owner_user_id?: string | null;
    }
  | null
  | undefined;

const ONBOARDING_OWNER_FALLBACK_ROLES = ['admin', 'gerente', 'jefe'] as const;

function normalizeText(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function normalizeId(value?: string | null): string {
  return (value || '').trim();
}

function getUserId(user: UserLike): string {
  return normalizeId(user?.id) || normalizeId(user?.uid);
}

export function resolveOnboardingRoleFallback(user: UserLike): boolean {
  const role = normalizeText(user?.rol);
  return ONBOARDING_OWNER_FALLBACK_ROLES.includes(
    role as (typeof ONBOARDING_OWNER_FALLBACK_ROLES)[number]
  );
}

export function isOnboardingOwner(
  user: UserLike,
  onboardingState: OnboardingStateLike
): OnboardingOwnerResolution {
  const userId = getUserId(user);
  const explicitOwnerUserId = normalizeId(
    onboardingState?.onboarding_owner_user_id
  );

  if (userId && explicitOwnerUserId) {
    const isExplicitOwner = userId === explicitOwnerUserId;
    return {
      isOwner: isExplicitOwner,
      source: isExplicitOwner ? 'explicit' : 'none',
    };
  }

  if (resolveOnboardingRoleFallback(user)) {
    return { isOwner: true, source: 'fallback' };
  }

  return { isOwner: false, source: 'none' };
}

export const onboardingOwnerFallbackRoles = [
  ...ONBOARDING_OWNER_FALLBACK_ROLES,
];
