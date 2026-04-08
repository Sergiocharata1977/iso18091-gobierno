'use client';

import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { HeaderContextStrip } from '@/components/layout/header/HeaderContextStrip';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { DonCandidoFAB } from '@/features/chat';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }

    if (
      !loading &&
      user?.rol === 'super_admin' &&
      pathname &&
      !pathname.startsWith('/super-admin')
    ) {
      router.push('/super-admin/organizaciones');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-muted-foreground">Redirigiendo al acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_60%)]" />

        <div className="relative z-20 md:hidden">
          <MobileNav />
          <HeaderContextStrip className="md:hidden" />
        </div>

        <div className="relative z-20 hidden md:flex">
          <DashboardHeader />
        </div>

        <main className="relative z-10 flex-1 overflow-y-auto pb-safe">
          <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
      <div className="hidden md:block">
        <DonCandidoFAB />
      </div>
    </div>
  );
}
