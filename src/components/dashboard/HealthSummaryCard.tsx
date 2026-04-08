'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Minus,
} from 'lucide-react';

type HealthTone = 'healthy' | 'warning' | 'neutral';

interface HealthSummaryMetric {
  label: string;
  value: string;
  detail: string;
}

interface HealthSummaryCardProps {
  title: string;
  status: string;
  score: string;
  summary: string;
  focusLabel: string;
  focusValue: string;
  metrics: HealthSummaryMetric[];
  tone?: HealthTone;
  className?: string;
}

const toneStyles: Record<
  HealthTone,
  {
    badge: 'success' | 'warning' | 'secondary';
    ring: string;
    panel: string;
    icon: React.ReactNode;
  }
> = {
  healthy: {
    badge: 'success',
    ring: 'border-emerald-200/70',
    panel: 'from-emerald-50 via-white to-cyan-50',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  },
  warning: {
    badge: 'warning',
    ring: 'border-amber-200/80',
    panel: 'from-amber-50 via-white to-orange-50',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  },
  neutral: {
    badge: 'secondary',
    ring: 'border-slate-200',
    panel: 'from-slate-50 via-white to-slate-100',
    icon: <Minus className="h-5 w-5 text-slate-500" />,
  },
};

export function HealthSummaryCard({
  title,
  status,
  score,
  summary,
  focusLabel,
  focusValue,
  metrics,
  tone = 'neutral',
  className,
}: HealthSummaryCardProps) {
  const palette = toneStyles[tone];

  return (
    <BaseCard
      className={cn(
        'overflow-hidden border-white/70 bg-white/90 backdrop-blur',
        palette.ring,
        className
      )}
    >
      <div
        className={cn(
          'rounded-[24px] border border-white/60 bg-gradient-to-br p-5 sm:p-6',
          palette.panel
        )}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                {palette.icon}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Estado general
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {title}
                </h2>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              {summary}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={palette.badge}>{status}</Badge>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700">
                <Activity className="h-4 w-4 text-slate-500" />
                {focusLabel}: <span className="text-slate-950">{focusValue}</span>
              </div>
            </div>
          </div>

          <div className="grid min-w-[220px] gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Salud operativa
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight text-slate-950">
                  {score}
                </span>
                <ArrowUpRight className="mb-1 h-4 w-4 text-emerald-600" />
              </div>
            </div>

            {metrics.map(metric => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/70 bg-white/80 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{metric.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
