'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CircleDot,
  Clock3,
  RefreshCcw,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type EstadoExpediente =
  | 'recibido'
  | 'admitido'
  | 'en_analisis'
  | 'derivado'
  | 'observado'
  | 'resuelto'
  | 'archivado';

type PrioridadExpediente = 'baja' | 'media' | 'alta' | 'urgente';

type ExpedienteDetail = {
  id: string;
  numero: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  ciudadano_id?: string;
  ciudadano_nombre?: string;
  estado: EstadoExpediente;
  prioridad: PrioridadExpediente;
  area_responsable_id?: string;
  area_responsable_nombre?: string;
  canal_ingreso: 'presencial' | 'whatsapp' | 'web' | 'telefono' | 'email';
  fecha_vencimiento?: string | null;
  sla_horas?: number;
  historial: Array<{
    estado: EstadoExpediente;
    fecha: string | null;
    comentario?: string;
    responsable_nombre?: string;
  }>;
  created_at?: string | null;
  updated_at?: string | null;
};

const ESTADOS: Array<{
  value: EstadoExpediente;
  label: string;
  badgeClassName: string;
}> = [
  { value: 'recibido', label: 'Recibido', badgeClassName: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'admitido', label: 'Admitido', badgeClassName: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'en_analisis', label: 'En analisis', badgeClassName: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'derivado', label: 'Derivado', badgeClassName: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'observado', label: 'Observado', badgeClassName: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'resuelto', label: 'Resuelto', badgeClassName: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'archivado', label: 'Archivado', badgeClassName: 'bg-zinc-200 text-zinc-800 border-zinc-300' },
];

const PRIORIDADES: Array<{
  value: PrioridadExpediente;
  label: string;
  className: string;
}> = [
  { value: 'baja', label: 'Baja', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'media', label: 'Media', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'alta', label: 'Alta', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'urgente', label: 'Urgente', className: 'bg-rose-100 text-rose-700 border-rose-200' },
];

const CANAL_LABELS: Record<ExpedienteDetail['canal_ingreso'], string> = {
  presencial: 'Presencial',
  whatsapp: 'WhatsApp',
  web: 'Web',
  telefono: 'Telefono',
  email: 'Email',
};

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEstadoMeta(value: EstadoExpediente) {
  return ESTADOS.find(item => item.value === value) || ESTADOS[0];
}

function getPrioridadMeta(value: PrioridadExpediente) {
  return PRIORIDADES.find(item => item.value === value) || PRIORIDADES[0];
}

function getSlaStatus(value?: string | null) {
  if (!value) {
    return {
      label: 'Sin SLA configurado',
      dotClassName: 'bg-slate-400',
      textClassName: 'text-slate-600',
    };
  }

  const target = new Date(value).getTime();
  if (Number.isNaN(target)) {
    return {
      label: 'SLA invalido',
      dotClassName: 'bg-slate-400',
      textClassName: 'text-slate-600',
    };
  }

  const diffDays = Math.ceil((target - Date.now()) / 86400000);
  if (diffDays < 0) {
    return {
      label: `Vencido hace ${Math.abs(diffDays)} dia${Math.abs(diffDays) === 1 ? '' : 's'}`,
      dotClassName: 'bg-rose-500',
      textClassName: 'text-rose-700',
    };
  }
  if (diffDays <= 2) {
    return {
      label: diffDays === 0 ? 'Vence hoy' : `Vence en ${diffDays} dias`,
      dotClassName: 'bg-amber-500',
      textClassName: 'text-amber-700',
    };
  }
  return {
    label: `En plazo (${diffDays} dias)`,
    dotClassName: 'bg-emerald-500',
    textClassName: 'text-emerald-700',
  };
}

