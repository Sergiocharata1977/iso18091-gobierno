import {
  BILLING_REQUIRED_ROUTE,
  BOOTSTRAP_ROUTE,
  HOME_ROUTE,
  ONBOARDING_ROUTE,
  PENDING_ROUTE,
  SUPER_ADMIN_ROUTE,
  resolveOnboardingAccess,
} from '@/lib/auth/onboardingAccess';

describe('onboardingAccess', () => {
  it('sends super admin to super admin area', () => {
    expect(
      resolveOnboardingAccess({
        rol: 'super_admin',
        organization_id: null,
      })
    ).toEqual({
      route: SUPER_ADMIN_ROUTE,
      reason: 'super_admin',
    });
  });

  it('sends users without organization to bootstrap', () => {
    expect(
      resolveOnboardingAccess({
        rol: 'admin',
        organization_id: null,
      })
    ).toEqual({
      route: BOOTSTRAP_ROUTE,
      reason: 'bootstrap_required',
    });
  });

  it('keeps compatibility with pending approval users without onboarding state', () => {
    expect(
      resolveOnboardingAccess({
        rol: 'admin',
        organization_id: 'org-1',
        status: 'pending_approval',
      })
    ).toEqual({
      route: PENDING_ROUTE,
      reason: 'organization_pending',
    });
  });

  it('sends organizations with incomplete onboarding to onboarding router', () => {
    expect(
      resolveOnboardingAccess({
        rol: 'admin',
        organization_id: 'org-1',
        onboarding_phase: 'commercial_bootstrap_completed',
      })
    ).toEqual({
      route: ONBOARDING_ROUTE,
      reason: 'onboarding_required',
    });
  });

  it('sends completed organizations with blocked billing to billing-required page', () => {
    expect(
      resolveOnboardingAccess({
        rol: 'admin',
        organization_id: 'org-1',
        onboarding_phase: 'completed',
        status: 'expired',
        billing_status: 'canceled',
        expirationDate: '2024-01-01T00:00:00.000Z',
      })
    ).toEqual({
      route: BILLING_REQUIRED_ROUTE,
      reason: 'billing_required',
    });
  });

  it('sends completed organizations with blocked org-centric billing to billing-required page', () => {
    expect(
      resolveOnboardingAccess({
        rol: 'admin',
        organization_id: 'org-1',
        onboarding_phase: 'completed',
        commercialState: { accessState: 'blocked' },
      })
    ).toEqual({
      route: BILLING_REQUIRED_ROUTE,
      reason: 'billing_required',
    });
  });

  it('allows completed organizations with org-centric active billing', () => {
    expect(
      resolveOnboardingAccess({
        rol: 'admin',
        organization_id: 'org-1',
        onboarding_phase: 'completed',
        commercialState: { accessState: 'active' },
      })
    ).toEqual({
      route: HOME_ROUTE,
      reason: 'home',
    });
  });

  it('allows completed organizations with org-centric grace_period billing', () => {
    expect(
      resolveOnboardingAccess({
        rol: 'admin',
        organization_id: 'org-1',
        onboarding_phase: 'completed',
        commercialState: { accessState: 'grace_period' },
      })
    ).toEqual({
      route: HOME_ROUTE,
      reason: 'home',
    });
  });

  it('sends completed organizations with active billing to home', () => {
    expect(
      resolveOnboardingAccess({
        rol: 'admin',
        organization_id: 'org-1',
        onboarding_phase: 'completed',
        billing_status: 'active',
      })
    ).toEqual({
      route: HOME_ROUTE,
      reason: 'home',
    });
  });
});
