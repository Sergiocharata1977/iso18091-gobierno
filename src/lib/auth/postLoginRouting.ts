import {
  BOOTSTRAP_ROUTE,
  HOME_ROUTE,
  ONBOARDING_ROUTE,
  SUPER_ADMIN_ROUTE,
  resolveOnboardingAccess,
} from '@/lib/auth/onboardingAccess';

type LandingUserLike = {
  id?: string | null;
  uid?: string | null;
  rol?: string | null;
  organization_id?: string | null;
  personnel_id?: string | null;
  first_login?: boolean | null;
  is_first_login?: boolean | null;
  onboarding_phase?: string | null;
  onboarding_owner_user_id?: string | null;
  onboardingState?: {
    onboarding_phase?: string | null;
    onboarding_owner_user_id?: string | null;
    bootstrap?: {
      status?: string | null;
    } | null;
  } | null;
  onboarding_bootstrap_status?: string | null;
  status?: string | null;
  activo?: boolean | null;
  billing_status?: 'active' | 'past_due' | 'canceled' | null;
  expirationDate?: Date | string | null;
  commercialState?: {
    accessState?: 'trial' | 'active' | 'grace_period' | 'blocked' | 'canceled' | null;
  } | null;
};

function isReturnUrlAllowed(returnUrl?: string | null): returnUrl is string {
  if (!returnUrl) return false;
  if (!returnUrl.startsWith('/')) return false;
  if (returnUrl.startsWith('//')) return false;

  const blocked = new Set(['/login', '/register', '/pending']);
  const pathname = returnUrl.split(/[?#]/, 1)[0];
  return !blocked.has(pathname);
}

export function resolvePostLoginRoute(user?: LandingUserLike | null): string {
  return resolveOnboardingAccess(user).route;
}

export function resolvePostLoginDestination(
  user?: LandingUserLike | null,
  returnUrl?: string | null
): string {
  const defaultRoute = resolvePostLoginRoute(user);

  if (defaultRoute === BOOTSTRAP_ROUTE) {
    return BOOTSTRAP_ROUTE;
  }

  if (defaultRoute === ONBOARDING_ROUTE) {
    return ONBOARDING_ROUTE;
  }

  if (defaultRoute === SUPER_ADMIN_ROUTE) {
    if (isReturnUrlAllowed(returnUrl)) return returnUrl;
    return SUPER_ADMIN_ROUTE;
  }

  if (user?.organization_id && defaultRoute === HOME_ROUTE) {
    return HOME_ROUTE;
  }

  if (isReturnUrlAllowed(returnUrl)) return returnUrl;
  return defaultRoute;
}
