'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AgentJob, JobStatus } from '@/types/agents';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 20;
const KNOWN_INTENTS = [
  'task.assign',
  'task.reminder',
  'whatsapp.message.received',
  'governance.alert.handle',
  'iso.consultation',
];

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | JobStatus }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Queued', value: 'queued' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Pending approval', value: 'pending_approval' },
];

interface JobsResponse {
  jobs: AgentJob[];
  total: number;
  limit: number;
  offset: number;
  availableIntents: string[];
}

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

function getStatusIcon(status: JobStatus) {
  if (status === 'completed')
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === 'failed' || status === 'cancelled')
    return <XCircle className="h-4 w-4 text-red-600" />;
  return <Clock3 className="h-4 w-4 text-amber-600" />;
}

function getIntentBadgeClass(intent: string): string {
  if (intent.startsWith('task.'))
    return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
  if (intent.startsWith('whatsapp.'))
    return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
  if (intent.startsWith('governance.'))
    return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
  if (intent.startsWith('iso.'))
    return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
  return 'bg-slate-100 text-slate-800 hover:bg-slate-100';
}

function getDuration(job: AgentJob): string {
  const start = toDate(job.started_at);
  const end = toDate(job.completed_at);
  if (!start || !end) return '-';

  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms < 0) return '-';
  if (ms < 1000) return `${ms} ms`;

  return `${(ms / 1000).toFixed(2)} s`;
}

export default function MCPHistoryPage() {
  const { usuario, loading: authLoading } = useCurrentUser();
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [status, setStatus] = useState<'all' | JobStatus>('all');
  const [intent, setIntent] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [availableIntents, setAvailableIntents] =
    useState<string[]>(KNOWN_INTENTS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const intents = useMemo(() => {
    return Array.from(new Set([...KNOWN_INTENTS, ...availableIntents])).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [availableIntents]);

  const loadData = async () => {
    if (!usuario?.organization_id) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('organizationId', usuario.organization_id);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((page - 1) * PAGE_SIZE));
      if (status !== 'all') params.set('status', status);
      if (intent !== 'all') params.set('intent', intent);

      const res = await fetch(`/api/mcp/jobs?${params.toString()}`);
      if (!res.ok) throw new Error('No se pudo cargar el historial');

      const payload = (await res.json()) as JobsResponse;
      setJobs(payload.jobs || []);
      setTotal(payload.total || 0);
      setAvailableIntents(payload.availableIntents || KNOWN_INTENTS);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuario?.organization_id) {
      loadData();
    }
  }, [usuario?.organization_id, status, intent, page]);

  const toggleDetail = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/mcp">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Historial de jobs MCP
            </h1>
            <p className="text-muted-foreground text-sm">
              Filtros por estado e intent, con paginacion de 20 items.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Acota resultados por estado e intent.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Estado</p>
            <Select
              value={status}
              onValueChange={value => {
                setStatus(value as 'all' | JobStatus);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Intent</p>
            <Select
              value={intent}
              onValueChange={value => {
                setIntent(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {intents.map(item => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-red-700">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intent</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Duracion</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No hay jobs para los filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map(job => {
                  const createdAt = toDate(job.created_at);
                  const isExpanded = expanded.has(job.id);

                  return (
                    <Fragment key={job.id}>
                      <TableRow>
                        <TableCell>
                          <Badge
                            className={getIntentBadgeClass(String(job.intent))}
                          >
                            {job.intent}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span className="text-sm">{job.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getDuration(job)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {createdAt ? createdAt.toLocaleString('es-AR') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDetail(job.id)}
                          >
                            {isExpanded ? 'Ocultar' : 'Ver detalle'}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-slate-50/60">
                            <div className="space-y-2 py-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Payload
                              </p>
                              <pre className="text-xs whitespace-pre-wrap break-all rounded border bg-white p-3">
                                {JSON.stringify(job.payload ?? {}, null, 2)}
                              </pre>
                              {job.error && (
                                <>
                                  <p className="text-xs font-medium text-red-700">
                                    Error
                                  </p>
                                  <pre className="text-xs whitespace-pre-wrap break-all rounded border border-red-200 bg-red-50 p-3 text-red-800">
                                    {JSON.stringify(job.error, null, 2)}
                                  </pre>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {jobs.length} de {total} jobs
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
