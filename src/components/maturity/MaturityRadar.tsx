'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { typography } from '@/components/design-system/tokens';
import { FunctionalLevel, LevelStatus } from '@/types/maturity';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface MaturityRadarProps {
  levels: Record<FunctionalLevel, LevelStatus>;
  className?: string;
  interactive?: boolean;
}

const LEVEL_LABELS: Record<FunctionalLevel, string> = {
  [FunctionalLevel.LEVEL_1_OPERATION]: 'Operacion',
  [FunctionalLevel.LEVEL_2_SUPPORT]: 'Apoyo',
  [FunctionalLevel.LEVEL_3_CONTROL]: 'Control',
  [FunctionalLevel.LEVEL_4_DIRECTION]: 'Direccion',
};

const LEVEL_ROUTES: Record<FunctionalLevel, string> = {
  [FunctionalLevel.LEVEL_1_OPERATION]: '/procesos',
  [FunctionalLevel.LEVEL_2_SUPPORT]: '/rrhh',
  [FunctionalLevel.LEVEL_3_CONTROL]: '/mejoras/hallazgos',
  [FunctionalLevel.LEVEL_4_DIRECTION]: '/planificacion-revision-direccion',
};

const LEVEL_COLORS: Record<FunctionalLevel, string> = {
  [FunctionalLevel.LEVEL_1_OPERATION]: '#3b82f6',
  [FunctionalLevel.LEVEL_2_SUPPORT]: '#10b981',
  [FunctionalLevel.LEVEL_3_CONTROL]: '#f59e0b',
  [FunctionalLevel.LEVEL_4_DIRECTION]: '#8b5cf6',
};

export const MaturityRadar: React.FC<MaturityRadarProps> = ({
  levels,
  className,
  interactive = true,
}) => {
  const router = useRouter();

  const data = Object.values(FunctionalLevel).map(levelKey => {
    const levelData = levels[levelKey];
    return {
      subject: LEVEL_LABELS[levelKey],
      score: levelData ? levelData.score : 0,
      fullMark: 100,
      level: levelKey,
      route: LEVEL_ROUTES[levelKey],
      color: LEVEL_COLORS[levelKey],
    };
  });

  const handleClick = useCallback(
    (dataPoint: { route: string }) => {
      if (interactive && dataPoint?.route) {
        router.push(dataPoint.route);
      }
    },
    [router, interactive]
  );

  const CustomTick = ({
    payload,
    x,
    y,
    textAnchor,
  }: {
    payload: { value: string };
    x: number;
    y: number;
    textAnchor: 'start' | 'middle' | 'end' | 'inherit' | undefined;
  }) => {
    const dataPoint = data.find(d => d.subject === payload.value);

    return (
      <g
        onClick={() => dataPoint && handleClick(dataPoint)}
        style={{ cursor: interactive ? 'pointer' : 'default' }}
      >
        <text
          x={x}
          y={y}
          textAnchor={textAnchor || 'middle'}
          fill={dataPoint?.color || '#6b7280'}
          fontSize={12}
          fontWeight={500}
          className={interactive ? 'hover:underline' : ''}
        >
          {payload.value}
        </text>
        {interactive && (
          <text
            x={x}
            y={y + 14}
            textAnchor={textAnchor || 'middle'}
            fill="#94a3b8"
            fontSize={10}
          >
            {dataPoint?.score}%
          </text>
        )}
      </g>
    );
  };

  return (
    <BaseCard className={className}>
      <div className="mb-3">
        <p className={`${typography.small} text-foreground`}>Mapa de Madurez</p>
        <p className={typography.p}>
          {interactive
            ? 'Click en un eje para ir al modulo'
            : 'Balance entre los 4 ejes fundamentales'}
        </p>
      </div>
      <div className="h-[300px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="subject" tick={CustomTick as any} />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Madurez Actual"
              dataKey="score"
              stroke="#2563eb"
              fill="#3b82f6"
              fillOpacity={0.5}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const tooltipData = payload[0].payload;
                  return (
                    <div className="bg-popover rounded-lg border border-border p-3 text-sm shadow-sm">
                      <p
                        className="font-medium"
                        style={{ color: tooltipData.color }}
                      >
                        {tooltipData.subject}
                      </p>
                      <p className="text-foreground font-bold">{tooltipData.score}%</p>
                      {interactive && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Click para abrir el modulo
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </BaseCard>
  );
};
