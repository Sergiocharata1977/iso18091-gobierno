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
import {
  TRANSPARENCIA_CATEGORIAS,
  type TransparenciaCategoria,
  type TransparenciaRegistroSerialized,
} from '@/types/gov/transparencia';
import {
  AlertTriangle,
  ArrowUpRight,
  CircleDollarSign,
  FileText,
  Gauge,
  Gavel,
  Loader2,
  Search,
} from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

type PublicOrgResponse = {
  success: boolean;
  data?: {
    orgId: string;
    slug: string;
    landingConfig?: {
      orgName?: string;
      tagline?: string;
    };
  };
  error?: string;
};

type TransparenciaResponse = {
  success: boolean;
  data?: TransparenciaRegistroSerialized[];
  error?: string;
  meta?: {
    scope: 'public' | 'internal';
    resumen: Record<TransparenciaCategoria, number>;
  };
};

const CATEGORY_LABELS: Record<TransparenciaCategoria, string> = {
  presupuesto: 'Presupuesto',
  compras: 'Compras',
  actos_administrativos: 'Actos administrativos',
  indicadores_gestion: 'Indicadores de gestion',
};

const CATEGORY_ICONS: Record<TransparenciaCategoria, typeof FileText> = {
  presupuesto: CircleDollarSign,
  compras: FileText,
  actos_administrativos: Gavel,
  indicadores_gestion: Gauge,
};

function formatMetric(item: TransparenciaRegistroSerialized) {
  if (typeof item.valor_actual === 'number' && typeof item.meta === 'number') {
    return `${item.valor_actual} / ${item.meta}${item.unidad ? ` ${item.unidad}` : ''}`;
  }

  if (typeof item.monto === 'number') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: item.unidad || 'ARS',
      maximumFractionDigits: 0,
    }).format(item.monto);
  }

  return item.periodo;
}

export default function TenantTransparenciaPage({
  params,
}: {
  params: { tenant: string };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tenantName, setTenantName] = useState(params.tenant);
  const [tagline, setTagline] = useState('Portal ciudadano de transparencia activa');
  const [categoria, setCategoria] = useState<'all' | TransparenciaCategoria>('all');
  const [items, setItems] = useState<TransparenciaRegistroSerialized[]>([]);
  const [summary, setSummary] = useState<Record<TransparenciaCategoria, number>>({
    presupuesto: 0,
    compras: 0,
    actos_administrativos: 0,
    indicadores_gestion: 0,
  });
  const deferredQuery = useDeferredValue(query);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [orgResponse, transparenciaResponse] = await Promise.all([
        fetch(`/api/public/org/${params.tenant}`, { cache: 'no-store' }),
        fetch(`/api/transparencia?tenant=${params.tenant}&publico=true`, {
          cache: 'no-store',
        }),
      ]);

      const orgJson = (await orgResponse.json()) as PublicOrgResponse;
      const transparenciaJson =
        (await transparenciaResponse.json()) as TransparenciaResponse;

      if (orgResponse.ok && orgJson.success && orgJson.data?.landingConfig?.orgName) {
        setTenantName(orgJson.data.landingConfig.orgName);
        setTagline(
          orgJson.data.landingConfig.tagline ||
            'Portal ciudadano de transparencia activa'
        );
      }

      if (
        !transparenciaResponse.ok ||
        !transparenciaJson.success ||
        !transparenciaJson.data
      ) {
        throw new Error(
          transparenciaJson.error || 'No se pudo cargar el portal de transparencia'
        );
      }

      setItems(transparenciaJson.data);
      if (transparenciaJson.meta?.resumen) {
        setSummary(transparenciaJson.meta.resumen);
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar el portal de transparencia'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [params.tenant]);

  const filteredItems = useMemo(() => {
    const term = deferredQuery.trim().toLocaleLowerCase('es');
    return items.filter(item => {
      const matchesCategory = categoria === 'all' || item.categoria === categoria;
      const matchesSearch =
        term.length === 0 ||
        [item.titulo, item.resumen, item.area_responsable, item.codigo]
          .filter((value): value is string => typeof value === 'string')
          .some(value => value.toLocaleLowerCase('es').includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [categoria, deferredQuery, items]);

  const destacados = useMemo(() => items.filter(item => item.destacado), [items]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_42%,#ffffff_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_280px] md:p-8">
            <div className="space-y-4">
              <Badge className="w-fit border border-sky-200 bg-sky-50 text-sky-700">
                Transparencia activa
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                  {tenantName}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  {tagline}. Consulta presupuesto, compras, actos administrativos e
                  indicadores de gestion publicados por el municipio.
                </p>
              </div>
              <Button variant="outline" onClick={() => void loadData()}>
                Recargar portal
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              {TRANSPARENCIA_CATEGORIAS.map(item => {
                const Icon = CATEGORY_ICONS[item];
                return (
                  <Card key={item} className="border-slate-200 bg-slate-50/80">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Icon className="h-5 w-5 text-sky-700" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {CATEGORY_LABELS[item]}
                        </p>
                        <p className="text-xl font-semibold text-slate-950">
                          {summary[item]}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error de carga</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar por tema, codigo o area"
                className="pl-9"
              />
            </div>
            <select
              value={categoria}
              onChange={event =>
                setCategoria(event.target.value as 'all' | TransparenciaCategoria)
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todas las categorias</option>
              {TRANSPARENCIA_CATEGORIAS.map(item => (
                <option key={item} value={item}>
                  {CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {destacados.length > 0 ? (
          <section className="grid gap-4 lg:grid-cols-3">
            {destacados.slice(0, 3).map(item => (
              <Card key={item.id} className="border-sky-200 bg-sky-50/60">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="success">Destacado</Badge>
                    <Badge variant="outline">{CATEGORY_LABELS[item.categoria]}</Badge>
                  </div>
                  <CardTitle className="text-lg">{item.titulo}</CardTitle>
                  <CardDescription>{item.resumen}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Dato principal
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {formatMetric(item)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">
                    {item.area_responsable} · {item.periodo}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          {loading ? (
            <Card className="lg:col-span-2">
              <CardContent className="flex min-h-[260px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card className="lg:col-span-2 border-dashed">
              <CardContent className="flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">
                No hay publicaciones visibles para los filtros actuales.
              </CardContent>
            </Card>
          ) : (
            filteredItems.map(item => {
              const Icon = CATEGORY_ICONS[item.categoria];
              return (
                <Card key={item.id} className="h-full border-slate-200 bg-white/95">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{item.codigo}</Badge>
                          <Badge variant="secondary">
                            {CATEGORY_LABELS[item.categoria]}
                          </Badge>
                        </div>
                        <CardTitle className="mt-3 text-xl">{item.titulo}</CardTitle>
                      </div>
                      <Icon className="h-5 w-5 text-slate-400" />
                    </div>
                    <CardDescription>{item.resumen}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Periodo
                        </p>
                        <p className="mt-2 font-medium text-slate-900">{item.periodo}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Area responsable
                        </p>
                        <p className="mt-2 font-medium text-slate-900">
                          {item.area_responsable}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Dato informado
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {formatMetric(item)}
                      </p>
                    </div>
                    {item.url_documento ? (
                      <a
                        href={item.url_documento}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900"
                      >
                        Ver documento respaldo
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
