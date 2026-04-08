'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { WhatsAppJobListItem } from '@/components/rrhh/WhatsAppJobsTable';

interface WhatsAppJobDetailProps {
  open: boolean;
  job: WhatsAppJobListItem | null;
  retrying: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: (jobId: string) => void;
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-AR');
}

function getStatusBadgeClass(status: WhatsAppJobListItem['status']): string {
  if (status === 'pending') return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
  if (status === 'processing') return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
  return 'bg-red-100 text-red-800 hover:bg-red-100';
}

function buildTimeline(job: WhatsAppJobListItem): Array<{ label: string; date: string | null }> {
  const timeline: Array<{ label: string; date: string | null }> = [
    { label: 'Creado', date: job.created_at },
  ];

  if (job.started_at) timeline.push({ label: 'Inicio de procesamiento', date: job.started_at });
  if (job.updated_at) timeline.push({ label: 'Ultima actualizacion', date: job.updated_at });
  if (job.completed_at) timeline.push({ label: 'Finalizado', date: job.completed_at });

  return timeline;
}

export function WhatsAppJobDetail({
  open,
  job,
  retrying,
  onOpenChange,
  onRetry,
}: WhatsAppJobDetailProps) {
  if (!job) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Detalle de job</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const timeline = buildTimeline(job);
  const messageSent =
    job.message_sent ||
    (typeof job.payload.message === 'string' ? job.payload.message : null) ||
    (typeof job.payload.body === 'string' ? job.payload.body : null) ||
    'No disponible';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Job {job.id}
            <Badge className={getStatusBadgeClass(job.status)}>{job.status}</Badge>
          </SheetTitle>
          <SheetDescription>
            {job.intent === 'task.assign' ? 'Asignacion de tarea' : 'Recordatorio de tarea'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Empleado</h3>
            <div className="rounded-md border p-3 text-sm">
              <p>Telefono: {job.employee_phone || '-'}</p>
              <p>Nombre: {job.employee_name || 'No disponible'}</p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Mensaje enviado</h3>
            <div className="rounded-md border bg-slate-50 p-3 text-sm">
              {messageSent}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Respuesta del empleado</h3>
            {job.employee_response ? (
              <div className="rounded-md border p-3 text-sm space-y-1">
                <p>{job.employee_response.message}</p>
                <p className="text-xs text-muted-foreground">
                  Intent detectado: {job.employee_response.detected_intent}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fecha: {formatDate(job.employee_response.created_at)}
                </p>
              </div>
            ) : (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Sin respuesta vinculada.
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Timeline del job</h3>
            <div className="rounded-md border p-3">
              <ul className="space-y-2 text-sm">
                {timeline.map(item => (
                  <li key={item.label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span>{formatDate(item.date)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {Boolean(job.error) && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-red-700">Error</h3>
              <pre className="rounded-md border border-red-200 bg-red-50 p-3 text-xs whitespace-pre-wrap break-all text-red-800">
                {JSON.stringify(job.error, null, 2)}
              </pre>
            </section>
          )}

          {job.status === 'failed' && (
            <div className="pt-2">
              <Button
                variant="destructive"
                disabled={retrying}
                onClick={() => onRetry(job.id)}
              >
                {retrying ? 'Reintentando...' : 'Reintentar'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
