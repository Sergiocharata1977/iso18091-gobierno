import {
  isOnboardingOwner,
  resolveOnboardingRoleFallback,
} from '@/lib/onboarding/resolveOnboardingOwner';

describe('resolveOnboardingOwner', () => {
  it('returns explicit owner when user id matches onboarding owner id', () => {
    expect(
      isOnboardingOwner(
        { id: 'user-1', rol: 'operario' },
        { onboarding_owner_user_id: 'user-1' }
      )
    ).toEqual({ isOwner: true, source: 'explicit' });
  });

  it('returns none when explicit owner exists and user differs', () => {
    expect(
      isOnboardingOwner(
        { id: 'user-2', rol: 'admin' },
        { onboarding_owner_user_id: 'user-1' }
      )
    ).toEqual({ isOwner: false, source: 'none' });
  });

  it('falls back to admin/gerente/jefe when no explicit owner', () => {
    expect(resolveOnboardingRoleFallback({ rol: 'admin' })).toBe(true);
    expect(resolveOnboardingRoleFallback({ rol: 'gerente' })).toBe(true);
    expect(resolveOnboardingRoleFallback({ rol: 'jefe' })).toBe(true);
    expect(resolveOnboardingRoleFallback({ rol: 'operario' })).toBe(false);

    expect(
      isOnboardingOwner(
        { uid: 'user-3', rol: 'gerente' },
        { onboarding_owner_user_id: null }
      )
    ).toEqual({ isOwner: true, source: 'fallback' });
  });
});
