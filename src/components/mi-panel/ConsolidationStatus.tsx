'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConsolidationItem } from './types';

interface ConsolidationStatusProps {
  consolidationItems: ConsolidationItem[];
  registrosVencidos: number;
  measurementAlerts: {
    pending: number;
    overdue: number;
  };
  sessions: number;
}

export function ConsolidationStatus({
  consolidationItems,
  registrosVencidos,
  measurementAlerts,
  sessions,
}: ConsolidationStatusProps) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Estado de consolidacion de Mi Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Registros vencidos</p>
            <p className="text-2xl font-semibold">{registrosVencidos}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Mediciones vencidas</p>
            <p className="text-2xl font-semibold">
              {measurementAlerts.overdue}
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Sesiones IA</p>
            <p className="text-2xl font-semibold">{sessions}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {consolidationItems.map(item => (
            <div
              key={item.label}
              className={`rounded-lg border p-3 ${item.ready ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-sm text-slate-900">
                  {item.label}
                </p>
                <Badge variant={item.ready ? 'default' : 'secondary'}>
                  {item.ready ? 'Cubierto' : 'Pendiente'}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
