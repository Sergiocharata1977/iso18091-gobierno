'use client';

import { WhatsAppJobDetail } from '@/components/rrhh/WhatsAppJobDetail';
import {
  WhatsAppJobFilters,
  WhatsAppJobListItem,
  WhatsAppJobsTable,
} from '@/components/rrhh/WhatsAppJobsTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const PAGE_SIZE = 20;

interface JobsApiResponse {
  jobs: WhatsAppJobListItem[];
  total: number;
  page: number;
  limit: number;
  pending_total?: number;
}

const DEFAULT_FILTERS: WhatsAppJobFilters = {
  status: 'all',
  intent: 'all',
  date_from: '',
  date_to: '',
};

export default function WhatsAppJobsPage() {
  const { usuario, loading: authLoading } = useCurrentUser();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<WhatsAppJobListItem[]>([]);
  const [filters, setFilters] = useState<WhatsAppJobFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<WhatsAppJobFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<WhatsAppJobListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchJobs = async (pageToLoad: number, selectedFilters: WhatsAppJobFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(pageToLoad));
      params.set('limit', String(PAGE_SIZE));
      if (selectedFilters.status !== 'all') params.set('status', selectedFilters.status);
      if (selectedFilters.intent !== 'all') params.set('intent', selectedFilters.intent);
      if (selectedFilters.date_from) {
        params.set('date_from', new Date(`${selectedFilters.date_from}T00:00:00`).toISOString());
      }
      if (selectedFilters.date_to) {
        params.set('date_to', new Date(`${selectedFilters.date_to}T23:59:59`).toISOString());
      }

      const response = await fetch(`/api/rrhh/whatsapp-jobs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar el historial de jobs');
      }

      const data = (await response.json()) as JobsApiResponse;
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
      setPendingTotal(data.pending_total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!usuario?.organization_id) return;
    fetchJobs(page, appliedFilters);
  }, [usuario?.organization_id, page, appliedFilters]);

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handleRetry = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const response = await fetch(`/api/rrhh/whatsapp-jobs/${jobId}/retry`, {
        method: 'POST',
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'No se pudo reintentar el job');
      }

      toast({
        title: 'Job reintentado',
        description: 'Se creo un nuevo job en estado pending.',
      });

      await fetchJobs(page, appliedFilters);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo reintentar';
      toast({
        title: 'Error al reintentar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setRetryingJobId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (!usuario?.organization_id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No se encontro una organizacion para el usuario actual.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              WhatsApp RRHH - Historial de Mensajes
            </h1>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                Pendientes: {pendingTotal}
              </Badge>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => fetchJobs(page, appliedFilters)}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-red-700">{error}</CardContent>
          </Card>
        )}

        <WhatsAppJobsTable
          jobs={jobs}
          loading={loading}
          filters={filters}
          retryingJobId={retryingJobId}
          onFiltersChange={setFilters}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          onViewDetail={job => {
            setSelectedJob(job);
            setDetailOpen(true);
          }}
          onRetry={handleRetry}
        />

        <div className="flex items-center justify-between rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {jobs.length} de {total} jobs
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Pagina {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      <WhatsAppJobDetail
        open={detailOpen}
        job={selectedJob}
        retrying={retryingJobId === selectedJob?.id}
        onOpenChange={setDetailOpen}
        onRetry={handleRetry}
      />
    </div>
  );
}

