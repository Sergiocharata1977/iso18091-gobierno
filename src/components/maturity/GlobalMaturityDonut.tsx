'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { typography } from '@/components/design-system/tokens';
import { CompanySize, FunctionalLevel, LevelStatus } from '@/types/maturity';
import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface GlobalMaturityDonutProps {
  levels: Record<FunctionalLevel, LevelStatus>;
  companySize?: CompanySize;
  className?: string;
}

const SIZE_WEIGHTS: Record<CompanySize, Record<FunctionalLevel, number>> = {
  micro: {
    [FunctionalLevel.LEVEL_1_OPERATION]: 0.45,
    [FunctionalLevel.LEVEL_2_SUPPORT]: 0.2,
    [FunctionalLevel.LEVEL_3_CONTROL]: 0.2,
    [FunctionalLevel.LEVEL_4_DIRECTION]: 0.15,
  },
  small: {
    [FunctionalLevel.LEVEL_1_OPERATION]: 0.4,
    [FunctionalLevel.LEVEL_2_SUPPORT]: 0.2,
    [FunctionalLevel.LEVEL_3_CONTROL]: 0.2,
    [FunctionalLevel.LEVEL_4_DIRECTION]: 0.2,
  },
  medium: {
    [FunctionalLevel.LEVEL_1_OPERATION]: 0.3,
    [FunctionalLevel.LEVEL_2_SUPPORT]: 0.25,
    [FunctionalLevel.LEVEL_3_CONTROL]: 0.25,
    [FunctionalLevel.LEVEL_4_DIRECTION]: 0.2,
  },
  large: {
    [FunctionalLevel.LEVEL_1_OPERATION]: 0.25,
    [FunctionalLevel.LEVEL_2_SUPPORT]: 0.25,
    [FunctionalLevel.LEVEL_3_CONTROL]: 0.25,
    [FunctionalLevel.LEVEL_4_DIRECTION]: 0.25,
  },
};

const LEVEL_NAMES: Record<FunctionalLevel, string> = {
  [FunctionalLevel.LEVEL_1_OPERATION]: 'Operacion',
  [FunctionalLevel.LEVEL_2_SUPPORT]: 'Apoyo',
  [FunctionalLevel.LEVEL_3_CONTROL]: 'Control',
  [FunctionalLevel.LEVEL_4_DIRECTION]: 'Direccion',
};

const LEVEL_COLORS: Record<FunctionalLevel, string> = {
  [FunctionalLevel.LEVEL_1_OPERATION]: '#3b82f6',
  [FunctionalLevel.LEVEL_2_SUPPORT]: '#10b981',
  [FunctionalLevel.LEVEL_3_CONTROL]: '#f59e0b',
  [FunctionalLevel.LEVEL_4_DIRECTION]: '#8b5cf6',
};

export const GlobalMaturityDonut: React.FC<GlobalMaturityDonutProps> = ({
  levels,
  companySize = 'small',
  className,
}) => {
  const { chartData, globalScore } = useMemo(() => {
    const weights = SIZE_WEIGHTS[companySize] || SIZE_WEIGHTS.small;

    const segments = Object.values(FunctionalLevel).map(levelKey => {
      const levelData = levels[levelKey];
      const score = levelData?.score || 0;
      const weight = weights[levelKey] || 0.25;
      const value = Math.round(score * weight);

      return {
        name: LEVEL_NAMES[levelKey],
        value,
        score,
        weight: Math.round(weight * 100),
        color: LEVEL_COLORS[levelKey],
        level: levelKey,
      };
    });

    const total = segments.reduce((sum, s) => sum + s.value, 0);

    return {
      chartData: segments,
      globalScore: total,
    };
  }, [levels, companySize]);

  return (
    <BaseCard className={className}>
      <div className="mb-2">
        <p className={`${typography.small} text-foreground`}>Madurez Global ISO 9001</p>
      </div>
      <div className="relative h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover rounded-lg border border-border p-3 text-sm shadow-sm">
                      <p className="font-medium" style={{ color: data.color }}>
                        {data.name}
                      </p>
                      <p className="text-muted-foreground">
                        Score: {data.score}% x Peso: {data.weight}%
                      </p>
                      <p className="text-foreground font-medium">Aporte: {data.value}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <span className="text-3xl font-bold text-foreground">{globalScore}%</span>
            <p className={typography.p}>Global</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.map(item => (
          <div key={item.level} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">
              {item.name}: {item.score}%
            </span>
          </div>
        ))}
      </div>
    </BaseCard>
  );
};
