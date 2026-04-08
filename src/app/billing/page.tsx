'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BillingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/organization/billing');
    }
  }, [loading, router, user]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
      <div className="container mx-auto flex min-h-screen max-w-5xl items-center px-4 py-16">
        <div className="w-full rounded-[32px] border border-slate-200 bg-white/90 p-10 shadow-sm backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <Building2 className="h-3.5 w-3.5" />
            Billing por organizacion
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950">
            El portal de suscripcion ahora vive en tu organizacion
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600">
            Inicia sesion para ver trial, renovacion, estado de pago y checkout
            desde el contexto comercial real de tu organizacion.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Iniciar sesion
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/organization/billing">Ir al portal</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
