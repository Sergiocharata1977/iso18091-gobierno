/**
 * Layout para el módulo CRM
 * Incluye autenticación y CRMSidebar
 * NO hereda del dashboard layout para evitar sidebar duplicado
 */

'use client';

import { CRMSidebar } from '@/components/layout/CRMSidebar';
import { DocumentationRouteButton } from '@/components/docs/DocumentationRouteButton';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';
import { DonCandidoFAB } from '@/features/chat';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* CRM Sidebar - único sidebar */}
      <CRMSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader />

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>

      {/* Don Cándido FAB */}
      <DocumentationRouteButton floating />
      <DonCandidoFAB />
    </div>
  );
}
