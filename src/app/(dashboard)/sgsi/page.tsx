'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import type { SGSIDashboardData } from '@/types/sgsi';
import {
  AlertTriangle,
  Blocks,
  Building2,
  CheckCircle2,
  FileCheck2,
  Shield,
} from 'lucide-react';

function MetricCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3 text-sky-700">{icon}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
      {message}
    </div>
  );
}

export default function SgsiDashboardPage() {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const [data, setData] = useState<SGSIDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/sgsi/dashboard?organization_id=${encodeURIComponent(orgId)}`,
          { cache: 'no-store' }
        );
        const json = (await response.json()) as {
          success: boolean;
          data?: SGSIDashboardData;
          error?: string;
        };

        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Error al cargar SGSI');
        }

        setData(json.data);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error ? fetchError.message : 'Error al cargar SGSI'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="SGSI - Seguridad de la Informacion"
          description="Sistema de Gestion de Seguridad de la Informacion conforme a ISO 27001."
          breadcrumbs={[{ label: 'SGSI' }]}
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="SGSI - Seguridad de la Informacion"
          description="Sistema de Gestion de Seguridad de la Informacion conforme a ISO 27001."
          breadcrumbs={[{ label: 'SGSI' }]}
        />
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const dashboard = data!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="SGSI - Seguridad de la Informacion"
        description="Sistema de Gestion de Seguridad de la Informacion conforme a ISO 27001."
        breadcrumbs={[{ label: 'SGSI' }]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Activos registrados"
          value={dashboard.resumen.activos_registrados}
          hint="Inventario de informacion vigente"
          icon={<Building2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Riesgos activos"
          value={dashboard.resumen.riesgos_activos}
          hint="Riesgos abiertos o en tratamiento"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <MetricCard
          title="Controles aplicados"
          value={dashboard.resumen.controles_aplicados}
          hint="Controles aplicables implementados"
          icon={<Shield className="h-5 w-5" />}
        />
        <MetricCard
          title="Incidentes abiertos"
          value={dashboard.resumen.incidentes_abiertos}
          hint="Registros SGSI pendientes de cierre"
          icon={<Blocks className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Shield className="h-5 w-5 text-sky-600" />
              Contexto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>{dashboard.contexto.alcance_resumen}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Organizacion</div>
                <div className="mt-1 font-medium text-slate-900">
                  {dashboard.contexto.organization_id}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Madurez</div>
                <div className="mt-1 font-medium capitalize text-slate-900">
                  {dashboard.contexto.nivel_madurez}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <FileCheck2 className="h-5 w-5 text-emerald-600" />
              Declaracion de Aplicabilidad (SOA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-2xl font-semibold text-slate-900">{dashboard.soa.total_controles}</div>
                <div className="text-xs text-slate-500">Controles</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <div className="text-2xl font-semibold text-emerald-700">{dashboard.soa.aplicables}</div>
                <div className="text-xs text-emerald-600">Aplicables</div>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-center">
                <div className="text-2xl font-semibold text-amber-700">{dashboard.soa.pendientes}</div>
                <div className="text-xs text-amber-600">Pendientes</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-center">
                <div className="text-2xl font-semibold text-slate-700">{dashboard.soa.no_aplicables}</div>
                <div className="text-xs text-slate-500">No aplicables</div>
              </div>
            </div>
            {dashboard.soa.registros.length === 0 ? (
              <EmptyState message="Todavia no hay controles cargados para construir la SOA." />
            ) : (
              <div className="space-y-2">
                {dashboard.soa.registros.slice(0, 5).map(control => (
                  <div
                    key={control.id}
                    className="flex items-start justify-between rounded-xl border border-slate-200 p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {control.codigo_anexo_a} - {control.nombre}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {control.status === 'aplicable'
                          ? `Implementacion: ${control.implementacion}`
                          : control.justificacion_exclusion || 'Sin justificacion cargada'}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {control.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Activos de informacion</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.activos.length === 0 ? (
              <EmptyState message="No hay activos registrados. El inventario SGSI todavia no fue cargado." />
            ) : (
              <div className="space-y-3">
                {dashboard.activos.map(activo => (
                  <div key={activo.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{activo.nombre}</div>
                        <div className="text-sm text-slate-500">
                          {activo.tipo} · propietario {activo.propietario_id}
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {activo.clasificacion}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Valor del activo: {activo.valor_activo} · CIA {activo.confidencialidad}/
                      {activo.integridad}/{activo.disponibilidad}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Riesgos SGSI</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.riesgos.length === 0 ? (
              <EmptyState message="No hay riesgos registrados. La matriz de riesgos SGSI todavia no fue cargada." />
            ) : (
              <div className="space-y-3">
                {dashboard.riesgos.map(riesgo => (
                  <div key={riesgo.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-900">
                        {riesgo.amenaza} / {riesgo.vulnerabilidad}
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {riesgo.nivel}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Riesgo inherente {riesgo.nivel_riesgo_inherente}
                      {riesgo.nivel_riesgo_residual
                        ? ` · residual ${riesgo.nivel_riesgo_residual}`
                        : ''}
                      {' '}· estado {riesgo.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Controles</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.controles.length === 0 ? (
              <EmptyState message="No hay controles cargados. La biblioteca Anexo A todavia no tiene registros operativos." />
            ) : (
              <div className="space-y-3">
                {dashboard.controles.map(control => (
                  <div key={control.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">
                          {control.codigo_anexo_a} - {control.nombre}
                        </div>
                        <div className="text-sm text-slate-500">{control.descripcion}</div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {control.implementacion}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-rose-600" />
              Incidentes de seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.incidentes.recientes.length === 0 ? (
              <EmptyState message="No hay incidentes SGSI registrados. El tablero muestra la coleccion real del tenant." />
            ) : (
              <div className="space-y-3">
                {dashboard.incidentes.recientes.map(incidente => (
                  <div key={incidente.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{incidente.titulo}</div>
                        <div className="text-sm text-slate-500">{incidente.descripcion}</div>
                      </div>
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                        {incidente.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Severidad {incidente.severidad} · deteccion{' '}
                      {new Date(incidente.fecha_deteccion).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
