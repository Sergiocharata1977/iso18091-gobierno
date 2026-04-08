'use client';

import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useInstalledCapabilities } from '@/hooks/useInstalledCapabilities';

interface HSECapabilityGateProps {
  children: React.ReactNode;
}

export function HSECapabilityGate({ children }: HSECapabilityGateProps) {
  const { hasCapability, loading } = useInstalledCapabilities();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!hasCapability('pack_hse')) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-900/40 text-emerald-400">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-slate-100">Pack HSE no habilitado</h2>
          <p className="mt-2 text-sm text-slate-400">
            Esta funcionalidad requiere el{' '}
            <span className="font-medium text-emerald-400">Pack HSE</span> (ISO 14001 + ISO 45001).
            Actívalo desde el Marketplace para acceder a la gestión de incidentes, aspectos
            ambientales, EPP y requisitos legales.
          </p>
          <Link
            href="/admin/marketplace"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Ir al Marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
