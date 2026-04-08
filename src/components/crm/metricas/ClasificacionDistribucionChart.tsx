'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClasificacionDistribucionChartProps {
  criterio: string;
  datos: Record<string, number>;
}

export function ClasificacionDistribucionChart({
  criterio,
  datos,
}: ClasificacionDistribucionChartProps) {
  const entries = Object.entries(datos).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const max = entries[0]?.[1] || 0;

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">Clientes por {criterio}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length ? (
          <div className="space-y-4">
            {entries.map(([label, value]) => {
              const percent = total > 0 ? (value / total) * 100 : 0;
              const width = max > 0 ? (value / max) * 100 : 0;

              return (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="text-slate-500">
                      {value} ({percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No hay datos suficientes para este criterio.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
