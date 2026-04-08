'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn, formatDate } from '@/lib/utils';
import type { CanalAtencion, ServicioPublico } from '@/types/gov/service-catalog';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Landmark,
  RefreshCw,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ServicioPublicoDTO = Omit<ServicioPublico, 'created_at' | 'updated_at'> & {
  created_at: string | null;
  updated_at: string | null;
};

type ServiceDetailResponse = {
  success: boolean;
  data?: ServicioPublicoDTO;
  error?: string;
};

const CHANNEL_LABELS: Record<CanalAtencion, string> = {
  presencial: 'Presencial',
  web: 'Web',
  whatsapp: 'WhatsApp',
  telefono: 'Telefono',
  email: 'Email',
};

function getSlaTone(slaHoras: number) {
  if (slaHoras <= 24) {
    return {
      label: 'Verde',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (slaHoras <= 72) {
    return {
      label: 'Amarillo',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  return {
    label: 'Rojo',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  };
}

function formatCurrency(costo?: number, moneda?: string) {
  if (typeof costo !== 'number') return 'No informado';
  if (costo === 0) return 'Gratuito';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda || 'ARS',
    maximumFractionDigits: 0,
  }).format(costo);
}

export default function CartaServicioDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<ServicioPublicoDTO | null>(null);

  const loadService = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/carta-servicios/${params.id}`, {
        cache: 'no-store',
      });
      const json = (await response.json()) as ServiceDetailResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo obtener el servicio');
      }

      setService(json.data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo obtener el servicio'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadService();
  }, [params.id]);

  const slaTone = useMemo(
    () => (service ? getSlaTone(service.sla_horas) : null),
    [service]
  );

  return (
    <div className="space-y-6 p-6 md:p-8">
      <PageHeader
        title={service?.nombre || 'Detalle del servicio'}
        description={
          service?.descripcion ||
          'Ficha completa del servicio, requisitos, canales y normas vinculadas.'
        }
        breadcrumbs={[
          { label: 'Municipio' },
          { label: 'Carta de servicios', href: '/carta-servicios' },
          { label: service?.codigo || 'Detalle' },
        ]}
        actions={
          <>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/carta-servicios">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button variant="outline" onClick={() => void loadService()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de carga</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
            Cargando detalle del servicio...
          </CardContent>
        </Card>
      ) : service ? (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="border-slate-200">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{service.codigo}</Badge>
                  {slaTone ? (
                    <Badge className={cn('border', slaTone.className)}>
                      SLA {slaTone.label}
                    </Badge>
                  ) : null}
                  <Badge variant={service.publico ? 'success' : 'outline'}>
                    {service.publico ? 'Visible en portal' : 'Uso interno'}
                  </Badge>
                  <Badge
                    className={cn(
                      'border',
                      service.activo
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    )}
                  >
                    {service.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-3xl">{service.nombre}</CardTitle>
                  <CardDescription className="mt-3 text-base leading-relaxed text-slate-600">
                    {service.descripcion}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Area responsable
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Users className="h-4 w-4 text-slate-400" />
                    {service.area_responsable_nombre}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Costo
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <CircleDollarSign className="h-4 w-4 text-slate-400" />
                    {formatCurrency(service.costo, service.moneda)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    SLA comprometido
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    {service.sla_descripcion}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Objetivo configurado: {service.sla_horas} hora(s).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-sky-600" />
                  Resumen operativo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Canales habilitados
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {service.canal_atencion.map(channel => (
                      <Badge key={channel} variant="outline">
                        {CHANNEL_LABELS[channel]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Ultima actualizacion
                  </p>
                  <p className="mt-2">
                    {service.updated_at
                      ? formatDate(new Date(service.updated_at))
                      : 'No informada'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Organizacion
                  </p>
                  <p className="mt-2">{service.organization_id}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Requisitos del tramite
                </CardTitle>
                <CardDescription>
                  Documentacion y condiciones previas necesarias para solicitar el servicio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {service.requisitos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-muted-foreground">
                    Este servicio no tiene requisitos registrados.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {service.requisitos.map((requisito, index) => (
                      <div
                        key={`${service.id}-req-${index}`}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            Requisito {index + 1}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{requisito}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  Normativa vinculada
                </CardTitle>
                <CardDescription>
                  Ordenanzas, resoluciones o referencias normativas asociadas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {service.normativa_ids && service.normativa_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {service.normativa_ids.map(item => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-muted-foreground">
                    No hay normativa referenciada para este servicio.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <Card>
          <CardContent className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
            No se encontro informacion del servicio.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
