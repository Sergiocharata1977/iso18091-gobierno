'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  /** Value between 0 and 100 */
  value: number;
  /** Color variant */
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  /** Optional label text shown to the left */
  label?: string;
  /** Show percentage text to the right */
  showPercentage?: boolean;
  /** Height variant */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorMap = {
  primary: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  destructive: 'bg-red-500',
  info: 'bg-blue-500',
} as const;

const trackColorMap = {
  primary: 'bg-primary/10',
  success: 'bg-emerald-100 dark:bg-emerald-950/30',
  warning: 'bg-amber-100 dark:bg-amber-950/30',
  destructive: 'bg-red-100 dark:bg-red-950/30',
  info: 'bg-blue-100 dark:bg-blue-950/30',
} as const;

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
} as const;

export function ProgressBar({
  value,
  color = 'primary',
  label,
  showPercentage = false,
  size = 'md',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-xs font-semibold tabular-nums">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full overflow-hidden',
          trackColorMap[color],
          sizeMap[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorMap[color]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
