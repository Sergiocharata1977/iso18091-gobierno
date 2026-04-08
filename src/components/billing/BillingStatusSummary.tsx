'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BillingSummarySnapshot } from '@/components/billing/types';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  ShieldAlert,
} from 'lucide-react';

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getPlanLabel(planCode: BillingSummarySnapshot['planCode']): string {
  switch (planCode) {
    case 'trial':
      return 'Trial';
    case 'basic':
      return 'Basico';
    case 'premium':
      return 'Premium';
    default:
      return 'Sin plan';
  }
}

function getAccessStateCopy(snapshot: BillingSummarySnapshot) {
  switch (snapshot.commercialState.accessState) {
    case 'trial':
      return {
        label: 'En trial',
        tone: 'border-sky-200 bg-sky-50 text-sky-700',
        helper: snapshot.trial?.endsAt
          ? `Prueba activa hasta ${formatDate(snapshot.trial.endsAt)}`
          : 'Prueba activa',
        icon: Clock3,
      };
    case 'active':
      return {
        label: 'Activa',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        helper: snapshot.currentPeriodEnd
          ? `Renueva el ${formatDate(snapshot.currentPeriodEnd)}`
          : 'Suscripcion al dia',
        icon: CheckCircle2,
      };
    case 'grace_period':
      return {
        label: 'En gracia',
        tone: 'border-amber-200 bg-amber-50 text-amber-700',
        helper: snapshot.commercialState.graceUntil
          ? `Regulariza antes del ${formatDate(snapshot.commercialState.graceUntil)}`
          : 'Pago pendiente',
        icon: AlertTriangle,
      };
    case 'canceled':
      return {
        label: 'Cancelada',
        tone: 'border-slate-200 bg-slate-50 text-slate-700',
        helper: snapshot.commercialState.accessEndsAt
          ? `Con acceso hasta ${formatDate(snapshot.commercialState.accessEndsAt)}`
          : 'Sin renovacion automatica',
        icon: CalendarClock,
      };
    default:
      return {
        label: 'Bloqueada',
        tone: 'border-rose-200 bg-rose-50 text-rose-700',
        helper: snapshot.commercialState.lockedReason === 'payment_required'
          ? 'Se requiere pago para recuperar acceso'
          : 'No hay una suscripcion activa',
        icon: ShieldAlert,
      };
  }
}

export function BillingStatusSummary({
  snapshot,
}: {
  snapshot: BillingSummarySnapshot;
}) {
  const accessCopy = getAccessStateCopy(snapshot);
  const AccessIcon = accessCopy.icon;
  const paymentLabel =
    snapshot.subscriptionStatus === 'past_due'
      ? 'Pago pendiente'
      : snapshot.subscriptionStatus === 'active'
        ? 'Pago al dia'
        : snapshot.subscriptionStatus === 'canceled'
          ? 'Cancelada'
          : snapshot.subscriptionStatus === 'trialing'
            ? 'Trial'
            : 'Sin cargo';

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <AccessIcon className="h-4 w-4" />
            Estado comercial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="outline" className={accessCopy.tone}>
            {accessCopy.label}
          </Badge>
          <p className="text-sm text-slate-600">{accessCopy.helper}</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <CreditCard className="h-4 w-4" />
            Plan actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold text-slate-950">
            {getPlanLabel(snapshot.planCode)}
          </p>
          <p className="text-sm text-slate-600">
            Fuente: {snapshot.source === 'legacy_user' ? 'Legado' : 'Organizacion'}
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <CalendarClock className="h-4 w-4" />
            Renovacion o vencimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold text-slate-950">
            {formatDate(
              snapshot.currentPeriodEnd ||
                snapshot.trial?.endsAt ||
                snapshot.commercialState.accessEndsAt
            )}
          </p>
          <p className="text-sm text-slate-600">
            Estado de pago: {paymentLabel}
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <CheckCircle2 className="h-4 w-4" />
            Ultimo pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold text-slate-950">
            {formatDate(snapshot.lastPaymentAt)}
          </p>
          <p className="text-sm text-slate-600">
            {snapshot.lastPaymentError || 'Sin incidencias reportadas'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
