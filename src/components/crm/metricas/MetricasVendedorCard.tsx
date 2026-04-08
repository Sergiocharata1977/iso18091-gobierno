'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Loader2, Target, TrendingUp, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface MetricasVendedorResponse {
  vendedor_id: string;
  clientes_asignados: number;
  oportunidades_activas: number;
  oportunidades_ganadas_periodo: number;
  oportunidades_perdidas_periodo: number;
  monto_total_negociado: number;
  acciones_por_tipo: Record<string, number>;
  total_acciones: number;
}

interface MetricasVendedorCardProps {
  vendedorId: string;
  vendedorNombre: string;
}

const TIPOS_BASE = ['llamada', 'mail', 'visita', 'whatsapp'] as const;

export function MetricasVendedorCard({
  vendedorId,
  vendedorNombre,
}: MetricasVendedorCardProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const [metricas, setMetricas] = useState<MetricasVendedorResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !vendedorId) return;

    const loadMetricas = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          organization_id: organizationId,
          vendedor_id: vendedorId,
        });
        const response = await fetch(
          `/api/crm/metricas/vendedores?${params.toString()}`
        );
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.error || 'No se pudieron cargar las metricas del vendedor'
          );
        }

        setMetricas(payload.data);
      } catch (error) {
        console.error('Error loading seller metrics:', error);
        setMetricas(null);
      } finally {
        setLoading(false);
      }
    };

    void loadMetricas();
  }, [organizationId, vendedorId]);

  const activitySegments = useMemo(() => {
    const total = metricas?.total_acciones || 0;

    return TIPOS_BASE.map(tipo => {
      const value = metricas?.acciones_por_tipo?.[tipo] || 0;
      return {
        tipo,
        value,
        width: total > 0 ? (value / total) * 100 : 0,
      };
    });
  }, [metricas]);

  const segmentColors: Record<(typeof TIPOS_BASE)[number], string> = {
    llamada: 'bg-blue-500',
    mail: 'bg-emerald-500',
    visita: 'bg-amber-500',
    whatsapp: 'bg-green-600',
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="truncate">{vendedorNombre}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
            {vendedorNombre.charAt(0).toUpperCase()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-slate-50 p-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <Users className="h-3.5 w-3.5" />
                  Clientes
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {metricas?.clientes_asignados || 0}
                </p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <Target className="h-3.5 w-3.5" />
                  Oportunidades
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {metricas?.oportunidades_activas || 0}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">
                  Acciones ultimos 30 dias
                </span>
                <span className="font-semibold text-slate-900">
                  {metricas?.total_acciones || 0}
                </span>
              </div>

              <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                {activitySegments.map(segment => (
                  <div
                    key={segment.tipo}
                    className={cn(
                      'h-full transition-all',
                      segmentColors[segment.tipo]
                    )}
                    style={{ width: `${segment.width}%` }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {activitySegments.map(segment => (
                  <div
                    key={segment.tipo}
                    className="flex items-center justify-between rounded-lg border bg-white px-3 py-2"
                  >
                    <span className="capitalize text-slate-600">
                      {segment.tipo}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {segment.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-emerald-50 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">
                  Ganadas
                </p>
                <p className="mt-2 text-xl font-bold text-emerald-800">
                  {metricas?.oportunidades_ganadas_periodo || 0}
                </p>
              </div>
              <div className="rounded-xl border bg-rose-50 p-3">
                <p className="text-xs uppercase tracking-wide text-rose-700">
                  Perdidas
                </p>
                <p className="mt-2 text-xl font-bold text-rose-800">
                  {metricas?.oportunidades_perdidas_periodo || 0}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-violet-50 p-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-violet-700">
                <TrendingUp className="h-3.5 w-3.5" />
                Monto negociado
              </p>
              <p className="mt-2 text-lg font-bold text-violet-900">
                {new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                  maximumFractionDigits: 0,
                }).format(metricas?.monto_total_negociado || 0)}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
