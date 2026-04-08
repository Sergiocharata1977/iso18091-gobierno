'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bot,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Play,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Zap,
  TrendingUp,
  BarChart3,
  Shield,
  MessageSquare,
  Target,
  Bell,
  FileSearch,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface AgentGlobalStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  queuedJobs: number;
  runningJobs: number;
  successRate: number;
  avgExecutionTimeMs: number;
}

interface TrendDay {
  day: string;
  total: number;
  completed: number;
  failed: number;
}

interface AgentJob {
  id: string;
  organization_id: string;
  user_id: string;
  agent_instance_id: string;
  intent: string;
  payload: any;
  status:
    | 'queued'
    | 'running'
    | 'pending_approval'
    | 'completed'
    | 'failed'
    | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  result?: any;
  error?: { code: string; message: string };
  attempts: number;
  max_attempts: number;
  created_at: string | { _seconds: number };
  updated_at: string | { _seconds: number };
  started_at?: string | { _seconds: number };
  completed_at?: string | { _seconds: number };
  workflow_id?: string;
  step_index?: number;
}

interface DetailedStats {
  stats: AgentGlobalStats;
  windows: { last24h: number; last7d: number; last30d: number };
  trend7d: TrendDay[];
  recentFailedJobs: AgentJob[];
}

interface ActivityResponse {
  jobs: AgentJob[];
  total: number;
  limit: number;
  offset: number;
  availableIntents: string[];
  filters: { status: string | null; intent: string | null };
}

// ============================================
// HELPERS
// ============================================

function parseDate(
  value: string | { _seconds: number } | undefined
): Date | null {
  if (!value) return null;
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'object' && '_seconds' in value)
    return new Date(value._seconds * 1000);
  return null;
}

function timeAgo(date: Date | null): string {
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const INTENT_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  'iso.consultation': {
    label: 'Consulta ISO',
    icon: FileSearch,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  },
  'crm.lead.score': {
    label: 'Lead Scoring',
    icon: Target,
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
  },
  'task.assign': {
    label: 'Asignar Tarea',
    icon: Users,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  },
  'task.reminder': {
    label: 'Recordatorio',
    icon: Bell,
    color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
  },
  'governance.alert.handle': {
    label: 'Alerta Gobernanza',
    icon: Shield,
    color: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  },
  'whatsapp.message.received': {
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  },
  'quality.measurement.overdue.notify': {
    label: 'Medición Vencida',
    icon: AlertTriangle,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  },
  'crm.follow.up': {
    label: 'Seguimiento CRM',
    icon: TrendingUp,
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30',
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  queued: {
    label: 'En Cola',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
  },
  running: {
    label: 'Ejecutando',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
  },
  completed: {
    label: 'Completado',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
  },
  failed: {
    label: 'Fallido',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/40',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  pending_approval: {
    label: 'Esperando Aprobación',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40',
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítica', color: 'text-red-600' },
  high: { label: 'Alta', color: 'text-orange-600' },
  normal: { label: 'Normal', color: 'text-gray-600' },
  low: { label: 'Baja', color: 'text-gray-400' },
};

// ============================================
// SUB-COMPONENTS
// ============================================

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2.5 rounded-xl', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function TrendChart({ data }: { data: TrendDay[] }) {
  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Actividad últimos 7 días
        </h3>
      </div>
      <div className="flex items-end gap-2 h-32">
        {data.map((day, i) => {
          const height = Math.max((day.total / maxTotal) * 100, 4);
          const completedHeight =
            day.total > 0 ? (day.completed / day.total) * height : 0;
          const failedHeight =
            day.total > 0 ? (day.failed / day.total) * height : 0;
          const otherHeight = height - completedHeight - failedHeight;
          const dayLabel = new Date(day.day).toLocaleDateString('es', {
            weekday: 'short',
          });

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full flex flex-col-reverse rounded-t-md overflow-hidden"
                style={{ height: '100px' }}
              >
                <div
                  className="w-full bg-emerald-500 transition-all duration-500"
                  style={{ height: `${completedHeight}%` }}
                  title={`Completados: ${day.completed}`}
                />
                <div
                  className="w-full bg-red-400 transition-all duration-500"
                  style={{ height: `${failedHeight}%` }}
                  title={`Fallidos: ${day.failed}`}
                />
                <div
                  className="w-full bg-blue-300 transition-all duration-500"
                  style={{ height: `${otherHeight}%` }}
                  title={`Otros: ${day.total - day.completed - day.failed}`}
                />
              </div>
              <span className="text-[10px] text-gray-400 capitalize">
                {dayLabel}
              </span>
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                {day.total}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Completados
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Fallidos
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-300" /> En proceso
        </span>
      </div>
    </div>
  );
}

function IntentBadge({ intent }: { intent: string }) {
  const config = INTENT_CONFIG[intent] || {
    label: intent,
    icon: Zap,
    color: 'text-gray-600 bg-gray-50 dark:bg-gray-800',
  };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
        config.color
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.color,
        config.bgColor
      )}
    >
      {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'failed' && <XCircle className="w-3 h-3" />}
      {status === 'queued' && <Clock className="w-3 h-3" />}
      {status === 'pending_approval' && <AlertTriangle className="w-3 h-3" />}
      {config.label}
    </span>
  );
}

