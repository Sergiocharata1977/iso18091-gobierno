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
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { authFetch } from '@/lib/api/authFetch';
import {
  GOV_KPI_TEMPLATES,
  getKpiSemaforo,
  type GovKpiTemplate,
} from '@/lib/gov/kpi-templates';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sprout,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type KpiRecord = {
  id: string;
  codigo: string;
  nombre: string;
  formula: string;
  meta: number;
  unidad: string;
  frecuencia: string;
  dimension_id: string;
  valor_actual?: number;
  valor_anterior?: number;
  organization_id: string;
};

type KpiListResponse = {
  success: boolean;
  data?: KpiRecord[];
  error?: string;
};

const SEMAFORO_CONFIG = {
  verde: {
    label: 'En meta',
    className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  amarillo: {
    label: 'En riesgo',
    className: 'bg-amber-50 border-amber-200 text-amber-800',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: TrendingDown,
  },
  rojo: {
    label: 'Fuera de meta',
    className: 'bg-red-50 border-red-200 text-red-800',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
};

// KPIs que se miden inversamente (menor = mejor)
const INVERTIDOS = new Set(['GOV-KPI-001', 'GOV-KPI-005']);

function buildKpiUrl(organizationId: string) {
  return `/api/quality-indicators?organization_id=${organizationId}&categoria=gobierno_local`;
}

export default function MunicipioKpisPage() {
  const { usuario, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();

  const [kpis, setKpis] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgId = usuario?.organization_id ?? '';

  const fetchKpis = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(buildKpiUrl(orgId));
      const json = (await res.json()) as KpiListResponse;
      if (!json.success || !json.data) throw new Error(json.error ?? 'Error al cargar KPIs');
      setKpis(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar KPIs');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!userLoading && orgId) {
      fetchKpis();
    }
  }, [userLoading, orgId, fetchKpis]);

  async function handleSeedKpis() {
    if (!orgId) return;
    setSeeding(true);
    try {
      const existing = new Set(kpis.map(k => k.codigo));
      const toCreate = GOV_KPI_TEMPLATES.filter(t => !existing.has(t.codigo));

      if (toCreate.length === 0) {
        toast({ title: 'Los KPIs ya están cargados', description: 'No hay templates nuevos para agregar.' });
        return;
      }

      await Promise.all(
        toCreate.map((template: GovKpiTemplate) =>
          authFetch('/api/quality-indicators', {
            method: 'POST',
            body: JSON.stringify({
              organization_id: orgId,
              codigo: template.codigo,
              nombre: template.nombre,
              formula: template.formula,
              meta: template.meta,
              unidad: template.unidad,
              frecuencia: template.frecuencia,
              categoria: 'gobierno_local',
              tipo: 'porcentaje',
            }),
          })
        )
      );

      toast({ title: `${toCreate.length} KPIs creados`, description: 'Templates ISO 18091 cargados exitosamente.' });
      await fetchKpis();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al crear KPIs',
        description: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setSeeding(false);
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Enriquecer con template data para semáforo
  const enriched = kpis.map(kpi => {
    const template = GOV_KPI_TEMPLATES.find(t => t.codigo === kpi.codigo);
    const invertido = INVERTIDOS.has(kpi.codigo);
    const semaforo =
      kpi.valor_actual !== undefined
        ? getKpiSemaforo(kpi.valor_actual, kpi.meta, invertido)
        : null;
    return { ...kpi, template, semaforo, invertido };
  });

  const resumen = {
    verde: enriched.filter(k => k.semaforo === 'verde').length,
    amarillo: enriched.filter(k => k.semaforo === 'amarillo').length,
    rojo: enriched.filter(k => k.semaforo === 'rojo').length,
    sinDatos: enriched.filter(k => k.semaforo === null).length,
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="KPIs Municipales"
        description="Indicadores de gestión pública — ISO 18091"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchKpis} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button size="sm" onClick={handleSeedKpis} disabled={seeding}>
              {seeding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sprout className="h-4 w-4 mr-2" />
              )}
              Seed KPIs ISO 18091
            </Button>
          </div>
        }
      />

      {/* Resumen semáforos */}
      {enriched.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'En meta', count: resumen.verde, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { label: 'En riesgo', count: resumen.amarillo, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
            { label: 'Fuera de meta', count: resumen.rojo, cls: 'text-red-700 bg-red-50 border-red-200' },
            { label: 'Sin datos', count: resumen.sinDatos, cls: 'text-slate-500 bg-slate-50 border-slate-200' },
          ].map(item => (
            <Card key={item.label} className={`border ${item.cls}`}>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs mt-0.5">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sin KPIs → invitación a hacer seed */}
      {enriched.length === 0 && (
        <Card className="border-dashed">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-base">Sin indicadores cargados</CardTitle>
            <CardDescription>
              Cargá los 7 KPIs estándar ISO 18091 con un solo click.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button onClick={handleSeedKpis} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sprout className="h-4 w-4 mr-2" />}
              Cargar KPIs ISO 18091
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid de KPIs */}
      {enriched.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {enriched.map(kpi => {
            const config = kpi.semaforo ? SEMAFORO_CONFIG[kpi.semaforo] : null;
            const SemaforoIcon = config?.icon;
            const tendencia =
              kpi.valor_actual !== undefined && kpi.valor_anterior !== undefined
                ? kpi.valor_actual > kpi.valor_anterior
                  ? 'sube'
                  : kpi.valor_actual < kpi.valor_anterior
                    ? 'baja'
                    : 'igual'
                : null;

            return (
              <Card
                key={kpi.id}
                className={`border transition-colors ${config ? config.className : 'bg-white'}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{kpi.codigo}</p>
                      <CardTitle className="text-sm mt-0.5 leading-snug">{kpi.nombre}</CardTitle>
                    </div>
                    {config && (
                      <Badge variant="outline" className={`shrink-0 text-xs ${config.badgeClass}`}>
                        {SemaforoIcon && <SemaforoIcon className="h-3 w-3 mr-1" />}
                        {config.label}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Valor actual */}
                  <div className="flex items-end gap-3">
                    <div>
                      <p className="text-3xl font-bold">
                        {kpi.valor_actual !== undefined ? kpi.valor_actual : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">{kpi.unidad}</p>
                    </div>
                    {tendencia && (
                      <div className="mb-1">
                        {tendencia === 'sube' ? (
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                        ) : tendencia === 'baja' ? (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Meta + mes anterior */}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Meta: <strong>{kpi.meta} {kpi.unidad}</strong></span>
                    {kpi.valor_anterior !== undefined && (
                      <span>Anterior: <strong>{kpi.valor_anterior}</strong></span>
                    )}
                  </div>

                  {/* Barra de progreso */}
                  {kpi.valor_actual !== undefined && (
                    <div className="mt-1">
                      <div className="h-1.5 w-full rounded-full bg-black/10">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            kpi.semaforo === 'verde'
                              ? 'bg-emerald-500'
                              : kpi.semaforo === 'amarillo'
                                ? 'bg-amber-400'
                                : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (kpi.valor_actual / kpi.meta) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Fórmula */}
                  <p className="text-xs text-muted-foreground italic border-t pt-2 mt-1">
                    {kpi.formula}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <Badge variant="secondary" className="text-xs">{kpi.frecuencia}</Badge>
                    {kpi.template && (
                      <span>Dim. {kpi.template.dimension_id}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
