'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { typography } from '@/components/design-system/tokens';
import { ExportDropdown } from '@/components/mcp/ExportDropdown';
import { ExportToSheetsDialog } from '@/components/mcp/ExportToSheetsDialog';
import { MCPExecutionList } from '@/components/mcp/MCPExecutionList';
import { TaskTemplateSelector } from '@/components/mcp/TaskTemplateSelector';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MCPTaskExecution } from '@/types/mcp';
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle,
  Clock,
  History,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MCPTab() {
  const { user, loading: authLoading } = useAuth();
  const [recentExecutions, setRecentExecutions] = useState<MCPTaskExecution[]>(
    []
  );
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    fail: 0,
    avgDuration: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.organization_id) {
      fetchData(user.organization_id);
    }
  }, [user]);

  const fetchData = async (orgId: string) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/mcp/ejecuciones?organization_id=${orgId}&limit=10`
      );
      const data = await res.json();

      if (data.success && data.data) {
        setRecentExecutions(data.data);
        const total = data.data.length;
        const success = data.data.filter(
          (e: MCPTaskExecution) => e.estado === 'exitoso'
        ).length;
        const fail = data.data.filter(
          (e: MCPTaskExecution) => e.estado === 'fallido'
        ).length;
        const duration =
          data.data.reduce(
            (acc: number, curr: MCPTaskExecution) =>
              acc + (curr.duracion_ms || 0),
            0
          ) / (total || 1);
        setStats({ total, success, fail, avgDuration: Math.round(duration) });
      }
    } catch (err) {
      console.error('Error loading dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
            <Bot className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className={typography.p}>Cargando panel MCP...</p>
        </div>
      </div>
    );
  }

  const successRate = stats.total
    ? Math.round((stats.success / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={typography.h2}>Panel MCP</h2>
            <p className={`${typography.p} flex items-center gap-1.5`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Monitor de automatizacion inteligente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TaskTemplateSelector />
          <ExportDropdown />
          <Link href="/mcp/history">
            <Button variant="outline" className="bg-background">
              <History className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Historial</span>
            </Button>
          </Link>
        </div>
        <ExportToSheetsDialog />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BaseCard className="bg-card/95">
          <div className="flex items-center justify-between mb-4">
            <span className={typography.label}>Ejecuciones</span>
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground">{stats.total}</div>
          <p className={typography.p}>en la ultima sesion</p>
        </BaseCard>

        <BaseCard className="bg-card/95">
          <div className="flex items-center justify-between mb-4">
            <span className={typography.label}>Tasa de Exito</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">
              {successRate}%
            </span>
            {successRate >= 80 && (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            )}
          </div>
          <p className={typography.p}>{stats.success} exitosos</p>
        </BaseCard>

        <BaseCard className="bg-card/95">
          <div className="flex items-center justify-between mb-4">
            <span className={typography.label}>Fallos</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-600">{stats.fail}</div>
          <p className={typography.p}>requieren atencion</p>
        </BaseCard>

        <BaseCard className="bg-card/95">
          <div className="flex items-center justify-between mb-4">
            <span className={typography.label}>Duracion Prom.</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-blue-600">
              {(stats.avgDuration / 1000).toFixed(1)}
            </span>
            <span className="text-lg font-medium text-blue-400">s</span>
          </div>
          <p className={typography.p}>por tarea</p>
        </BaseCard>
      </div>

      <BaseCard className="overflow-hidden">
        <div className="p-5 lg:p-6">
          <MCPExecutionList
            executions={recentExecutions}
            title="Ultima Actividad"
            limit={5}
          />
          <div className="mt-5 pt-4 border-t border-border text-center">
            <Link
              href="/mcp/history"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Ver historial completo
              <span className="text-lg">{'->'}</span>
            </Link>
          </div>
        </div>
      </BaseCard>
    </div>
  );
}
