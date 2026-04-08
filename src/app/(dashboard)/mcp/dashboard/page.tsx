'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AgentJob } from '@/types/agents';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Server,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface DashboardStatsResponse {
  stats: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    queuedJobs: number;
    runningJobs: number;
    successRate: number;
    avgExecutionTimeMs: number;
  };
  windows: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  trend7d: Array<{
    day: string;
    total: number;
    completed: number;
    failed: number;
  }>;
  recentFailedJobs: AgentJob[];
}

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds?: unknown }).seconds === 'number'
  ) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '-';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function AgentDashboardPage() {
  const { usuario, loading: authLoading } = useCurrentUser();
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!usuario?.organization_id) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/mcp/stats?organizationId=${usuario.organization_id}&detailed=1`
      );

      if (!res.ok) {
        throw new Error('No se pudieron cargar las metricas MCP');
      }

      const payload = (await res.json()) as DashboardStatsResponse;
      setData(payload);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuario?.organization_id) {
      fetchData();
    }
  }, [usuario?.organization_id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (usuario?.organization_id && !loading) {
        fetchData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [usuario?.organization_id, loading]);

  const maxTrend = useMemo(() => {
    if (!data?.trend7d?.length) return 1;
    return Math.max(1, ...data.trend7d.map(item => item.total));
  }, [data?.trend7d]);

  if (authLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!usuario?.organization_id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No se encontro una organizacion para este usuario.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard MCP</h1>
          <p className="text-muted-foreground">
            KPIs de supervision de agentes y estado operativo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/mcp/history">
            <Button variant="outline">Ver historial</Button>
          </Link>
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Jobs procesados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              24h: {data?.windows.last24h ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">
              7d: {data?.windows.last7d ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">
              30d: {data?.windows.last30d ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasa de exito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {data?.stats.successRate ?? 0}%
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.stats.completedJobs ?? 0} completados de{' '}
              {data?.stats.totalJobs ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tiempo promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {formatDuration(data?.stats.avgExecutionTimeMs ?? 0)}
              <Clock3 className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground">
              Ejecuciones completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jobs en cola</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {data?.stats.queuedJobs ?? 0}
              <Server className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-xs text-muted-foreground">
              Running: {data?.stats.runningJobs ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de jobs (ultimos 7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.trend7d || []).map(day => {
              const width = Math.max(
                4,
                Math.round((day.total / maxTrend) * 100)
              );
              return (
                <div key={day.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{day.day}</span>
                    <span>
                      total {day.total} | ok {day.completed} | fail {day.failed}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(data?.trend7d?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay datos para tendencia.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jobs fallidos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intent</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recentFailedJobs || []).map(job => {
                const createdAt = toDate(job.created_at);
                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Badge variant="outline">{job.intent}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-red-500" />
                        <span className="line-clamp-2">
                          {job.error?.message || 'Sin detalle'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {createdAt ? DATE_FORMAT.format(createdAt) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(data?.recentFailedJobs?.length || 0) === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No se registran fallos recientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
