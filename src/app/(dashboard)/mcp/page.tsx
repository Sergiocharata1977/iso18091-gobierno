'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Bot, Clock3, Loader2, RefreshCw, Route, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface StatsResponse {
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
}

export default function MCPDashboardPage() {
  const { usuario, loading: authLoading } = useCurrentUser();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
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

      const payload = (await res.json()) as StatsResponse;
      setStats(payload);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuario?.organization_id) {
      fetchStats();
    }
  }, [usuario?.organization_id]);

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
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              MCP Control Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Systems / MCP. Supervisa jobs, metricas y perfiles de agentes.
            </p>
          </div>
        </div>
        <Button onClick={fetchStats} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Actualizar resumen
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resumen rapido</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Jobs hoy (aprox.)</p>
            <p className="mt-1 text-2xl font-bold">
              {stats?.windows.last24h ?? 0}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Exito global</p>
            <p className="mt-1 text-2xl font-bold">
              {stats?.stats.successRate ?? 0}%
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">En cola</p>
            <p className="mt-1 text-2xl font-bold">
              {stats?.stats.queuedJobs ?? 0}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4" />
              Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              KPIs, tendencia 7 dias y ultimos jobs fallidos.
            </p>
            <Link href="/mcp/dashboard">
              <Button className="w-full">Abrir dashboard</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Historial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Filtros por status/intent, paginacion y detalle de payload.
            </p>
            <Link href="/mcp/history">
              <Button variant="outline" className="w-full">
                Abrir historial
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Perfiles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vista de perfiles de agente y roadmap de capacidades.
            </p>
            <Link href="/mcp/profiles">
              <Button variant="outline" className="w-full">
                Abrir perfiles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
