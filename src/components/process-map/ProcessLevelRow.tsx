'use client';

import type { ProcessLevel, ProcessMetric } from '@/types/process-map';
import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ProcessCard } from './ProcessCard';

const LEVEL_LABEL_COLORS: Record<string, string> = {
  emerald:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  blue:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  violet:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
  amber:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
};

const LINE_COLORS: Record<string, string> = {
  emerald:
    'bg-gradient-to-b from-emerald-200 to-emerald-400 dark:from-emerald-800 dark:to-emerald-600',
  blue:
    'bg-gradient-to-b from-blue-200 to-blue-400 dark:from-blue-800 dark:to-blue-600',
  violet:
    'bg-gradient-to-b from-violet-200 to-violet-400 dark:from-violet-800 dark:to-violet-600',
  amber:
    'bg-gradient-to-b from-amber-200 to-amber-400 dark:from-amber-800 dark:to-amber-600',
};

interface ProcessLevelRowProps {
  level: ProcessLevel;
  isLast: boolean;
  metrics?: Record<string, ProcessMetric>;
}

export function ProcessLevelRow({
  level,
  isLast,
  metrics,
}: ProcessLevelRowProps) {
  const pathname = usePathname();
  const sorted = [...level.items]
    .filter(i => i.visible)
    .sort((a, b) => a.order - b.order);

  const labelColor = LEVEL_LABEL_COLORS[level.color] ?? LEVEL_LABEL_COLORS.emerald;
  const lineColor = LINE_COLORS[level.color] ?? LINE_COLORS.emerald;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-4 flex w-full max-w-6xl flex-col items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] shadow-sm ${labelColor}`}
        >
          Nivel {level.level}
        </span>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {level.title}
          </p>
          <div className="mx-auto mt-2 h-px w-32 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-700" />
        </div>
      </div>

      <div className="flex w-full max-w-6xl flex-wrap justify-center gap-3 pb-2">
        {sorted.map(item => (
          <ProcessCard
            key={item.processKey}
            item={item}
            color={level.color}
            isActive={item.route ? pathname?.startsWith(item.route) : false}
            metric={metrics?.[item.processKey]}
          />
        ))}
      </div>

      {!isLast && (
        <div className="my-3 flex flex-col items-center">
          <div className={`h-8 w-px ${lineColor}`} />
          <div className="mt-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          </div>
        </div>
      )}
    </div>
  );
}
