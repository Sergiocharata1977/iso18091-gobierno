'use client';

import { cn } from '@/lib/utils';
import { CalendarDays, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { BaseCard } from '../../primitives/BaseCard';
import { ProgressBar } from '../../primitives/ProgressBar';
import { typography } from '../../tokens';

interface KPIStatCardProps {
  label: string;
  value: string;
  progress?: {
    value: number;
    label?: string;
    color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  };
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function KPIStatCard({
  label,
  value,
  progress,
  subtext,
  icon,
  trend,
  className,
}: KPIStatCardProps) {
  const trendIcon =
    trend?.direction === 'up' ? (
      <TrendingUp className="h-3.5 w-3.5" />
    ) : trend?.direction === 'down' ? (
      <TrendingDown className="h-3.5 w-3.5" />
    ) : trend ? (
      <Minus className="h-3.5 w-3.5" />
    ) : null;

  return (
    <BaseCard className={cn('flex flex-col justify-between', className)}>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={typography.label}>{label}</span>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <div className="flex items-baseline gap-3">
          <span className={typography.display}>{value}</span>
          {trend ? (
            <span
              className={cn(
                'flex items-center gap-1 text-sm font-semibold',
                trend.direction === 'up' &&
                  'text-emerald-600 dark:text-emerald-400',
                trend.direction === 'down' && 'text-red-600 dark:text-red-400',
                trend.direction === 'neutral' && 'text-muted-foreground'
              )}
            >
              {trendIcon}
              {trend.value}
            </span>
          ) : null}
        </div>
      </div>

      {progress ? (
        <div className="mt-4">
          <ProgressBar
            value={progress.value}
            color={progress.color || 'primary'}
            label={progress.label}
            showPercentage
            size="sm"
          />
        </div>
      ) : null}

      {subtext ? (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{subtext}</span>
        </div>
      ) : null}
    </BaseCard>
  );
}
