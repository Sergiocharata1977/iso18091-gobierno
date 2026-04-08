'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { submitPublicSolicitud } from '@/lib/dealer-solicitudes/client';
import {
  publicSolicitudComercialSchema,
  publicSolicitudRepuestoSchema,
  publicSolicitudServicioSchema,
  type DealerSolicitudTipo,
  type PublicSolicitudComercialPayload,
  type PublicSolicitudRepuestoPayload,
  type PublicSolicitudServicioPayload,
} from '@/lib/validations/dealer-solicitudes';
import { CheckCircle2, Cog, Package, PhoneCall, Send } from 'lucide-react';
import { useState } from 'react';
import { Controller, type FieldErrors, useForm } from 'react-hook-form';

type SubmissionState = {
  id: string;
  numeroSolicitud: string;
  tipo: DealerSolicitudTipo;
} | null;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600">{message}</p>;
}

function SharedFields<T extends Record<string, unknown>>(props: {
  register: ReturnType<typeof useForm<T>>['register'];
  errors: FieldErrors<T>;
}) {
  const { register, errors } = props;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" {...register('nombre' as any)} className="mt-2" />
        <FieldError message={errors.nombre?.message as string | undefined} />
      </div>
      <div>
        <Label htmlFor="telefono">Telefono</Label>
        <Input
          id="telefono"
          {...register('telefono' as any)}
          className="mt-2"
        />
        <FieldError message={errors.telefono?.message as string | undefined} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email' as any)}
          className="mt-2"
        />
        <FieldError message={errors.email?.message as string | undefined} />
      </div>
      <div>
        <Label htmlFor="cuit">CUIT</Label>
        <Input
          id="cuit"
          {...register('cuit' as any)}
          className="mt-2"
          placeholder="Opcional"
        />
        <FieldError message={errors.cuit?.message as string | undefined} />
      </div>
    </div>
  );
}

function SubmissionSuccess({
  submission,
}: {
  submission: NonNullable<SubmissionState>;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900">
        Solicitud enviada
      </h3>
      <p className="mt-2 text-slate-600">
        Numero de solicitud: <strong>{submission.numeroSolicitud}</strong>
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Tipo: {submission.tipo}. El backend ya puede procesarla.
      </p>
    </div>
  );
}

