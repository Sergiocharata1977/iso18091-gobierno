'use client';

import { useAuth } from '@/contexts/AuthContext';
import { resolveOnboardingAccess } from '@/lib/auth/onboardingAccess';
import { resolvePostLoginRoute } from '@/lib/auth/postLoginRouting';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const redirectWithFreshUser = async () => {
      try {
        const response = await fetch(`/api/users/${user.id}`);
        if (response.ok) {
          const freshUser = await response.json();
          router.replace(resolveOnboardingAccess(freshUser).route);
          return;
        }
      } catch (error) {
        console.error('[OnboardingPage] Error resolving onboarding:', error);
      }

      router.replace(resolvePostLoginRoute(user));
    };

    void redirectWithFreshUser();
  }, [loading, router, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500" />
        <p className="text-sm text-slate-600">Redirigiendo...</p>
      </div>
    </div>
  );
}