function JobRow({ job }: { job: AgentJob }) {
  const created = parseDate(job.created_at);
  const priorityCfg = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.normal;

  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <IntentBadge intent={job.intent} />
          <StatusBadge status={job.status} />
          {job.priority !== 'normal' && (
            <span className={cn('text-xs font-medium', priorityCfg.color)}>
              ● {priorityCfg.label}
            </span>
          )}
        </div>
        {job.error && (
          <p className="text-xs text-red-500 mt-1 truncate">
            ❌ {job.error.message}
          </p>
        )}
        {job.workflow_id && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Workflow: {job.workflow_id.slice(0, 8)}... paso{' '}
            {(job.step_index ?? 0) + 1}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-gray-400">
          {created ? timeAgo(created) : ''}
        </p>
        <p className="text-[10px] text-gray-300">
          Intento {job.attempts}/{job.max_attempts}
        </p>
      </div>
    </div>
  );
}

// ============================================
// HOW IT WORKS SECTION
// ============================================

function HowItWorks() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-700/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-emerald-100/30 dark:hover:bg-emerald-800/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-xl">
            <Bot className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              ¿Cómo funciona el Sistema Multiagente?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Arquitectura, componentes y flujo de ejecución
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-400 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 text-sm text-gray-600 dark:text-gray-300 border-t border-emerald-200/30 dark:border-emerald-700/20">
          {/* Architecture */}
          <div className="mt-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" /> Arquitectura
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-white/70 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <p className="font-semibold text-emerald-600 text-xs mb-1">
                  🧠 Supervisor (Orquestador)
                </p>
                <p className="text-xs text-gray-500">
                  Recibe una meta compleja, la descompone en pasos usando LLM
                  (Groq/Claude) y crea los jobs.
                </p>
              </div>
              <div className="p-3 bg-white/70 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <p className="font-semibold text-blue-600 text-xs mb-1">
                  📋 Cola de Jobs (Queue)
                </p>
                <p className="text-xs text-gray-500">
                  Jobs en Firestore con prioridades, leasing, reintentos con
                  backoff exponencial y aprobación humana.
                </p>
              </div>
              <div className="p-3 bg-white/70 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <p className="font-semibold text-purple-600 text-xs mb-1">
                  ⚙️ Worker (Ejecutor)
                </p>
                <p className="text-xs text-gray-500">
                  Procesa jobs, ejecuta handlers por intent, enriquece con
                  contexto y reporta resultados.
                </p>
              </div>
            </div>
          </div>

          {/* Flow */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> Flujo de Ejecución
            </h4>
            <div className="flex flex-col gap-1.5">
              {[
                {
                  step: '1',
                  text: 'Chat o sistema envía un objetivo al Supervisor',
                  icon: '💬',
                },
                {
                  step: '2',
                  text: 'Supervisor descompone en pasos (plan) con LLM',
                  icon: '🧠',
                },
                {
                  step: '3',
                  text: 'Cada paso se encola como Job en Firestore',
                  icon: '📋',
                },
                {
                  step: '4',
                  text: 'Worker toma el job, adquiere lease, enriquece con contexto',
                  icon: '🔒',
                },
                {
                  step: '5',
                  text: 'Handler ejecuta la acción (consulta ISO, scoring, etc.)',
                  icon: '⚡',
                },
                {
                  step: '6',
                  text: 'Resultado se guarda y SagaService monitorea el workflow',
                  icon: '✅',
                },
              ].map(item => (
                <div
                  key={item.step}
                  className="flex items-center gap-2 py-1 px-2 rounded-lg bg-white/50 dark:bg-gray-800/30"
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Intents */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" /> Capacidades
              (Intents)
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(INTENT_CONFIG).map(([key, cfg]) => (
                <IntentBadge key={key} intent={key} />
              ))}
            </div>
          </div>

          {/* How to test */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
              <Play className="w-4 h-4 text-green-500" /> Cómo Probarlo
            </h4>
            <div className="space-y-1.5 text-xs">
              <p>
                • <strong>Desde el Chat:</strong> Preguntá cosas como{' '}
                <em>&quot;¿Cuántos hallazgos pendientes hay?&quot;</em> — el
                chat usa tools de Groq para ejecutar acciones.
              </p>
              <p>
                • <strong>API Jobs:</strong>{' '}
                <code className="bg-gray-200/50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded text-emerald-600">
                  GET /api/agents/jobs
                </code>{' '}
                — Lista y filtra jobs por estado/intent.
              </p>
              <p>
                • <strong>API Stats:</strong>{' '}
                <code className="bg-gray-200/50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded text-emerald-600">
                  GET /api/agents/stats?detailed=true
                </code>{' '}
                — Dashboard de métricas.
              </p>
              <p>
                • <strong>Este Panel:</strong> Visualizá en tiempo real el
                estado de todos los agentes y sus trabajos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AgentsDashboard() {
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/agents/stats?detailed=true'),
        fetch(
          `/api/agents/jobs?limit=20&status=${statusFilter}&intent=${intentFilter}`
        ),
      ]);

      if (!statsRes.ok || !activityRes.ok) {
        throw new Error('Error loading agent data');
      }

      const [statsData, activityData] = await Promise.all([
        statsRes.json(),
        activityRes.json(),
      ]);

      setStats(statsData);
      setActivity(activityData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, intentFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Cargando sistema multiagente...
          </p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const s = stats?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Centro de Agentes IA
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sistema Multiagente Don Cándido — {s?.totalJobs || 0} jobs
              procesados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
              autoRefresh
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            <Activity
              className={cn('w-3.5 h-3.5', autoRefresh && 'animate-pulse')}
            />
            {autoRefresh ? 'Auto' : 'Pausado'}
          </button>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* How it works */}
      <HowItWorks />

      {/* Stats Cards */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={Activity}
            label="Total Jobs"
            value={s.totalJobs}
            subtitle={`Últimas 24h: ${stats?.windows.last24h || 0}`}
            color="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completados"
            value={s.completedJobs}
            subtitle={`Tasa: ${s.successRate}%`}
            color="bg-green-100 text-green-600 dark:bg-green-900/30"
          />
          <StatCard
            icon={XCircle}
            label="Fallidos"
            value={s.failedJobs}
            color="bg-red-100 text-red-600 dark:bg-red-900/30"
          />
          <StatCard
            icon={Clock}
            label="En Cola"
            value={s.queuedJobs}
            color="bg-amber-100 text-amber-600 dark:bg-amber-900/30"
          />
          <StatCard
            icon={Play}
            label="Ejecutando"
            value={s.runningJobs}
            color="bg-purple-100 text-purple-600 dark:bg-purple-900/30"
          />
          <StatCard
            icon={Zap}
            label="Tiempo Prom."
            value={
              s.avgExecutionTimeMs > 0 ? formatMs(s.avgExecutionTimeMs) : '—'
            }
            subtitle="Por ejecución"
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
          />
        </div>
      )}

      {/* Windows summary */}
      {stats?.windows && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.windows.last24h}
            </p>
            <p className="text-xs text-gray-400">Últimas 24h</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.windows.last7d}
            </p>
            <p className="text-xs text-gray-400">Últimos 7 días</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.windows.last30d}
            </p>
            <p className="text-xs text-gray-400">Últimos 30 días</p>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      {stats?.trend7d && stats.trend7d.length > 0 && (
        <TrendChart data={stats.trend7d} />
      )}

      {/* Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Actividad de Agentes
              {activity && (
                <span className="text-xs font-normal text-gray-400">
                  ({activity.total} total)
                </span>
              )}
            </h3>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <option value="all">Todos los estados</option>
                <option value="queued">En Cola</option>
                <option value="running">Ejecutando</option>
                <option value="completed">Completados</option>
                <option value="failed">Fallidos</option>
                <option value="pending_approval">Pendientes Aprobación</option>
              </select>
              <select
                value={intentFilter}
                onChange={e => setIntentFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                <option value="all">Todos los intents</option>
                {(activity?.availableIntents || []).map(intent => (
                  <option key={intent} value={intent}>
                    {INTENT_CONFIG[intent]?.label || intent}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {activity?.jobs && activity.jobs.length > 0 ? (
            activity.jobs.map(job => <JobRow key={job.id} job={job} />)
          ) : (
            <div className="py-12 text-center">
              <Bot className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                No hay actividad de agentes
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Los agentes se activarán cuando reciban tareas
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Failures */}
      {stats?.recentFailedJobs && stats.recentFailedJobs.length > 0 && (
        <div className="bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-200/50 dark:border-red-800/30 overflow-hidden">
          <div className="p-4 border-b border-red-200/30 dark:border-red-800/20">
            <h3 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Últimos Fallos
            </h3>
          </div>
          <div className="divide-y divide-red-100/50 dark:divide-red-800/20">
            {stats.recentFailedJobs.map(job => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
