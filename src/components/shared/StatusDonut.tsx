'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface StatusDonutProps {
  completitud: number; // 0-100
  cumplimiento: number; // 0-100
}

export function StatusDonut({ completitud, cumplimiento }: StatusDonutProps) {
  const dataCompletitud = [
    { name: 'Información', value: completitud },
    { name: 'Faltante', value: 100 - completitud },
  ];

  const dataCumplimiento = [
    { name: 'Cumplimiento', value: cumplimiento },
    { name: 'Brecha', value: 100 - cumplimiento },
  ];

  const COLORS_COMPLETITUD = ['#3b82f6', '#e5e7eb']; // Blue-500
  const COLORS_CUMPLIMIENTO = ['#10b981', '#e5e7eb']; // Emerald-500

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-[300px] md:min-w-[500px]">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm font-medium text-gray-500">
            Completitud de Información
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="h-40 w-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataCompletitud}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {dataCompletitud.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS_COMPLETITUD[index % COLORS_COMPLETITUD.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-blue-600">
                {completitud}%
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Campos completados en el formulario
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm font-medium text-gray-500">
            Nivel de Cumplimiento ISO
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="h-40 w-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataCumplimiento}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {dataCumplimiento.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS_CUMPLIMIENTO[index % COLORS_CUMPLIMIENTO.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-emerald-600">
                {cumplimiento}%
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Estado vigente y validado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
