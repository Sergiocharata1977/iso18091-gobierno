'use client';

import type { StrategicAnalysisReport } from '@/types/strategic-analysis';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  reports: StrategicAnalysisReport[];
};

export function StrategicAnalysisHistoryTable({ reports }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de informes</CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-600">No hay informes disponibles.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                  <th className="py-2 pr-4 font-medium">Titulo</th>
                  <th className="py-2 pr-4 font-medium">Scope</th>
                  <th className="py-2 pr-4 font-medium">Score</th>
                  <th className="py-2 font-medium">Accion</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => (
                  <tr key={report.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{new Date(report.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="py-3 pr-4">{report.title}</td>
                    <td className="py-3 pr-4">{report.analysis_scope}</td>
                    <td className="py-3 pr-4">{report.global_score ?? '-'}</td>
                    <td className="py-3">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/analisis-estrategico/${report.id}`}>Abrir</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
