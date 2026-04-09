'use client';

import { PageHeader } from '@/components/design-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type {
  CreateRevisionScheduleDTO,
  RevisionEstado,
  RevisionFrequencia,
  RevisionModulo,
  RevisionSchedule,
} from '@/types/revisionSchedule';
import { AlertCircle, CalendarClock, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const MODULO_OPTIONS: Array<{ value: RevisionModulo; label: string }> = [
  { value: 'auditoria_interna', label: 'Auditoría interna' },
  { value: 'revision_direccion', label: 'Revisión por la dirección' },
  { value: 'revision_procesos', label: 'Revisión de procesos' },
  { value: 'revision_indicadores', label: 'Revisión de indicadores' },
  { value: 'revision_objetivos', label: 'Revisión de objetivos' },
  { value: 'revision_requisitos_legales', label: 'Requisitos legales' },
  { value: 'revision_aspectos_ambientales', label: 'Aspectos ambientales' },
];

const FREQUENCIA_OPTIONS: Array<{ value: RevisionFrequencia; label: string }> = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

const ESTADO_META: Record<
  RevisionEstado,
  { label: string; className: string }
> = {
  pendiente: {
    label: 'Pendiente',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  vencida: {
    label: 'Vencida',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  en_progreso: {
    label: 'En progreso',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  completada: {
    label: 'Completada',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

type FormState = {
  modulo: RevisionModulo;
  titulo: string;
  frecuencia: RevisionFrequencia;
  proxima_fecha: string;
  responsable_nombre: string;
  notificar_dias_antes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultForm(): FormState {
  return {
    modulo: 'auditoria_interna',
    titulo: '',
    frecuencia: 'mensual',
    proxima_fecha: getTodayIsoDate(),
    responsable_nombre: '',
    notificar_dias_antes: '7',
  };
}

function formatDate(value?: string | null): string {
  if (!value) return 'Sin fecha';

  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function RevisionTableSkeleton() {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <Skeleton className="h-6 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-7 gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function RevisionesProgramadasPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [revisiones, setRevisiones] = useState<RevisionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(getDefaultForm);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOrganizationId(sessionStorage.getItem('organization_id'));
  }, []);

  const fetchRevisiones = async () => {
    if (!user || !organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const token = await user?.getIdToken?.();
      const response = await fetch(
        `/api/revision-schedules?organization_id=${encodeURIComponent(organizationId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }
      );

      const result = (await response.json()) as {
        success?: boolean;
        data?: RevisionSchedule[];
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudieron cargar las revisiones');
      }

      setRevisiones(result.data ?? []);
    } catch (error) {
      console.error('[revisiones-programadas][fetch]', error);
      toast({
        title: 'Error al cargar',
        description:
          error instanceof Error ? error.message : 'No se pudieron obtener las revisiones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void fetchRevisiones();
  }, [authLoading, user, organizationId]);

  const stats = useMemo(() => {
    const now = new Date();

    return {
      total: revisiones.length,
      pendientes: revisiones.filter(item => item.estado === 'pendiente').length,
      vencidas: revisiones.filter(item => item.estado === 'vencida').length,
      completadasMes: revisiones.filter(item => {
        if (item.estado !== 'completada' || !item.ultima_completada) return false;
        const completedAt = new Date(item.ultima_completada);
        return (
          completedAt.getMonth() === now.getMonth() &&
          completedAt.getFullYear() === now.getFullYear()
        );
      }).length,
    };
  }, [revisiones]);

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    const notificar = Number(form.notificar_dias_antes);

    if (!form.titulo.trim()) nextErrors.titulo = 'Ingresá un título';
    if (!form.proxima_fecha) nextErrors.proxima_fecha = 'Seleccioná una fecha';
    if (!form.responsable_nombre.trim()) {
      nextErrors.responsable_nombre = 'Ingresá un responsable';
    }
    if (!Number.isInteger(notificar) || notificar < 1 || notificar > 90) {
      nextErrors.notificar_dias_antes = 'Debe ser un número entre 1 y 90';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!user || !organizationId || !validateForm()) return;

    setSaving(true);

    try {
      const token = await user?.getIdToken?.();
      const payload: CreateRevisionScheduleDTO = {
        modulo: form.modulo,
        titulo: form.titulo.trim(),
        frecuencia: form.frecuencia,
        proxima_fecha: form.proxima_fecha,
        responsable_nombre: form.responsable_nombre.trim(),
        notificar_dias_antes: Number(form.notificar_dias_antes),
      };

      const response = await fetch(
        `/api/revision-schedules?organization_id=${encodeURIComponent(organizationId)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudo crear la revisión');
      }

      setDialogOpen(false);
      setForm(getDefaultForm());
      setErrors({});
      toast({
        title: 'Revisión creada',
        description: 'La revisión periódica fue registrada correctamente.',
      });
      await fetchRevisiones();
    } catch (error) {
      console.error('[revisiones-programadas][create]', error);
      toast({
        title: 'Error al guardar',
        description:
          error instanceof Error ? error.message : 'No se pudo crear la revisión',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (revision: RevisionSchedule) => {
    if (!user || !organizationId) return;

    setProcessingId(revision.id);

    try {
      const token = await user?.getIdToken?.();
      const response = await fetch(
        `/api/revision-schedules/${revision.id}?organization_id=${encodeURIComponent(organizationId)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ estado: 'completada' satisfies RevisionEstado }),
        }
      );

      const result = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudo completar la revisión');
      }

      toast({
        title: 'Revisión completada',
        description: 'Se registró la completación y se programó la siguiente fecha.',
      });
      await fetchRevisiones();
    } catch (error) {
      console.error('[revisiones-programadas][complete]', error);
      toast({
        title: 'Error al completar',
        description:
          error instanceof Error ? error.message : 'No se pudo completar la revisión',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (revision: RevisionSchedule) => {
    if (!user || !organizationId) return;
    if (!window.confirm(`Eliminar la revisión "${revision.titulo}"?`)) return;

    setProcessingId(revision.id);

    try {
      const token = await user?.getIdToken?.();
      const response = await fetch(
        `/api/revision-schedules/${revision.id}?organization_id=${encodeURIComponent(organizationId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudo eliminar la revisión');
      }

      toast({
        title: 'Revisión eliminada',
        description: 'La revisión fue removida del calendario.',
      });
      await fetchRevisiones();
    } catch (error) {
      console.error('[revisiones-programadas][delete]', error);
      toast({
        title: 'Error al eliminar',
        description:
          error instanceof Error ? error.message : 'No se pudo eliminar la revisión',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const canOpenDialog = Boolean(user && organizationId);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Revisiones Periódicas"
          description="Calendario de revisiones programadas del sistema de gestión"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Revisiones programadas' },
          ]}
          actions={
            <Button onClick={() => setDialogOpen(true)} disabled={!canOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Revisión
            </Button>
          }
        />

        {!organizationId && !authLoading && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 p-6">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-medium text-amber-900">Falta contexto de organización</p>
                <p className="text-sm text-amber-800">
                  No se encontró `organization_id` en la sesión. Volvé a ingresar a la
                  organización antes de gestionar revisiones.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-200">
            <CardContent className="flex items-center gap-3 p-5">
              <CalendarClock className="h-8 w-8 text-slate-500" />
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-3xl font-semibold text-slate-900">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex items-center gap-3 p-5">
              <CalendarClock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-700">Pendientes</p>
                <p className="text-3xl font-semibold text-blue-900">{stats.pendientes}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 p-5">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-red-700">Vencidas</p>
                <p className="text-3xl font-semibold text-red-900">{stats.vencidas}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex items-center gap-3 p-5">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-emerald-700">Completadas este mes</p>
                <p className="text-3xl font-semibold text-emerald-900">{stats.completadasMes}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <RevisionTableSkeleton />
        ) : revisiones.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <CalendarClock className="h-12 w-12 text-slate-300" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  No hay revisiones programadas
                </h2>
                <p className="max-w-xl text-sm text-slate-500">
                  Creá la primera revisión para empezar a controlar vencimientos,
                  responsables y próximas fechas del sistema de gestión.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} disabled={!canOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primera revisión
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Próximas revisiones</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Frecuencia</TableHead>
                    <TableHead>Próxima fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisiones.map(revision => {
                    const overduePending =
                      revision.proxima_fecha < getTodayIsoDate() &&
                      revision.estado === 'pendiente';
                    const disabledActions =
                      processingId === revision.id || revision.estado === 'completada';

                    return (
                      <TableRow
                        key={revision.id}
                        className={overduePending ? 'bg-red-50/80 hover:bg-red-100/60' : undefined}
                      >
                        <TableCell className="font-medium text-slate-700">
                          {MODULO_OPTIONS.find(item => item.value === revision.modulo)?.label ??
                            revision.modulo}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900">{revision.titulo}</div>
                          {revision.ultima_completada && (
                            <div className="text-xs text-slate-500">
                              Última: {formatDate(revision.ultima_completada)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {FREQUENCIA_OPTIONS.find(item => item.value === revision.frecuencia)
                            ?.label ?? revision.frecuencia}
                        </TableCell>
                        <TableCell>{formatDate(revision.proxima_fecha)}</TableCell>
                        <TableCell>
                          <Badge className={ESTADO_META[revision.estado].className}>
                            {ESTADO_META[revision.estado].label}
                          </Badge>
                        </TableCell>
                        <TableCell>{revision.responsable_nombre || 'Sin asignar'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={disabledActions}
                              onClick={() => void handleComplete(revision)}
                            >
                              Completar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              disabled={processingId === revision.id}
                              onClick={() => void handleDelete(revision)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nueva Revisión</DialogTitle>
            <DialogDescription>
              Definí el módulo, frecuencia y responsable para agregar una nueva revisión al
              calendario.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="modulo">Módulo</Label>
              <Select
                value={form.modulo}
                onValueChange={value => {
                  setForm(current => ({ ...current, modulo: value as RevisionModulo }));
                }}
              >
                <SelectTrigger id="modulo">
                  <SelectValue placeholder="Seleccionar módulo" />
                </SelectTrigger>
                <SelectContent>
                  {MODULO_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={event => setForm(current => ({ ...current, titulo: event.target.value }))}
                placeholder="Ej. Revisión trimestral de indicadores"
              />
              {errors.titulo && <p className="text-sm text-red-600">{errors.titulo}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="frecuencia">Frecuencia</Label>
                <Select
                  value={form.frecuencia}
                  onValueChange={value => {
                    setForm(current => ({
                      ...current,
                      frecuencia: value as RevisionFrequencia,
                    }));
                  }}
                >
                  <SelectTrigger id="frecuencia">
                    <SelectValue placeholder="Seleccionar frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIA_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="proxima_fecha">Próxima fecha</Label>
                <Input
                  id="proxima_fecha"
                  type="date"
                  value={form.proxima_fecha}
                  onChange={event =>
                    setForm(current => ({ ...current, proxima_fecha: event.target.value }))
                  }
                />
                {errors.proxima_fecha && (
                  <p className="text-sm text-red-600">{errors.proxima_fecha}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="responsable_nombre">Responsable</Label>
                <Input
                  id="responsable_nombre"
                  value={form.responsable_nombre}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      responsable_nombre: event.target.value,
                    }))
                  }
                  placeholder="Nombre y apellido"
                />
                {errors.responsable_nombre && (
                  <p className="text-sm text-red-600">{errors.responsable_nombre}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notificar_dias_antes">Notificar días antes</Label>
                <Input
                  id="notificar_dias_antes"
                  type="number"
                  min={1}
                  max={90}
                  value={form.notificar_dias_antes}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      notificar_dias_antes: event.target.value,
                    }))
                  }
                />
                {errors.notificar_dias_antes && (
                  <p className="text-sm text-red-600">{errors.notificar_dias_antes}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setErrors({});
                setForm(getDefaultForm());
              }}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving || !canOpenDialog}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
