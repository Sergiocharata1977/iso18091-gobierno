'use client';

import { DocumentationRouteButton } from '@/components/docs/DocumentationRouteButton';
import { StrategicAnalysisReportView } from '@/components/strategic-analysis/StrategicAnalysisReportView';
import { StrategicSuggestedActionsPanel } from '@/components/strategic-analysis/StrategicSuggestedActionsPanel';
import { Button } from '@/components/ui/button';
import type { StrategicAnalysisReport } from '@/types/strategic-analysis';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AnalisisEstrategicoDetallePage() {
  const params = useParams<{ id: string }>();
  const reportId = params?.id;

  const [report, setReport] = useState<StrategicAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    let mounted = true;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/strategic-analysis/reports/${reportId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo cargar el informe');
        if (mounted) setReport(json.report || null);
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Error cargando informe');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadReport();
    return () => {
      mounted = false;
    };
  }, [reportId]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Detalle de analisis estrategico</h1>
          <p className="text-sm text-slate-600">Informe consolidado con prioridades y acciones.</p>
        </div>
        <div className="flex items-center gap-2">
          <DocumentationRouteButton route="/analisis-estrategico/[id]" label="Manual" />
          <Button asChild variant="outline">
            <Link href="/analisis-estrategico">Volver al historial</Link>
          </Button>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600">Cargando informe...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {report ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <StrategicAnalysisReportView report={report} />
          <StrategicSuggestedActionsPanel report={report} />
        </div>
      ) : null}
    </div>
  );
}
