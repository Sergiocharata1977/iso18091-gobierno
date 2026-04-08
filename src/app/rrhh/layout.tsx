/**
 * Layout para el módulo RRHH
 * Incluye autenticación y RRHHSidebar
 * NO hereda del dashboard layout para evitar sidebar duplicado
 */

'use client';

import { DocumentationRouteButton } from '@/components/docs/DocumentationRouteButton';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { RRHHSidebar } from '@/components/layout/RRHHSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { DonCandidoFAB } from '@/features/chat';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RRHHLayout({
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f3_42%,#f8fafc_100%)]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f3_42%,#f8fafc_100%)]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f6f8fb]">
      {/* RRHH Sidebar - único sidebar */}
      <RRHHSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader />

        {/* Content */}
        <main className="design-system-stage flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Don Cándido FAB */}
      <DocumentationRouteButton floating />
      <DonCandidoFAB />
    </div>
  );
}
