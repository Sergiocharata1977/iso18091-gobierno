'use client';

import { BillingStatusSummary } from '@/components/billing/BillingStatusSummary';
import type {
  BillingSummaryPlan,
  BillingSummaryResponse,
} from '@/components/billing/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  Crown,
  Loader2,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function getPrimaryCta(snapshot: BillingSummaryResponse['snapshot']): string {
  switch (snapshot.commercialState.accessState) {
    case 'grace_period':
    case 'blocked':
      return 'Pagar ahora';
    case 'active':
    case 'canceled':
      return 'Cambiar plan';
    default:
      return 'Activar plan';
  }
}

function getPlanCardTone(
  plan: BillingSummaryPlan,
  currentPlan: BillingSummaryResponse['snapshot']['planCode']
) {
  if (plan.code === currentPlan) {
    return 'border-emerald-300 bg-emerald-50/70';
  }

  if (plan.code === 'premium') {
    return 'border-slate-900 bg-slate-950 text-white';
  }

  return 'border-slate-200 bg-white';
}

export function OrganizationSubscriptionPanel() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<BillingSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.organization_id) {
      setLoading(false);
      setError('No hay una organizacion activa en tu sesion.');
      return;
    }

    let isMounted = true;

    const loadSummary = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/billing/organization/summary', {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'No se pudo cargar el estado comercial de la organizacion.'
          );
        }

        if (isMounted) {
          setSummary(data as BillingSummaryResponse);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'No se pudo cargar billing.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.organization_id]);

  const primaryCta = useMemo(
    () => (summary ? getPrimaryCta(summary.snapshot) : 'Activar plan'),
    [summary]
  );

  const handleSubscribe = async (planCode: string) => {
    setCheckoutPlan(planCode);
    setError(null);

    try {
      const response = await fetch('/api/billing/mobbex/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planCode,
          userName: user?.email?.split('@')[0] || 'admin',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo iniciar el checkout.');
      }

      window.location.href = data.checkoutUrl;
    } catch (subscribeError) {
      setError(
        subscribeError instanceof Error
          ? subscribeError.message
          : 'No se pudo iniciar el checkout.'
      );
      setCheckoutPlan(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-4 text-center">
          <Shield className="h-10 w-10 text-slate-400" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-950">
              Inicia sesion para administrar billing
            </h2>
            <p className="text-sm text-slate-600">
              El portal de suscripcion ahora se gestiona a nivel organizacion.
            </p>
          </div>
          <Button asChild>
            <a href="/login">Ir a login</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card className="border-rose-200 bg-rose-50 shadow-sm">
        <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-4 text-center">
          <AlertTriangle className="h-10 w-10 text-rose-600" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-rose-950">
              No se pudo cargar billing
            </h2>
            <p className="max-w-xl text-sm text-rose-700">
              {error || 'No hay datos disponibles para esta organizacion.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#ecfdf5_100%)] shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700">
                <Building2 className="h-3.5 w-3.5" />
                Billing por organizacion
              </div>
              <div>
                <CardTitle className="text-3xl font-semibold tracking-tight text-slate-950">
                  {summary.organization.name}
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm text-slate-600">
                  Estado comercial real, trial, renovacion y checkout
                  centralizados en la organizacion.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-slate-300 bg-white/80">
                Rol: {summary.viewer.role}
              </Badge>
              {summary.snapshot.ownerEmail ? (
                <Badge variant="outline" className="border-slate-300 bg-white/80">
                  Owner: {summary.snapshot.ownerEmail}
                </Badge>
              ) : null}
              {summary.snapshot.provider ? (
                <Badge variant="outline" className="border-slate-300 bg-white/80">
                  Provider: {summary.snapshot.provider}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <BillingStatusSummary snapshot={summary.snapshot} />

          {summary.snapshot.lastPaymentError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Hay una incidencia de pago</p>
                  <p>{summary.snapshot.lastPaymentError}</p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Sparkles className="h-4 w-4" />
              {primaryCta}
            </div>
            <CardTitle className="text-2xl text-slate-950">
              Selecciona el plan para {summary.organization.name}
            </CardTitle>
            <CardDescription>
              El checkout ya se inicia con el contexto comercial de la
              organizacion, no del usuario individual.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 lg:grid-cols-2">
            {summary.availablePlans.map(plan => {
              const isCurrentPlan =
                plan.code === summary.snapshot.planCode &&
                summary.snapshot.subscriptionStatus === 'active';

              return (
                <div
                  key={plan.code}
                  className={`flex h-full flex-col rounded-3xl border p-6 ${getPlanCardTone(plan, summary.snapshot.planCode)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {plan.code === 'premium' ? (
                          <Crown className="h-5 w-5" />
                        ) : (
                          <Shield className="h-5 w-5 text-emerald-600" />
                        )}
                        <h3 className="text-xl font-semibold">{plan.name}</h3>
                      </div>
                      <p
                        className={`text-sm ${plan.code === 'premium' ? 'text-slate-300' : 'text-slate-600'}`}
                      >
                        {plan.description}
                      </p>
                    </div>
                    {plan.code === 'premium' ? (
                      <Badge className="bg-white/10 text-white hover:bg-white/10">
                        Recomendado
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-8">
                    <p className="text-3xl font-semibold">
                      {formatMoney(plan.price)}
                    </p>
                    <p
                      className={`mt-1 text-sm ${plan.code === 'premium' ? 'text-slate-300' : 'text-slate-600'}`}
                    >
                      por mes
                    </p>
                  </div>

                  <ul
                    className={`mt-6 space-y-3 text-sm ${plan.code === 'premium' ? 'text-slate-200' : 'text-slate-700'}`}
                  >
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Billing ligado a la organizacion
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Estado comercial visible para admins y owner
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Checkout centralizado con Mobbex
                    </li>
                  </ul>

                  <div className="mt-auto pt-8">
                    <Button
                      className="w-full"
                      variant={plan.code === 'premium' ? 'secondary' : 'default'}
                      onClick={() => handleSubscribe(plan.code)}
                      disabled={checkoutPlan !== null || isCurrentPlan}
                    >
                      {checkoutPlan === plan.code ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Abriendo checkout...
                        </>
                      ) : isCurrentPlan ? (
                        'Plan actual'
                      ) : (
                        <>
                          {primaryCta}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-950">
              Resumen operativo
            </CardTitle>
            <CardDescription>
              Lo que ve el admin o owner antes de iniciar el checkout.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-950">Organizacion</p>
              <p>{summary.organization.name}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-950">Plan actual</p>
              <p>{summary.snapshot.planCode}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-950">Estado de pago</p>
              <p>{summary.snapshot.subscriptionStatus}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-950">CTA principal</p>
              <p>{primaryCta}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
