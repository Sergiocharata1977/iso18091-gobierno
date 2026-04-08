'use client';

import { OpportunitySubflowBadge } from '@/components/crm/OpportunitySubflowBadge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  CreditWorkflow,
  CreditWorkflowResolution,
  CreditWorkflowStatus,
} from '@/types/crm-credit-workflow';
import type { OportunidadCRM } from '@/types/crm-oportunidad';
import { ArrowUpRight, CalendarClock, ExternalLink, Loader2, ShieldCheck, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CreditWorkflowCanvasProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: CreditWorkflow | null;
  opportunity: OportunidadCRM;
  organizationId: string;
  capabilityEnabled: boolean;
  capabilityMessage?: string | null;
  onUpdated?: (workflow: CreditWorkflow) => void;
}

const STATUS_OPTIONS: Array<{ value: CreditWorkflowStatus; label: string }> = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_analisis', label: 'En analisis' },
  { value: 'documentacion_pendiente', label: 'Documentacion pendiente' },
  { value: 'comite', label: 'Comite' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'cerrado', label: 'Cerrado' },
];

const RESOLUTION_OPTIONS: Array<{
  value: CreditWorkflowResolution;
  label: string;
}> = [
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'condicional', label: 'Condicional' },
];

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

async function parseResponse(response: Response) {
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'No se pudo actualizar el workflow');
  }

  return payload.data as CreditWorkflow;
}

export function CreditWorkflowCanvas({
  open,
  onOpenChange,
  workflow,
  opportunity,
  organizationId,
  capabilityEnabled,
  capabilityMessage,
  onUpdated,
}: CreditWorkflowCanvasProps) {
  const [status, setStatus] = useState<CreditWorkflowStatus>('pendiente');
  const [resolution, setResolution] = useState<string>('none');
  const [notes, setNotes] = useState('');
  const [savingMove, setSavingMove] = useState(false);
  const [savingClose, setSavingClose] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflow) {
      setStatus('pendiente');
      setResolution('none');
      setNotes('');
      setError(null);
      return;
    }

    setStatus(workflow.status);
    setResolution(workflow.resolution || 'none');
    setNotes(workflow.notes || '');
    setError(null);
  }, [workflow]);

  const handleMove = async () => {
    if (!workflow) return;
    try {
      setSavingMove(true);
      setError(null);
      const updated = await parseResponse(
        await fetch(`/api/crm/credit-workflows/${workflow.id}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            resolution: resolution === 'none' ? undefined : resolution,
            notes: notes || undefined,
          }),
        })
      );
      onUpdated?.(updated);
    } catch (moveError) {
      setError(
        moveError instanceof Error
          ? moveError.message
          : 'No se pudo mover el workflow'
      );
    } finally {
      setSavingMove(false);
    }
  };

  const handleClose = async () => {
    if (!workflow) return;
    try {
      setSavingClose(true);
      setError(null);
      const updated = await parseResponse(
        await fetch(`/api/crm/credit-workflows/${workflow.id}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resolution: resolution === 'none' ? undefined : resolution,
            notes: notes || undefined,
          }),
        })
      );
      onUpdated?.(updated);
    } catch (closeError) {
      setError(
        closeError instanceof Error
          ? closeError.message
          : 'No se pudo cerrar el workflow'
      );
    } finally {
      setSavingClose(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-violet-600" />
            Workflow crediticio
          </SheetTitle>
          <SheetDescription>
            Segui el subproceso sin salir del CRM de oportunidades.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Oportunidad
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {opportunity.nombre}
                </h3>
                <p className="text-sm text-slate-600">
                  {opportunity.organizacion_nombre}
                </p>
              </div>
              <OpportunitySubflowBadge creditWorkflow={opportunity.subprocesos?.crediticio} compact />
            </div>
          </div>

          {!capabilityEnabled ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              {capabilityMessage || 'La capability de scoring no esta habilitada.'}
            </div>
          ) : !workflow ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No hay workflow cargado para esta oportunidad.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Estado actual
                  </p>
                  <div className="mt-2">
                    <OpportunitySubflowBadge
                      creditWorkflow={opportunity.subprocesos?.crediticio}
                    />
                  </div>
                </div>
                <div className="rounded-xl border p-4 text-sm text-slate-700">
                  <p className="mb-2 flex items-center gap-2 font-medium text-slate-900">
                    <CalendarClock className="h-4 w-4 text-violet-500" />
                    Tiempos del proceso
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between gap-3">
                      <span>Apertura</span>
                      <span>{formatDate(workflow.opened_at)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Actualizacion</span>
                      <span>{formatDate(workflow.updated_at)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>SLA</span>
                      <span>{formatDate(workflow.sla_due_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                  <p className="font-medium text-slate-900">
                    Operar workflow
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">Estado</p>
                    <Select value={status} onValueChange={value => setStatus(value as CreditWorkflowStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Resolucion
                    </p>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin resolucion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin resolucion</SelectItem>
                        {RESOLUTION_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-slate-700">Notas</p>
                  <Textarea
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    placeholder="Observaciones operativas del analisis..."
                    rows={5}
                  />
                </div>
                {error && (
                  <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={handleMove}
                    disabled={savingMove || savingClose}
                  >
                    {savingMove && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar estado
                  </Button>
                  <Button
                    onClick={handleClose}
                    disabled={savingMove || savingClose}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    {savingClose && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cerrar analisis
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Continuar en superficies relacionadas
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/crm/clientes/${opportunity.crm_organizacion_id}`}
                    className="inline-flex"
                  >
                    <Button variant="outline" className="w-full sm:w-auto">
                      Ver cliente y scoring
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  {workflow.evaluacion_id_vigente && (
                    <Link
                      href={`/crm/clientes/${opportunity.crm_organizacion_id}`}
                      className="inline-flex"
                    >
                      <Button variant="ghost" className="w-full sm:w-auto">
                        Abrir evaluacion vigente
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Scope organizacional: {organizationId}
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
