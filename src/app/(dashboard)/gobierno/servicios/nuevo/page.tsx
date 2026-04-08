'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/api/authFetch';
import {
  GovServicioCreateSchema,
  type GovServicioCategoria,
} from '@/types/gov-servicio';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

type ServicioFormValues = z.input<typeof GovServicioCreateSchema>;

const categoriaLabels: Record<GovServicioCategoria, string> = {
  tramite: 'Tramite',
  consulta: 'Consulta',
  habilitacion: 'Habilitacion',
  beneficio: 'Beneficio',
  otro: 'Otro',
};

export default function NuevoServicioPage() {
  const router = useRouter();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ServicioFormValues>({
    resolver: zodResolver(GovServicioCreateSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      area: '',
      sla_dias: 5,
      categoria: 'tramite',
      requisitos: [],
      publico: true,
    },
  });

  const onSubmit = async (values: ServicioFormValues) => {
    try {
      const requisitos = (values.requisitos ?? [])
        .map(item => item.trim())
        .filter(Boolean);

      const response = await authFetch('/api/gobierno/servicios', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          requisitos,
        }),
      });

      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo crear el servicio');
      }

      router.push('/gobierno/servicios');
    } catch (submitError) {
      setError('root', {
        message:
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo crear el servicio',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <PageHeader
          eyebrow="ISO 18091"
          title="Nuevo servicio publico"
          description="Completa la ficha del servicio para integrarlo a la carta de servicios municipal."
          breadcrumbs={[
            { label: 'Gobierno', href: '/gobierno/panel' },
            { label: 'Carta de servicios', href: '/gobierno/servicios' },
            { label: 'Nuevo servicio' },
          ]}
          actions={
            <Button variant="outline" asChild>
              <Link href="/gobierno/servicios">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al listado
              </Link>
            </Button>
          }
        />

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Formulario de alta</CardTitle>
                <CardDescription>
                  Define datos operativos, requisitos y visibilidad ciudadana.
                </CardDescription>
              </div>
              <Badge className="w-fit border-[#bfdbfe] bg-[#dbeafe] text-[#1d4ed8]">
                Borrador inicial
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" {...register('nombre')} />
                  {errors.nombre ? (
                    <p className="text-sm text-destructive">{errors.nombre.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descripcion">Descripcion</Label>
                  <Textarea
                    id="descripcion"
                    rows={4}
                    {...register('descripcion')}
                  />
                  {errors.descripcion ? (
                    <p className="text-sm text-destructive">
                      {errors.descripcion.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Area responsable</Label>
                  <Input id="area" {...register('area')} />
                  {errors.area ? (
                    <p className="text-sm text-destructive">{errors.area.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sla_dias">SLA en dias</Label>
                  <Input
                    id="sla_dias"
                    type="number"
                    min={1}
                    max={365}
                    {...register('sla_dias', { valueAsNumber: true })}
                  />
                  {errors.sla_dias ? (
                    <p className="text-sm text-destructive">
                      {errors.sla_dias.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Controller
                    control={control}
                    name="categoria"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoriaLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.categoria ? (
                    <p className="text-sm text-destructive">
                      {errors.categoria.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="requisitos">Requisitos</Label>
                  <Controller
                    control={control}
                    name="requisitos"
                    render={({ field }) => (
                      <Textarea
                        id="requisitos"
                        rows={6}
                        value={(field.value ?? []).join('\n')}
                        onChange={event =>
                          field.onChange(event.target.value.split('\n'))
                        }
                        placeholder="Un requisito por linea"
                      />
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    Carga un requisito por linea. Se guardaran como lista.
                  </p>
                  {errors.requisitos ? (
                    <p className="text-sm text-destructive">
                      {errors.requisitos.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <Controller
                      control={control}
                      name="publico"
                      render={({ field }) => (
                        <Checkbox
                          id="publico"
                          checked={field.value}
                          onCheckedChange={checked => field.onChange(Boolean(checked))}
                          className="mt-1"
                        />
                      )}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="publico" className="cursor-pointer">
                        Publicar para la ciudadania
                      </Label>
                      <p className="text-sm text-slate-500">
                        Si esta opcion esta activa, el servicio se considera publico.
                      </p>
                    </div>
                  </div>
                  {errors.publico ? (
                    <p className="text-sm text-destructive">
                      {errors.publico.message}
                    </p>
                  ) : null}
                </div>
              </div>

              {errors.root?.message ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errors.root.message}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/gobierno/servicios">Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8]"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar servicio
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
