'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/api/authFetch';
import type { GovCiudadano } from '@/types/gov-ciudadano';
import {
  GovExpedienteCreateSchema,
  type GovExpedienteCreateInput,
  type PrioridadExpediente,
  type TipoExpediente,
} from '@/types/gov-expediente';
import { ArrowLeft, FolderOpen, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

type ExpedienteCreateValues = z.input<typeof GovExpedienteCreateSchema>;

type CiudadanosResponse = {
  success?: boolean;
  data?: GovCiudadano[];
  error?: string;
};

type ExpedienteCreateResponse = {
  success?: boolean;
  data?: { id: string };
  error?: string;
};

const TIPOS: Array<{ value: TipoExpediente; label: string }> = [
  { value: 'reclamo', label: 'Reclamo' },
  { value: 'solicitud', label: 'Solicitud' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'denuncia', label: 'Denuncia' },
  { value: 'otro', label: 'Otro' },
];

const PRIORIDADES: Array<{ value: PrioridadExpediente; label: string }> = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

export default function GobiernoNuevoExpedientePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCiudadanoId = searchParams.get('ciudadano_id') || '';
  const [ciudadanos, setCiudadanos] = useState<GovCiudadano[]>([]);
  const [loadingCiudadanos, setLoadingCiudadanos] = useState(true);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ExpedienteCreateValues>({
    resolver: zodResolver(GovExpedienteCreateSchema),
    defaultValues: {
      tipo: 'solicitud',
      asunto: '',
      descripcion: '',
      ciudadano_id: defaultCiudadanoId,
      prioridad: 'media',
      area_responsable: '',
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCiudadanos() {
      try {
        setLoadingCiudadanos(true);
        const response = await authFetch('/api/gobierno/ciudadanos?limit=50', {
          cache: 'no-store',
        });
        const json = (await response.json()) as CiudadanosResponse;

        if (!response.ok || !json.success) {
          throw new Error(json.error || 'No se pudieron cargar los ciudadanos');
        }

        if (!cancelled) {
          const data = Array.isArray(json.data) ? json.data : [];
          setCiudadanos(data);
          if (defaultCiudadanoId && !data.some(item => item.id === defaultCiudadanoId)) {
            setValue('ciudadano_id', '');
          }
        }
      } catch (fetchError) {
        if (!cancelled) {
          setCiudadanos([]);
          setError('root', {
            message:
              fetchError instanceof Error
                ? fetchError.message
                : 'No se pudieron cargar los ciudadanos',
          });
        }
      } finally {
        if (!cancelled) setLoadingCiudadanos(false);
      }
    }

    void loadCiudadanos();

    return () => {
      cancelled = true;
    };
  }, [defaultCiudadanoId, setError, setValue]);

  const ciudadanoSeleccionadoId = watch('ciudadano_id');
  const ciudadanoSeleccionado = useMemo(
    () => ciudadanos.find(ciudadano => ciudadano.id === ciudadanoSeleccionadoId),
    [ciudadanoSeleccionadoId, ciudadanos]
  );

  const onSubmit = async (values: ExpedienteCreateValues) => {
    try {
      const payload: GovExpedienteCreateInput = {
        tipo: values.tipo,
        asunto: values.asunto,
        descripcion: values.descripcion,
        ciudadano_id: values.ciudadano_id || undefined,
        prioridad: values.prioridad ?? 'media',
        area_responsable: values.area_responsable || undefined,
      };

      const response = await authFetch('/api/gobierno/expedientes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as ExpedienteCreateResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo crear el expediente');
      }

      router.push(`/gobierno/expedientes/${json.data.id}`);
    } catch (submitError) {
      setError('root', {
        message:
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo crear el expediente',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge className="border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
                <FolderOpen className="mr-1 h-3.5 w-3.5" />
                Expedientes
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Nuevo expediente
                </h1>
                <p className="text-sm leading-6 text-slate-600">
                  Registra un nuevo expediente y vincula, si corresponde, al ciudadano asociado.
                </p>
              </div>
            </div>

            <Link href="/gobierno/expedientes">
              <Button variant="outline" className="border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#eff6ff]">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al listado
              </Button>
            </Link>
          </div>
        </section>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">Formulario de expediente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Controller
                    control={control}
                    name="tipo"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="border-slate-200"><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                        <SelectContent>
                          {TIPOS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tipo ? <p className="text-sm text-rose-600">{errors.tipo.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Controller
                    control={control}
                    name="prioridad"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="border-slate-200"><SelectValue placeholder="Selecciona prioridad" /></SelectTrigger>
                        <SelectContent>
                          {PRIORIDADES.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.prioridad ? <p className="text-sm text-rose-600">{errors.prioridad.message}</p> : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="asunto">Asunto</Label>
                  <Input id="asunto" {...register('asunto')} className="border-slate-200 focus-visible:ring-[#2563eb]" />
                  {errors.asunto ? <p className="text-sm text-rose-600">{errors.asunto.message}</p> : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descripcion">Descripcion</Label>
                  <Textarea id="descripcion" {...register('descripcion')} className="min-h-[140px] border-slate-200 focus-visible:ring-[#2563eb]" />
                  {errors.descripcion ? <p className="text-sm text-rose-600">{errors.descripcion.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Ciudadano vinculado</Label>
                  <Controller
                    control={control}
                    name="ciudadano_id"
                    render={({ field }) => (
                      <Select
                        value={field.value || 'sin-ciudadano'}
                        onValueChange={value => field.onChange(value === 'sin-ciudadano' ? '' : value)}
                        disabled={loadingCiudadanos}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue placeholder={loadingCiudadanos ? 'Cargando ciudadanos...' : 'Selecciona un ciudadano'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sin-ciudadano">Sin ciudadano</SelectItem>
                          {ciudadanos.map(ciudadano => (
                            <SelectItem key={ciudadano.id} value={ciudadano.id}>
                              {ciudadano.nombre} {ciudadano.apellido} - DNI {ciudadano.dni}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {ciudadanoSeleccionado ? (
                    <p className="text-xs text-slate-500">
                      Seleccionado: {ciudadanoSeleccionado.nombre} {ciudadanoSeleccionado.apellido}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area_responsable">Area responsable</Label>
                  <Input id="area_responsable" {...register('area_responsable')} className="border-slate-200 focus-visible:ring-[#2563eb]" />
                  {errors.area_responsable ? <p className="text-sm text-rose-600">{errors.area_responsable.message}</p> : null}
                </div>
              </div>

              {errors.root?.message ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errors.root.message}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link href="/gobierno/expedientes">
                  <Button type="button" variant="outline">Cancelar</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting} className="bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Crear expediente
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
