'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight, CheckCircle, PartyPopper } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import Confetti from 'react-confetti';

type BillingSummaryResponse = {
  success: boolean;
  organization: {
    id: string;
    name: string;
  };
  snapshot: {
    planCode: 'none' | 'trial' | 'basic' | 'premium';
    subscriptionStatus:
      | 'inactive'
      | 'trialing'
      | 'active'
      | 'past_due'
      | 'canceled';
    currentPeriodEnd: string | null;
    commercialState: {
      accessState:
        | 'trial'
        | 'active'
        | 'grace_period'
        | 'blocked'
        | 'canceled';
    };
  };
  error?: string;
};

function getPlanLabel(planCode: BillingSummaryResponse['snapshot']['planCode']) {
  switch (planCode) {
    case 'basic':
      return 'Basico';
    case 'premium':
      return 'Premium';
    case 'trial':
      return 'Trial';
    default:
      return 'Sin plan';
  }
}

function getStatusLabel(
  subscriptionStatus: BillingSummaryResponse['snapshot']['subscriptionStatus']
) {
  switch (subscriptionStatus) {
    case 'active':
      return 'Activo';
    case 'trialing':
      return 'En prueba';
    case 'past_due':
      return 'Pago pendiente';
    case 'canceled':
      return 'Cancelado';
    default:
      return 'Sin activar';
  }
}

function SuccessContent() {
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [summary, setSummary] = useState<BillingSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const response = await fetch('/api/billing/organization/summary', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });
        const data = (await response.json()) as BillingSummaryResponse;

        if (!response.ok) {
          throw new Error(data.error || 'No se pudo obtener el estado real');
        }

        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'No se pudo cargar la facturacion'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const nextRenewal = summary?.snapshot.currentPeriodEnd
    ? new Date(summary.snapshot.currentPeriodEnd).toLocaleDateString('es-AR')
    : 'Pendiente de confirmacion';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={['#10B981', '#059669', '#34D399', '#6EE7B7', '#FBBF24']}
        />
      )}

      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Image
            src="/logo-icono.png"
            alt="9001App"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div>
            <h1 className="font-bold text-lg">9001App</h1>
            <p className="text-xs text-muted-foreground">Sistema ISO 9001</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-3xl flex items-center justify-center gap-2">
              Pago exitoso
              <PartyPopper className="w-7 h-7 text-yellow-500" />
            </CardTitle>
            <CardDescription className="text-base mt-2">
              El estado comercial se confirma contra la organizacion real.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-xl p-5 space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">
                  Consultando resumen de facturacion...
                </div>
              ) : error ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    No se pudo validar el estado comercial.
                  </p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-muted-foreground">Organizacion:</span>
                    <span className="font-semibold text-right">
                      {summary?.organization.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-muted-foreground">Estado:</span>
                    <span className="font-semibold text-green-600">
                      {summary
                        ? getStatusLabel(summary.snapshot.subscriptionStatus)
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-semibold">
                      {summary ? getPlanLabel(summary.snapshot.planCode) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-muted-foreground">
                      Proxima renovacion:
                    </span>
                    <span className="font-medium text-right">{nextRenewal}</span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full h-12 text-base" size="lg">
                <Link href="/dashboard">
                  Ir al dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Si el cobro acaba de finalizar, el resumen puede tardar unos
                segundos en reflejarse.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 9001App - Sistema de Gestion de Calidad ISO 9001:2015</p>
        </div>
      </footer>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
