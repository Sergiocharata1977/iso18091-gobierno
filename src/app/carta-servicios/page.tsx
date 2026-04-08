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
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import type { CanalAtencion, ServicioPublico } from '@/types/gov/service-catalog';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Landmark,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ServicioPublicoDTO = Omit<ServicioPublico, 'created_at' | 'updated_at'> & {
  created_at: string | null;
  updated_at: string | null;
};

type ServicesResponse = {
  success: boolean;
  data?: ServicioPublicoDTO[];
  error?: string;
  meta?: {
    scope: 'public' | 'internal';
  };
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

export default function CartaServiciosPage() {
  const { usuario, loading: userLoading } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showInternalOnly, setShowInternalOnly] = useState(false);
  const [services, setServices] = useState<ServicioPublicoDTO[]>([]);
  const [scope, setScope] = useState<'public' | 'internal'>('public');

  const canSeeInternalToggle = !!usuario;

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) {
        params.set('q', query.trim());
      }
      if (!showInternalOnly) {
        params.set('publico', 'true');
      }

      const response = await fetch(`/api/carta-servicios?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = (await response.json()) as ServicesResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo obtener la carta de servicios');
      }

      setServices(json.data);
      setScope(json.meta?.scope || 'public');
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo obtener la carta de servicios'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadServices();
  }, [showInternalOnly]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadServices();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const stats = useMemo(() => {
    const publicCount = services.filter(service => service.publico).length;
    const activeCount = services.filter(service => service.activo).length;
    return {
      total: services.length,
      publicCount,
      activeCount,
    };
  }, [services]);

  const headerDescription =
    scope === 'internal'
      ? 'Catalogo operativo con servicios publicos, requisitos, canales y compromisos de respuesta.'
      : 'Consulta ciudadana de servicios publicos disponibles, requisitos y tiempos de respuesta.';

  return (
    <div className="space-y-6 p-6 md:p-8">
      <PageHeader
        title="Carta de Servicios"
        description={headerDescription}
        breadcrumbs={[{ label: 'Municipio' }, { label: 'Carta de servicios' }]}
        actions={
          <>
            {canSeeInternalToggle ? (
              <Button
                variant={showInternalOnly ? 'default' : 'outline'}
                onClick={() => setShowInternalOnly(current => !current)}
                disabled={userLoading}
                className="gap-2"
              >
                {showInternalOnly ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                {showInternalOnly ? 'Vista interna' : 'Solo publico'}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void loadServices()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Servicios listados</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Publicos</CardDescription>
            <CardTitle className="text-3xl">{stats.publicCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activos</CardDescription>
            <CardTitle className="text-3xl">{stats.activeCount}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="border-slate-200">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">
              Filtrar servicios por nombre, codigo, descripcion o area
            </p>
            <p className="text-sm text-muted-foreground">
              {scope === 'internal'
                ? 'Mostrando catalogo interno completo.'
                : 'Mostrando solo servicios activos visibles para ciudadania.'}
            </p>
          </div>
          <div className="w-full md:max-w-md">
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar servicio o tramite"
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error de carga</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        {loading ? (
          <Card className="xl:col-span-2">
            <CardContent className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
              Cargando carta de servicios...
            </CardContent>
          </Card>
        ) : services.length === 0 ? (
          <Card className="xl:col-span-2 border-dashed">
            <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <Landmark className="h-10 w-10 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-800">
                  No hay servicios para los filtros actuales.
                </p>
                <p className="text-sm text-muted-foreground">
                  Ajusta la busqueda o cambia entre vista publica e interna.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          services.map(service => {
            const slaTone = getSlaTone(service.sla_horas);

            return (
              <Link key={service.id} href={`/carta-servicios/${service.id}`}>
                <Card className="h-full border-slate-200 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{service.codigo}</Badge>
                          <Badge className={cn('border', slaTone.className)}>
                            SLA {slaTone.label}
                          </Badge>
                          <Badge
                            variant={service.publico ? 'success' : 'outline'}
                          >
                            {service.publico ? 'Portal ciudadano' : 'Interno'}
                          </Badge>
                        </div>
                        <CardTitle className="mt-3 text-xl">
                          {service.nombre}
                        </CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {service.descripcion}
                        </CardDescription>
                      </div>
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
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Area responsable
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {service.area_responsable_nombre}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Compromiso de respuesta
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          {service.sla_descripcion}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Canales de atencion
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {service.canal_atencion.map(channel => (
                          <Badge key={channel} variant="outline">
                            {CHANNEL_LABELS[channel]}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Requisitos
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {service.requisitos.length} item(s) informados
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Costo
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {formatCurrency(service.costo, service.moneda)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </section>

      <Card className="border-slate-200 bg-slate-50/70">
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">SLA visible</p>
              <p className="text-sm text-muted-foreground">
                Cada servicio informa tiempo maximo de respuesta y canal de atencion.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-sky-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Requisitos claros</p>
              <p className="text-sm text-muted-foreground">
                La ficha detalla documentacion y condiciones previas del tramite.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Portal ciudadano</p>
              <p className="text-sm text-muted-foreground">
                Los servicios marcados como publicos quedan disponibles para consulta abierta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
