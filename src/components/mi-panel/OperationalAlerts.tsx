'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OperationalAlertsProps {
  overdueRecords: number;
  overdueMeasurements: number;
  sessions: number;
}

export function OperationalAlerts({
  overdueRecords,
  overdueMeasurements,
  sessions,
}: OperationalAlertsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas operativas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="font-medium text-red-700">{overdueRecords}</p>
          <p className="text-xs text-red-600">registros de proceso vencidos</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="font-medium text-amber-800">{overdueMeasurements}</p>
          <p className="text-xs text-amber-700">
            indicadores con medicion vencida
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="font-medium text-slate-900">{sessions}</p>
          <p className="text-xs text-slate-600">
            sesiones IA cargadas en la vista
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
