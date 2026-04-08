'use client';

import type { StrategicAnalysisReport } from '@/types/strategic-analysis';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ChartNoAxesCombined, TriangleAlert } from 'lucide-react';

type Props = {
  report?: StrategicAnalysisReport | null;
  compact?: boolean;
};

export function StrategicAnalysisSummaryCard({ report, compact = false }: Props) {
  if (!report) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Centro de Inteligencia Gerencial</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Aun no hay analisis estrategicos para esta organizacion.
          <div className="mt-3">
            <Button asChild size="sm">
              <Link href="/analisis-estrategico/nuevo">Generar primer analisis</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalAlerts = report.risks_alerts.filter(item => item.level === 'critical').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Centro de Inteligencia Gerencial</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Ultimo informe: {new Date(report.created_at).toLocaleDateString('es-AR')}</p>
          </div>
          <Badge variant="outline">{report.analysis_scope}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">Score global</div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              <ChartNoAxesCombined className="h-5 w-5 text-blue-600" />
              {report.global_score ?? 0}
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">Brechas normativas</div>
            <div className="mt-1 text-2xl font-semibold">{report.norm_gaps.length}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">Alertas criticas</div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-red-600">
              <TriangleAlert className="h-5 w-5" />
              {criticalAlerts}
            </div>
          </div>
        </div>
        {!compact ? (
          <p className="mt-4 line-clamp-3 text-sm text-slate-700">{report.executive_summary || 'Sin resumen ejecutivo generado.'}</p>
        ) : null}
        <div className="mt-4">
          <Button asChild size="sm" variant="outline">
            <Link href={`/analisis-estrategico/${report.id}`}>
              Ver informe <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