function RepuestoForm() {
  const [requestError, setRequestError] = useState('');
  const [submission, setSubmission] = useState<SubmissionState>(null);
  const formStartedAt = useState(() => Date.now())[0];
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PublicSolicitudRepuestoPayload>({
    resolver: zodResolver(publicSolicitudRepuestoSchema),
    defaultValues: {
      tipo: 'repuesto',
      nombre: '',
      telefono: '',
      email: '',
      cuit: '',
      maquina_tipo: '',
      modelo: '',
      numero_serie: '',
      descripcion_repuesto: '',
      website: '',
      form_started_at: formStartedAt,
    },
  });

  if (submission) return <SubmissionSuccess submission={submission} />;

  return (
    <form
      onSubmit={handleSubmit(async values => {
        try {
          setRequestError('');
          const response = await submitPublicSolicitud(values);
          setSubmission(response);
          reset({
            tipo: 'repuesto',
            nombre: '',
            telefono: '',
            email: '',
            cuit: '',
            maquina_tipo: '',
            modelo: '',
            numero_serie: '',
            descripcion_repuesto: '',
            website: '',
            form_started_at: Date.now(),
          });
        } catch (error) {
          setRequestError(
            error instanceof Error
              ? error.message
              : 'No se pudo enviar la solicitud'
          );
        }
      })}
      className="space-y-5"
    >
      <SharedFields register={register} errors={errors} />
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="maquina_tipo_repuesto">Tipo de maquina</Label>
          <Input
            id="maquina_tipo_repuesto"
            {...register('maquina_tipo')}
            className="mt-2"
          />
          <FieldError message={errors.maquina_tipo?.message} />
        </div>
        <div>
          <Label htmlFor="modelo_repuesto">Modelo</Label>
          <Input
            id="modelo_repuesto"
            {...register('modelo')}
            className="mt-2"
          />
          <FieldError message={errors.modelo?.message} />
        </div>
      </div>
      <div>
        <Label htmlFor="numero_serie_repuesto">Numero de serie</Label>
        <Input
          id="numero_serie_repuesto"
          {...register('numero_serie')}
          className="mt-2"
          placeholder="Opcional"
        />
        <FieldError message={errors.numero_serie?.message} />
      </div>
      <div>
        <Label htmlFor="descripcion_repuesto">Descripcion del repuesto</Label>
        <Textarea
          id="descripcion_repuesto"
          {...register('descripcion_repuesto')}
          className="mt-2 min-h-[120px]"
        />
        <FieldError message={errors.descripcion_repuesto?.message} />
      </div>
      <input type="hidden" {...register('tipo')} value="repuesto" />
      <input type="hidden" {...register('website')} />
      <input
        type="hidden"
        {...register('form_started_at', { valueAsNumber: true })}
        value={formStartedAt}
      />
      {requestError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {requestError}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-slate-900 text-white hover:bg-slate-800"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar solicitud de repuesto'}
      </Button>
    </form>
  );
}

function ServicioForm() {
  const [requestError, setRequestError] = useState('');
  const [submission, setSubmission] = useState<SubmissionState>(null);
  const formStartedAt = useState(() => Date.now())[0];
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PublicSolicitudServicioPayload>({
    resolver: zodResolver(publicSolicitudServicioSchema),
    defaultValues: {
      tipo: 'servicio',
      nombre: '',
      telefono: '',
      email: '',
      cuit: '',
      maquina_tipo: '',
      modelo: '',
      numero_serie: '',
      descripcion_problema: '',
      localidad: '',
      provincia: '',
      website: '',
      form_started_at: formStartedAt,
    },
  });

  if (submission) return <SubmissionSuccess submission={submission} />;

  return (
    <form
      onSubmit={handleSubmit(async values => {
        try {
          setRequestError('');
          const response = await submitPublicSolicitud(values);
          setSubmission(response);
          reset({
            tipo: 'servicio',
            nombre: '',
            telefono: '',
            email: '',
            cuit: '',
            maquina_tipo: '',
            modelo: '',
            numero_serie: '',
            descripcion_problema: '',
            localidad: '',
            provincia: '',
            website: '',
            form_started_at: Date.now(),
          });
        } catch (error) {
          setRequestError(
            error instanceof Error
              ? error.message
              : 'No se pudo enviar la solicitud'
          );
        }
      })}
      className="space-y-5"
    >
      <SharedFields register={register} errors={errors} />
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="maquina_tipo_servicio">Tipo de maquina</Label>
          <Input
            id="maquina_tipo_servicio"
            {...register('maquina_tipo')}
            className="mt-2"
          />
          <FieldError message={errors.maquina_tipo?.message} />
        </div>
        <div>
          <Label htmlFor="modelo_servicio">Modelo</Label>
          <Input
            id="modelo_servicio"
            {...register('modelo')}
            className="mt-2"
          />
          <FieldError message={errors.modelo?.message} />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="numero_serie_servicio">Numero de serie</Label>
          <Input
            id="numero_serie_servicio"
            {...register('numero_serie')}
            className="mt-2"
            placeholder="Opcional"
          />
          <FieldError message={errors.numero_serie?.message} />
        </div>
        <div>
          <Label htmlFor="localidad_servicio">Localidad</Label>
          <Input
            id="localidad_servicio"
            {...register('localidad')}
            className="mt-2"
          />
          <FieldError message={errors.localidad?.message} />
        </div>
      </div>
      <div>
        <Label htmlFor="provincia_servicio">Provincia</Label>
        <Input
          id="provincia_servicio"
          {...register('provincia')}
          className="mt-2"
        />
        <FieldError message={errors.provincia?.message} />
      </div>
      <div>
        <Label htmlFor="descripcion_problema">Descripcion del problema</Label>
        <Textarea
          id="descripcion_problema"
          {...register('descripcion_problema')}
          className="mt-2 min-h-[120px]"
        />
        <FieldError message={errors.descripcion_problema?.message} />
      </div>
      <input type="hidden" {...register('tipo')} value="servicio" />
      <input type="hidden" {...register('website')} />
      <input
        type="hidden"
        {...register('form_started_at', { valueAsNumber: true })}
        value={formStartedAt}
      />
      {requestError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {requestError}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-slate-900 text-white hover:bg-slate-800"
      >
        {isSubmitting ? 'Enviando...' : 'Solicitar servicio tecnico'}
      </Button>
    </form>
  );
}

function ComercialForm() {
  const [requestError, setRequestError] = useState('');
  const [submission, setSubmission] = useState<SubmissionState>(null);
  const formStartedAt = useState(() => Date.now())[0];
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PublicSolicitudComercialPayload>({
    resolver: zodResolver(publicSolicitudComercialSchema),
    defaultValues: {
      tipo: 'comercial',
      nombre: '',
      telefono: '',
      email: '',
      cuit: '',
      producto_interes: '',
      requiere_financiacion: false,
      comentarios: '',
      website: '',
      form_started_at: formStartedAt,
    },
  });

  if (submission) return <SubmissionSuccess submission={submission} />;

  return (
    <form
      onSubmit={handleSubmit(async values => {
        try {
          setRequestError('');
          const response = await submitPublicSolicitud(values);
          setSubmission(response);
          reset({
            tipo: 'comercial',
            nombre: '',
            telefono: '',
            email: '',
            cuit: '',
            producto_interes: '',
            requiere_financiacion: false,
            comentarios: '',
            website: '',
            form_started_at: Date.now(),
          });
        } catch (error) {
          setRequestError(
            error instanceof Error
              ? error.message
              : 'No se pudo enviar la solicitud'
          );
        }
      })}
      className="space-y-5"
    >
      <SharedFields register={register} errors={errors} />
      <div>
        <Label htmlFor="producto_interes">Producto de interes</Label>
        <Input
          id="producto_interes"
          {...register('producto_interes')}
          className="mt-2"
        />
        <FieldError message={errors.producto_interes?.message} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="requiere_financiacion">Requiere financiacion</Label>
            <p className="mt-1 text-sm text-slate-500">
              Activalo si necesitas una propuesta comercial con financiacion.
            </p>
          </div>
          <Controller
            control={control}
            name="requiere_financiacion"
            render={({ field }) => (
              <Switch
                id="requiere_financiacion"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="comentarios">Comentarios</Label>
        <Textarea
          id="comentarios"
          {...register('comentarios')}
          className="mt-2 min-h-[120px]"
        />
        <FieldError message={errors.comentarios?.message} />
      </div>
      <input type="hidden" {...register('tipo')} value="comercial" />
      <input type="hidden" {...register('website')} />
      <input
        type="hidden"
        {...register('form_started_at', { valueAsNumber: true })}
        value={formStartedAt}
      />
      {requestError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {requestError}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-slate-900 text-white hover:bg-slate-800"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar consulta comercial'}
      </Button>
    </form>
  );
}

export function DealerSolicitudesSection() {
  return (
    <section
      id="solicitudes"
      className="relative overflow-hidden bg-gradient-to-b from-white via-[#f6f4ec] to-white py-24"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <Badge className="bg-[#1d6b4f] text-white hover:bg-[#1d6b4f]">
              Dealer solicitudes
            </Badge>
            <div className="space-y-4">
              <h2 className="max-w-xl text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                Solicitudes publicas para repuestos, servicio tecnico y
                comercial
              </h2>
              <p className="max-w-xl text-lg leading-8 text-slate-600">
                Los tres formularios usan un unico endpoint publico y devuelven
                confirmacion con numero de solicitud cuando el backend registra
                el caso.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-slate-200 bg-white/90 shadow-sm">
                <CardHeader className="pb-3">
                  <Package className="h-5 w-5 text-[#9a6b22]" />
                  <CardTitle className="text-base">Repuestos</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-slate-600">
                  Pedido rapido de piezas y partes.
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-white/90 shadow-sm">
                <CardHeader className="pb-3">
                  <Cog className="h-5 w-5 text-[#1d6b4f]" />
                  <CardTitle className="text-base">Servicio tecnico</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-slate-600">
                  Reporte operativo con localidad y provincia.
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-white/90 shadow-sm">
                <CardHeader className="pb-3">
                  <PhoneCall className="h-5 w-5 text-slate-700" />
                  <CardTitle className="text-base">Comercial</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-slate-600">
                  Consulta comercial y financiacion.
                </CardContent>
              </Card>
            </div>
          </div>
          <Card className="border-slate-200 bg-white shadow-[0_30px_80px_-24px_rgba(15,23,42,0.25)]">
            <CardContent className="p-6 md:p-8">
              <Tabs defaultValue="repuesto" className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0">
                  <TabsTrigger
                    value="repuesto"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                  >
                    Repuesto
                  </TabsTrigger>
                  <TabsTrigger
                    value="servicio"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                  >
                    Servicio
                  </TabsTrigger>
                  <TabsTrigger
                    value="comercial"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                  >
                    Comercial
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="repuesto" className="mt-6">
                  <RepuestoForm />
                </TabsContent>
                <TabsContent value="servicio" className="mt-6">
                  <ServicioForm />
                </TabsContent>
                <TabsContent value="comercial" className="mt-6">
                  <ComercialForm />
                </TabsContent>
              </Tabs>
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                <Send className="h-4 w-4" />
                Envio sin login. Validacion cliente-servidor y anti-spam basico.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