export default function ExpedienteDetailPage() {
  const params = useParams<{ id: string }>();
  const expedienteId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { toast } = useToast();

  const [expediente, setExpediente] = useState<ExpedienteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextEstado, setNextEstado] = useState<EstadoExpediente>('recibido');
  const [comentario, setComentario] = useState('');

  const historialOrdenado = useMemo(
    () =>
      [...(expediente?.historial || [])].sort((a, b) => {
        const left = a.fecha ? new Date(a.fecha).getTime() : 0;
        const right = b.fecha ? new Date(b.fecha).getTime() : 0;
        return right - left;
      }),
    [expediente?.historial]
  );

  const slaStatus = getSlaStatus(expediente?.fecha_vencimiento);

  async function loadExpediente() {
    if (!expedienteId) {
      setError('No se indico un expediente valido.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/expedientes/${expedienteId}`, {
        cache: 'no-store',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo cargar el expediente');
      }
      setExpediente(json.data);
      setNextEstado(json.data.estado);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el expediente');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExpediente();
  }, [expedienteId]);

  async function handleChangeEstado() {
    if (!expedienteId) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/expedientes/${expedienteId}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nextEstado,
          comentario: comentario.trim() || undefined,
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo cambiar el estado');
      }

      setExpediente(json.data);
      setComentario('');
      setIsModalOpen(false);
      toast({
        title: 'Estado actualizado',
        description: `El expediente ahora esta en ${getEstadoMeta(nextEstado).label}.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo cambiar el estado';
      setError(message);
      toast({
        title: 'Error al cambiar estado',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center text-slate-500">
          Cargando expediente...
        </div>
      </div>
    );
  }

  if (!expediente) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Link href="/expedientes" className="inline-flex items-center text-sm font-medium text-sky-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a expedientes
          </Link>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-rose-700">
            {error || 'No se encontro el expediente.'}
          </div>
        </div>
      </div>
    );
  }

  const estado = getEstadoMeta(expediente.estado);
  const prioridad = getPrioridadMeta(expediente.prioridad);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/expedientes" className="inline-flex items-center text-sm font-medium text-sky-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a expedientes
          </Link>

          <Button variant="outline" onClick={() => void loadExpediente()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <Card className="border-slate-200">
          <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                {expediente.numero}
              </p>
              <div>
                <CardTitle className="text-3xl text-slate-900">{expediente.titulo}</CardTitle>
                <CardDescription className="mt-2 text-sm text-slate-600">
                  {expediente.descripcion}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('border', estado.badgeClassName)}>{estado.label}</Badge>
              <Badge className={cn('border', prioridad.className)}>{prioridad.label}</Badge>
              <Button onClick={() => setIsModalOpen(true)}>Cambiar estado</Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Informacion general</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{expediente.tipo}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Canal</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {CANAL_LABELS[expediente.canal_ingreso]}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ciudadano</p>
                  {expediente.ciudadano_id ? (
                    <Link href={`/ciudadanos/${expediente.ciudadano_id}`} className="mt-2 inline-flex items-center text-sm font-medium text-sky-700">
                      <UserRound className="mr-2 h-4 w-4" />
                      {expediente.ciudadano_nombre || expediente.ciudadano_id}
                    </Link>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">Sin ciudadano vinculado</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Area responsable</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {expediente.area_responsable_nombre || 'No asignada'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ultima actualizacion</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {formatDateTime(expediente.updated_at)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Historial de estados</CardTitle>
                <CardDescription>
                  Timeline de transiciones con responsable y comentario.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historialOrdenado.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                    No hay movimientos registrados.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {historialOrdenado.map((entry, index) => {
                      const historialEstado = getEstadoMeta(entry.estado);
                      return (
                        <div key={`${entry.estado}-${entry.fecha}-${index}`} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="rounded-full border border-slate-200 bg-white p-2">
                              <CircleDot className="h-4 w-4 text-sky-600" />
                            </div>
                            {index < historialOrdenado.length - 1 && (
                              <div className="mt-2 h-full w-px bg-slate-200" />
                            )}
                          </div>

                          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={cn('border', historialEstado.badgeClassName)}>
                                {historialEstado.label}
                              </Badge>
                              <span className="text-sm text-slate-500">
                                {formatDateTime(entry.fecha)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">
                              Responsable: {entry.responsable_nombre || 'No informado'}
                            </p>
                            <p className="mt-2 text-sm text-slate-600">
                              {entry.comentario || 'Sin comentario asociado.'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">SLA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className={cn('h-3 w-3 rounded-full', slaStatus.dotClassName)} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Fecha de vencimiento</p>
                    <p className={cn('text-sm', slaStatus.textClassName)}>
                      {expediente.fecha_vencimiento
                        ? formatDateTime(expediente.fecha_vencimiento)
                        : 'Sin fecha definida'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Clock3 className="h-4 w-4 text-slate-500" />
                    <span>{slaStatus.label}</span>
                  </div>
                  <p className="mt-2 text-slate-600">
                    SLA configurado: {expediente.sla_horas ? `${expediente.sla_horas} horas` : 'No informado'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  <span>Creado: {formatDateTime(expediente.created_at)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-slate-500" />
                  <span>
                    Prioridad actual: <strong>{prioridad.label}</strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cambiar estado</DialogTitle>
            <DialogDescription>
              Registra una nueva transicion para el expediente {expediente.numero}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Nuevo estado</label>
              <Select value={nextEstado} onValueChange={value => setNextEstado(value as EstadoExpediente)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Comentario</label>
              <Textarea
                value={comentario}
                onChange={event => setComentario(event.target.value)}
                placeholder="Motivo del cambio o contexto adicional"
                className="min-h-[120px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleChangeEstado()} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
