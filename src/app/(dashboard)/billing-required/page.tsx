'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, ArrowRight, CreditCard, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type BillingSummary = {
  snapshot: {
    subscriptionStatus: string;
    commercialState: {
      accessState: string;
      lockedReason: string | null;
      accessEndsAt: string | null;
      lastPaymentError: string | null;
    };
    planCode: string;
    ownerEmail: string | null;
  } | null;
};

const REASON_LABELS: Record<string, string> = {
  payment_required: 'Pago requerido',
  subscription_canceled: 'Suscripcion cancelada',
  no_active_billing: 'Sin suscripcion activa',
};

export default function BillingRequiredPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/billing/organization/summary');
        if (res.ok) {
          const data = (await res.json()) as BillingSummary;
          setSummary(data);

          // Si el estado comercial no es blocked, redirigir al home
          const state = data.snapshot?.commercialState?.accessState;
          if (state && state !== 'blocked') {
            router.replace('/noticias');
          }
        }
      } catch (err) {
        console.error('[BillingRequired] Error al obtener summary:', err);
      } finally {
        setLoadingSummary(false);
      }
    };

    void fetchSummary();
  }, [authLoading, user, router]);

  if (authLoading || loadingSummary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4]">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  const lockedReason =
    summary?.snapshot?.commercialState?.lockedReason ?? 'no_active_billing';
  const lastPaymentError =
    summary?.snapshot?.commercialState?.lastPaymentError;
  const ownerEmail = summary?.snapshot?.ownerEmail;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f7f4] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        {/* Icono */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        {/* Titulo */}
        <h1 className="mb-2 text-center text-xl font-semibold text-slate-800">
          Acceso suspendido
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          {REASON_LABELS[lockedReason] ?? 'Tu organizacion no tiene una suscripcion activa'}
        </p>

        {/* Detalle del error de pago */}
        {lastPaymentError && (
          <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-medium">Ultimo error de pago: </span>
            {lastPaymentError}
          </div>
        )}

        {/* Nota para no-owner */}
        {ownerEmail && (
          <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Para resolver esto, el administrador de la cuenta (
            <span className="font-medium">{ownerEmail}</span>) debe actualizar
            los datos de pago.
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/organization/billing"
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            <CreditCard className="h-4 w-4" />
            Actualizar suscripcion
            <ArrowRight className="h-4 w-4" />
          </Link>

          <button
            onClick={() => router.refresh()}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Verificar estado
          </button>
        </div>

        {/* Link soporte */}
        <p className="mt-6 text-center text-xs text-slate-400">
          ¿Problemas?{' '}
          <a
            href="mailto:soporte@doncandidoia.com"
            className="text-emerald-600 hover:underline"
          >
            Contactar soporte
          </a>
        </p>
      </div>
    </div>
  );
}
