'use client';

import { OrganizationSubscriptionPanel } from '@/components/billing/OrganizationSubscriptionPanel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function OrganizationBillingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-950">
            Billing de organizacion
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Inicia sesion para ver el estado comercial y gestionar el checkout
            de tu organizacion.
          </p>
          <Button asChild className="mt-6">
            <Link href="/login">Ir a login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Suscripcion de la organizacion
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Portal comercial centrado en la organizacion activa.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al dashboard
          </Link>
        </Button>
      </div>

      <OrganizationSubscriptionPanel />
    </div>
  );
}
