'use client';

import type { StrategicAnalysisReport } from '@/types/strategic-analysis';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StrategicAnalysisReportView({ report }: { report: StrategicAnalysisReport }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{report.title}</CardTitle>
            <Badge variant="outline">{report.reading_orientation}</Badge>
            <Badge variant="outline">{report.horizon}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-700">{report.executive_summary || 'Sin resumen ejecutivo.'}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Score global" value={report.global_score ?? 0} />
            <Metric label="Brechas normativas" value={report.norm_gaps.length} />
            <Metric label="Prioridades" value={report.priorities.length} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prioridades 30/60/90</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.priorities.length === 0 ? (
            <p className="text-sm text-slate-500">Sin prioridades generadas.</p>
          ) : (
            report.priorities.map(priority => (
              <div key={priority.id} className="rounded-lg border p-3">
                <div className="mb-1 text-xs uppercase text-slate-500">{priority.horizonte}</div>
                <div className="font-medium">{priority.titulo}</div>
                <p className="mt-1 text-sm text-slate-600">{priority.descripcion}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informe renderizado</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm text-slate-700">{report.rendered_markdown || 'Sin markdown generado.'}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
