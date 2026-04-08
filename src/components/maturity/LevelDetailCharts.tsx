'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { typography } from '@/components/design-system/tokens';
import { FunctionalLevel, LevelStatus } from '@/types/maturity';
import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface LevelDetailChartsProps {
  levels: Record<FunctionalLevel, LevelStatus>;
}

const LEVEL_TITLES: Record<FunctionalLevel, string> = {
  [FunctionalLevel.LEVEL_1_OPERATION]: 'Nivel 1: Operacion Diaria',
  [FunctionalLevel.LEVEL_2_SUPPORT]: 'Nivel 2: Estructura de Apoyo',
  [FunctionalLevel.LEVEL_3_CONTROL]: 'Nivel 3: Control y Mejora',
  [FunctionalLevel.LEVEL_4_DIRECTION]: 'Nivel 4: Direccion Estrategica',
};

const LEVEL_COLORS: Record<FunctionalLevel, string> = {
  [FunctionalLevel.LEVEL_1_OPERATION]: '#3b82f6',
  [FunctionalLevel.LEVEL_2_SUPPORT]: '#10b981',
  [FunctionalLevel.LEVEL_3_CONTROL]: '#f59e0b',
  [FunctionalLevel.LEVEL_4_DIRECTION]: '#8b5cf6',
};

export const LevelDetailCharts: React.FC<LevelDetailChartsProps> = ({
  levels,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Object.values(FunctionalLevel).map(levelKey => {
        const levelData = levels[levelKey];
        if (!levelData) return null;

        const color = LEVEL_COLORS[levelKey];

        const donutData = [
          { name: 'Completado', value: levelData.score, color },
          { name: 'Pendiente', value: 100 - levelData.score, color: '#e5e7eb' },
        ];

        return (
          <BaseCard key={levelKey} className="flex flex-col h-full">
            <div className="pb-2">
              <div className="flex justify-between items-center">
                <p className={`${typography.small} text-foreground`}>
                  {LEVEL_TITLES[levelKey]}
                </p>
                <span className="text-xl font-bold" style={{ color }}>
                  {levelData.score}%
                </span>
              </div>
            </div>
            <div className="flex-1 pt-2">
              <div className="flex gap-4">
                <div className="relative w-[120px] h-[120px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover rounded-lg border border-border p-2 text-xs shadow-sm">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-muted-foreground">{data.value}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold" style={{ color }}>
                      {levelData.score}%
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {levelData.tasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span
                        className={`truncate ${task.score > 0 ? 'text-foreground' : 'text-muted-foreground/60'}`}
                        title={task.name}
                      >
                        {task.name}
                      </span>
                      <span
                        className={`ml-2 font-medium ${task.score > 0 ? 'text-foreground' : 'text-muted-foreground/60'}`}
                      >
                        {task.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </BaseCard>
        );
      })}
    </div>
  );
};
