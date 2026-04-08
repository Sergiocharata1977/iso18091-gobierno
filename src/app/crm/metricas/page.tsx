'use client';

import { ActionTypeBadge } from '@/components/crm/actions/ActionTypeBadge';
import { AlertasSeguimientoWidget } from '@/components/crm/metricas/AlertasSeguimientoWidget';
import { ClasificacionDistribucionChart } from '@/components/crm/metricas/ClasificacionDistribucionChart';
import { MetricasVendedorCard } from '@/components/crm/metricas/MetricasVendedorCard';
import { TabPanel } from '@/components/design-system/primitives/TabPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { ClienteCRM } from '@/types/crm';
import type { CriterioClasificacion } from '@/types/crm-clasificacion';
import type { OportunidadCRM } from '@/types/crm-oportunidad';
import { CRMAccion } from '@/types/crmAcciones';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function CRMMetricsPage() {
  const { user } = useAuth();
  const organizationId = user?.organization_id;

  const [loading, setLoading] = useState(true);
  const [acciones, setAcciones] = useState<CRMAccion[]>([]);
  const [clientes, setClientes] = useState<ClienteCRM[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadCRM[]>([]);
  const [criterios, setCriterios] = useState<CriterioClasificacion[]>([]);
  const [rangoFecha, setRangoFecha] = useState('30');
  const [criterioActivo, setCriterioActivo] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!organizationId) return;
      setLoading(true);

      try {
        const desde = new Date();
        desde.setDate(desde.getDate() - Number.parseInt(rangoFecha, 10));

        const params = new URLSearchParams({
          organization_id: organizationId,
          fecha_desde: desde.toISOString(),
        });

        const [accionesRes, clientesRes, oportunidadesRes, criteriosRes] =
          await Promise.all([
            fetch(`/api/crm/acciones?${params.toString()}`),
            fetch(`/api/crm/clientes?organization_id=${organizationId}`),
            fetch(`/api/crm/oportunidades?organization_id=${organizationId}`),
            fetch(`/api/crm/clasificaciones?organization_id=${organizationId}`),
          ]);

        const [accionesData, clientesData, oportunidadesData, criteriosData] =
          await Promise.all([
            accionesRes.json(),
            clientesRes.json(),
            oportunidadesRes.json(),
            criteriosRes.json(),
          ]);

        if (accionesData.success && accionesData.data) {
          const filtered = (accionesData.data as CRMAccion[]).filter(
            accion => new Date(accion.createdAt) >= desde
          );
          setAcciones(filtered);
        } else {
          setAcciones([]);
        }

        setClientes(
          clientesData.success && clientesData.data
            ? (clientesData.data as ClienteCRM[])
            : []
        );
        setOportunidades(
          oportunidadesData.success && oportunidadesData.data
            ? (oportunidadesData.data as OportunidadCRM[])
            : []
        );
        setCriterios(
          criteriosData.success && criteriosData.data
            ? (criteriosData.data as CriterioClasificacion[])
                .filter(criterio => criterio.aplica_a_clientes)
                .sort((a, b) => a.orden - b.orden)
            : []
        );
      } catch (error) {
        console.error('Error loading metrics data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [organizationId, rangoFecha]);

  useEffect(() => {
    if (!criterios.length) {
      setCriterioActivo('');
      return;
    }

    setCriterioActivo(current =>
      current && criterios.some(criterio => criterio.slug === current)
        ? current
        : criterios[0].slug
    );
  }, [criterios]);

  const vendedores = useMemo(() => {
    const vendedoresMap = new Map<string, string>();

    clientes.forEach(cliente => {
      if (cliente.responsable_id) {
        vendedoresMap.set(
          cliente.responsable_id,
          cliente.responsable_nombre || 'Sin nombre'
        );
      }
    });

    oportunidades.forEach(oportunidad => {
      if (oportunidad.vendedor_id) {
        vendedoresMap.set(
          oportunidad.vendedor_id,
          oportunidad.vendedor_nombre || 'Sin nombre'
        );
      }
    });

    acciones.forEach(accion => {
      if (accion.vendedor_id) {
        vendedoresMap.set(
          accion.vendedor_id,
          accion.vendedor_nombre ||
            vendedoresMap.get(accion.vendedor_id) ||
            'Sin nombre'
        );
      }
    });

    return Array.from(vendedoresMap.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [acciones, clientes, oportunidades]);

  const distribucionesClasificacion = useMemo(
    () =>
      criterios.reduce(
        (acc, criterio) => {
          const distribucion = clientes.reduce(
            (resultado, cliente) => {
              const rawValue = cliente.classifications?.[criterio.slug];
              const values = Array.isArray(rawValue)
                ? rawValue
                : rawValue
                  ? [rawValue]
                  : [];

              if (!values.length) {
                resultado['Sin clasificar'] =
                  (resultado['Sin clasificar'] || 0) + 1;
                return resultado;
              }

              values.forEach(value => {
                const opcion = criterio.opciones.find(item => item.slug === value);
                const label = opcion?.label || value;
                resultado[label] = (resultado[label] || 0) + 1;
              });

              return resultado;
            },
            {} as Record<string, number>
          );

          acc[criterio.slug] = distribucion;
          return acc;
        },
        {} as Record<string, Record<string, number>>
      ),
    [clientes, criterios]
  );

  const calculateKPIs = () => {
    const total = acciones.length;
    const completed = acciones.filter(a => a.estado === 'completada');
    const overdue = acciones.filter(
      a =>
        a.estado === 'vencida' ||
        (a.estado === 'programada' &&
          a.fecha_programada &&
          new Date(a.fecha_programada) < new Date())
    );

    const ventas = completed.filter(a => a.resultado === 'venta').length;
    const eficacia =
      completed.length > 0 ? (ventas / completed.length) * 100 : 0;

    let totalHorasDemora = 0;
    let countDemora = 0;
    completed.forEach(a => {
      if (a.fecha_programada && a.fecha_realizada) {
        const diff =
          new Date(a.fecha_realizada).getTime() -
          new Date(a.fecha_programada).getTime();
        if (diff > 0) {
          totalHorasDemora += diff / (1000 * 60 * 60);
          countDemora++;
        }
      }
    });

    const velocidadPromedio =
      countDemora > 0 ? totalHorasDemora / countDemora : 0;

    const mix: Record<string, number> = {};
    acciones.forEach(a => {
      mix[a.tipo] = (mix[a.tipo] || 0) + 1;
    });

    const ranking: Record<
      string,
      { name: string; count: number; ventas: number }
    > = {};

    acciones.forEach(a => {
      if (!ranking[a.vendedor_id]) {
        ranking[a.vendedor_id] = {
          name: a.vendedor_nombre || 'Desconocido',
          count: 0,
          ventas: 0,
        };
      }
      ranking[a.vendedor_id].count++;
      if (a.resultado === 'venta') ranking[a.vendedor_id].ventas++;
    });

    const topVendedores = Object.values(ranking)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      completed: completed.length,
      overdue: overdue.length,
      eficacia,
      velocidadPromedio,
      mix,
      topVendedores,
    };
  };

  const kpis = calculateKPIs();
  const criterioSeleccionado =
    criterios.find(criterio => criterio.slug === criterioActivo) || null;

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChart3 className="text-purple-600" />
            Metricas de actividad
          </h1>
          <p className="text-sm text-gray-500">
            Rendimiento del equipo basado en acciones reales
          </p>
        </div>
        <div className="w-48">
          <Select value={rangoFecha} onValueChange={setRangoFecha}>
            <SelectTrigger>
              <SelectValue placeholder="Rango de fecha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimos 7 dias</SelectItem>
              <SelectItem value="30">Ultimos 30 dias</SelectItem>
              <SelectItem value="90">Ultimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-400">
          Calculando metricas...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Acciones totales
                </CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.total}</div>
                <p className="mt-1 text-xs text-gray-400">
                  En el periodo seleccionado
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Realizadas vs vencidas
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-green-600">
                    {kpis.completed}
                  </span>
                  <span className="mb-1 text-sm text-gray-400">/</span>
                  <span className="text-xl font-semibold text-red-500">
                    {kpis.overdue}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Completadas vs pendientes vencidas
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Eficacia de ventas
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpis.eficacia.toFixed(1)}%
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Acciones que resultaron en venta
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Velocidad promedio
                </CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpis.velocidadPromedio.toFixed(1)} hrs
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Demora promedio de seguimiento
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mix de actividades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(kpis.mix)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tipo, count]) => (
                      <div
                        key={tipo}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <ActionTypeBadge
                            tipo={tipo as CRMAccion['tipo']}
                            showLabel={false}
                            className="h-6 w-6"
                          />
                          <span className="text-sm font-medium capitalize">
                            {tipo}
                          </span>
                        </div>
                        <div className="flex w-1/2 items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{
                                width: `${kpis.total > 0 ? (count / kpis.total) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="w-8 text-right text-sm text-gray-500">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-gray-500" />
                  Actividad por vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {kpis.topVendedores.map((vendedor, index) => (
                    <div
                      key={`${vendedor.name}-${index}`}
                      className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                          {vendedor.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {vendedor.name}
                          </div>
                          <div className="text-xs font-medium text-green-600">
                            {vendedor.ventas} ventas generadas
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {vendedor.count}
                        </div>
                        <div className="text-xs text-gray-400">acciones</div>
                      </div>
                    </div>
                  ))}
                  {kpis.topVendedores.length === 0 && (
                    <p className="py-4 text-center text-gray-400">
                      No hay actividad registrada
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Actividad por vendedor
              </h2>
              <p className="text-sm text-slate-500">
                Desglose comercial y operativo por responsable.
              </p>
            </div>

            {vendedores.length ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {vendedores.map(vendedor => (
                  <MetricasVendedorCard
                    key={vendedor.id}
                    vendedorId={vendedor.id}
                    vendedorNombre={vendedor.nombre}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-sm text-slate-500">
                  No hay vendedores con actividad para mostrar.
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Distribucion por clasificacion
              </h2>
              <p className="text-sm text-slate-500">
                Lectura de cartera segun criterios activos de clientes.
              </p>
            </div>

            {criterios.length ? (
              <div className="space-y-4">
                <TabPanel
                  tabs={criterios.map(criterio => ({
                    id: criterio.slug,
                    label: criterio.nombre,
                    badge: Object.keys(
                      distribucionesClasificacion[criterio.slug] || {}
                    ).length,
                  }))}
                  activeTab={criterioActivo}
                  onChange={setCriterioActivo}
                  variant="pills"
                />

                {criterioSeleccionado && (
                  <ClasificacionDistribucionChart
                    criterio={criterioSeleccionado.nombre}
                    datos={
                      distribucionesClasificacion[criterioSeleccionado.slug] || {}
                    }
                  />
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-sm text-slate-500">
                  No hay criterios de clasificacion activos para clientes.
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Alertas de seguimiento
              </h2>
              <p className="text-sm text-slate-500">
                Clientes que superaron el umbral sin contacto reciente.
              </p>
            </div>
            <AlertasSeguimientoWidget dias={15} />
          </div>
        </>
      )}
    </div>
  );
}
