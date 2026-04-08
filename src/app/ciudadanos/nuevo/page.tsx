'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/api/authFetch';
import {
  CreateCiudadanoBodySchema,
} from '@/lib/validations/gov-ciudadano';
import { z } from 'zod';
import {
  CIUDADANO_CANALES_PREFERIDOS,
  CIUDADANO_TIPOS,
} from '@/types/gov/ciudadano';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';

const tipoLabels: Record<(typeof CIUDADANO_TIPOS)[number], string> = {
  vecino: 'Vecino',
  contribuyente: 'Contribuyente',
  organismo: 'Organismo',
  empresa: 'Empresa',
  otro: 'Otro',
};

const canalLabels: Record<(typeof CIUDADANO_CANALES_PREFERIDOS)[number], string> =
  {
    presencial: 'Presencial',
    whatsapp: 'WhatsApp',
    web: 'Web',
    telefono: 'Telefono',
    email: 'Email',
  };

// Usar el tipo de INPUT (antes de los transforms de Zod) para React Hook Form
type CiudadanoFormValues = z.input<typeof CreateCiudadanoBodySchema>;

export default function NuevoCiudadanoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CiudadanoFormValues>({
    resolver: zodResolver(CreateCiudadanoBodySchema),
    defaultValues: {
      organization_id: user?.organization_id ?? undefined,
      nombre: '',
      apellido: '',
      dni: '',
      email: '',
      telefono: '',
      direccion: '',
      barrio: '',
      tipo: 'vecino',
      canal_preferido: 'whatsapp',
      etiquetas: [],
      activo: true,
    },
  });

  const onSubmit = async (values: CiudadanoFormValues) => {
    try {
      if (!user?.organization_id) {
        throw new Error('No se encontro la organizacion activa para crear ciudadanos');
      }

      const response = await authFetch('/api/ciudadanos', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          organization_id: user.organization_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo crear el ciudadano');
      }

      router.push(`/ciudadanos/${data.id}`);
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Nuevo ciudadano"
          description="Alta de ciudadano para habilitar seguimiento y trazabilidad municipal."
          breadcrumbs={[
            { label: 'Municipio' },
            { label: 'Ciudadanos', href: '/ciudadanos' },
            { label: 'Nuevo ciudadano' },
          ]}
          actions={
            <Button variant="outline" asChild>
              <Link href="/ciudadanos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al listado
              </Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Formulario de alta</CardTitle>
            <CardDescription>
              Completa los datos basicos del ciudadano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" {...register('nombre')} />
                  {errors.nombre ? (
                    <p className="text-sm text-destructive">
                      {errors.nombre.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" {...register('apellido')} />
                  {errors.apellido ? (
                    <p className="text-sm text-destructive">
                      {errors.apellido.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input id="dni" {...register('dni')} />
                  {errors.dni ? (
                    <p className="text-sm text-destructive">
                      {errors.dni.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email ? (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input id="telefono" {...register('telefono')} />
                  {errors.telefono ? (
                    <p className="text-sm text-destructive">
                      {errors.telefono.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barrio">Barrio</Label>
                  <Input id="barrio" {...register('barrio')} />
                  {errors.barrio ? (
                    <p className="text-sm text-destructive">
                      {errors.barrio.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direccion">Direccion</Label>
                  <Input id="direccion" {...register('direccion')} />
                  {errors.direccion ? (
                    <p className="text-sm text-destructive">
                      {errors.direccion.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Controller
                    control={control}
                    name="tipo"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {CIUDADANO_TIPOS.map(item => (
                            <SelectItem key={item} value={item}>
                              {tipoLabels[item]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tipo ? (
                    <p className="text-sm text-destructive">
                      {errors.tipo.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Canal preferido</Label>
                  <Controller
                    control={control}
                    name="canal_preferido"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar canal" />
                        </SelectTrigger>
                        <SelectContent>
                          {CIUDADANO_CANALES_PREFERIDOS.map(item => (
                            <SelectItem key={item} value={item}>
                              {canalLabels[item]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.canal_preferido ? (
                    <p className="text-sm text-destructive">
                      {errors.canal_preferido.message}
                    </p>
                  ) : null}
                </div>
              </div>

              {errors.root?.message ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {errors.root.message}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" asChild>
                  <Link href="/ciudadanos">Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !user?.organization_id}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
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
