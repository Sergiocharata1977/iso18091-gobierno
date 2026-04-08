'use client';

import { OpportunitySubflowBadge } from '@/components/crm/OpportunitySubflowBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CreditWorkflowProjection } from '@/types/crm-credit-workflow';
import { ArrowRight, CalendarClock, ShieldCheck, UserRound } from 'lucide-react';

interface OpportunityCreditPanelCardProps {
  creditWorkflow?: CreditWorkflowProjection;
  assignedTo?: string;
  stageOriginName?: string;
  openedAt?: string;
  slaDueAt?: string;
  capabilityEnabled: boolean;
  capabilityMessage?: string | null;
  onOpen: () => void;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value?: number) {
  if (!value) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function OpportunityCreditPanelCard({
  creditWorkflow,
  assignedTo,
  stageOriginName,
  openedAt,
  slaDueAt,
  capabilityEnabled,
  capabilityMessage,
  onOpen,
}: OpportunityCreditPanelCardProps) {
  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <ShieldCheck className="h-4 w-4 text-violet-600" />
              Subproceso crediticio
            </CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Estado operativo del analisis de riesgo dentro de la oportunidad.
            </p>
          </div>
          <OpportunitySubflowBadge creditWorkflow={creditWorkflow} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!capabilityEnabled ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {capabilityMessage || 'La operatoria de scoring no esta habilitada para esta organizacion.'}
          </div>
        ) : creditWorkflow ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-white/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Responsable
                </p>
                <p className="mt-2 flex items-center gap-2 font-medium text-slate-900">
                  <UserRound className="h-4 w-4 text-violet-500" />
                  {assignedTo || 'Sin asignar'}
                </p>
              </div>
              <div className="rounded-xl border bg-white/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Etapa origen
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  {stageOriginName || '-'}
                </p>
              </div>
              <div className="rounded-xl border bg-white/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Apertura
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  {formatDate(openedAt)}
                </p>
              </div>
              <div className="rounded-xl border bg-white/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  SLA / limite
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  {slaDueAt ? formatDate(slaDueAt) : formatCurrency(creditWorkflow.limite_credito)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-violet-100 bg-white/80 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Seguimiento contextual de credito
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Abri el panel lateral para mover estado, cerrar el analisis o saltar al scoring vigente.
                </p>
              </div>
              <Button onClick={onOpen} className="bg-violet-600 hover:bg-violet-700">
                Abrir analisis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600">
            La oportunidad todavia no tiene un workflow crediticio activo.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
