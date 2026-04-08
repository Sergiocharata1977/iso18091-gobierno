'use client';

import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { DonCandidoFAB } from '@/features/chat';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MiSGCLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden">
          <MobileNav />
        </div>
        <div className="hidden md:flex">
          <DashboardHeader />
        </div>
        <main className="flex-1 overflow-y-auto pb-safe">
          <div className="w-full px-4 sm:px-6 lg:px-6 py-6">{children}</div>
        </main>
      </div>

      <div className="hidden md:block">
        <DonCandidoFAB />
      </div>
    </div>
  );
}
