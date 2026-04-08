'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authFetch } from '@/lib/api/authFetch';
import {
  GovCiudadanoCreateSchema,
  type GovCiudadanoCreateInput,
} from '@/types/gov-ciudadano';
import { ArrowLeft, Loader2, Save, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type CiudadanoCreateValues = z.input<typeof GovCiudadanoCreateSchema>;

type CiudadanoCreateResponse = {
  success?: boolean;
  data?: { id: string };
  error?: string;
};

export default function GobiernoNuevoCiudadanoPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CiudadanoCreateValues>({
    resolver: zodResolver(GovCiudadanoCreateSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      dni: '',
      email: '',
      telefono: '',
      domicilio: '',
    },
  });

  const onSubmit = async (values: CiudadanoCreateValues) => {
    try {
      const payload: GovCiudadanoCreateInput = {
        nombre: values.nombre,
        apellido: values.apellido,
        dni: values.dni,
        email: values.email || undefined,
        telefono: values.telefono || undefined,
        domicilio: values.domicilio || undefined,
      };

      const response = await authFetch('/api/gobierno/ciudadanos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as CiudadanoCreateResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'No se pudo crear el ciudadano');
      }

      router.push('/gobierno/ciudadanos');
    } catch (submitError) {
      setError('root', {
        message:
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo crear el ciudadano',
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
                <Users className="mr-1 h-3.5 w-3.5" />
                Ciudadanos
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                  Nuevo ciudadano
                </h1>
                <p className="text-sm leading-6 text-slate-600">
                  Alta de ciudadano para seguimiento municipal y vinculacion con
                  expedientes.
                </p>
              </div>
            </div>

            <Link href="/gobierno/ciudadanos">
              <Button variant="outline" className="border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#eff6ff]">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al listado
              </Button>
            </Link>
          </div>
        </section>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">Formulario de alta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" {...register('nombre')} className="border-slate-200 focus-visible:ring-[#2563eb]" />
                  {errors.nombre ? <p className="text-sm text-rose-600">{errors.nombre.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" {...register('apellido')} className="border-slate-200 focus-visible:ring-[#2563eb]" />
                  {errors.apellido ? <p className="text-sm text-rose-600">{errors.apellido.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input id="dni" {...register('dni')} className="border-slate-200 focus-visible:ring-[#2563eb]" />
                  {errors.dni ? <p className="text-sm text-rose-600">{errors.dni.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} className="border-slate-200 focus-visible:ring-[#2563eb]" />
                  {errors.email ? <p className="text-sm text-rose-600">{errors.email.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input id="telefono" {...register('telefono')} className="border-slate-200 focus-visible:ring-[#2563eb]" />
                  {errors.telefono ? <p className="text-sm text-rose-600">{errors.telefono.message}</p> : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="domicilio">Domicilio</Label>
                  <Input id="domicilio" {...register('domicilio')} className="border-slate-200 focus-visible:ring-[#2563eb]" />
                  {errors.domicilio ? <p className="text-sm text-rose-600">{errors.domicilio.message}</p> : null}
                </div>
              </div>

              {errors.root?.message ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errors.root.message}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link href="/gobierno/ciudadanos">
                  <Button type="button" variant="outline">Cancelar</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting} className="bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Crear ciudadano
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
