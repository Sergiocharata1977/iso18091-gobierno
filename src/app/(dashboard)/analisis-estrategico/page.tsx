'use client';

import { DocumentationRouteButton } from '@/components/docs/DocumentationRouteButton';
import { StrategicAnalysisHistoryTable } from '@/components/strategic-analysis/StrategicAnalysisHistoryTable';
import { StrategicAnalysisSummaryCard } from '@/components/strategic-analysis/StrategicAnalysisSummaryCard';
import { Button } from '@/components/ui/button';
import type { StrategicAnalysisReport } from '@/types/strategic-analysis';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AnalisisEstrategicoPage() {
  const [reports, setReports] = useState<StrategicAnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/strategic-analysis/reports?limit=25');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo cargar el historial');
        if (mounted) {
          setReports(Array.isArray(json.reports) ? json.reports : []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Error cargando historial');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadReports();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analisis estrategico</h1>
          <p className="text-sm text-slate-600">Centro de Inteligencia Gerencial</p>
        </div>
        <div className="flex items-center gap-2">
          <DocumentationRouteButton route="/analisis-estrategico" label="Manual" />
          <Button asChild>
            <Link href="/analisis-estrategico/nuevo">Nuevo analisis</Link>
          </Button>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600">Cargando informes...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading ? <StrategicAnalysisSummaryCard report={reports[0]} /> : null}
      {!loading ? <StrategicAnalysisHistoryTable reports={reports} /> : null}
    </div>
  );
}
