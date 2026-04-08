'use client';

import type { ProcessItem, ProcessLevelColor, ProcessMetric } from '@/types/process-map';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CheckCircle,
  Compass,
  DollarSign,
  FileText,
  Layers,
  Package,
  Server,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CheckCircle,
  Compass,
  DollarSign,
  FileText,
  Layers,
  Package,
  Server,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Wrench,
  Zap,
};

const COLOR_CLASSES: Record<
  ProcessLevelColor,
  {
    shell: string;
    iconWrap: string;
    icon: string;
    badge: string;
    hover: string;
    accent: string;
  }
> = {
  emerald: {
    shell:
      'border-emerald-200/90 bg-white/90 dark:border-emerald-900/60 dark:bg-slate-900/80',
    iconWrap: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    hover:
      'hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_16px_40px_rgba(16,185,129,0.12)] dark:hover:border-emerald-700',
    accent: 'from-emerald-400/0 via-emerald-400/80 to-emerald-400/0',
  },
  blue: {
    shell:
      'border-blue-200/90 bg-white/90 dark:border-blue-900/60 dark:bg-slate-900/80',
    iconWrap: 'bg-blue-50 dark:bg-blue-950/40',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    hover:
      'hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_16px_40px_rgba(59,130,246,0.12)] dark:hover:border-blue-700',
    accent: 'from-blue-400/0 via-blue-400/80 to-blue-400/0',
  },
  violet: {
    shell:
      'border-violet-200/90 bg-white/90 dark:border-violet-900/60 dark:bg-slate-900/80',
    iconWrap: 'bg-violet-50 dark:bg-violet-950/40',
    icon: 'text-violet-600 dark:text-violet-400',
    badge:
      'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    hover:
      'hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_16px_40px_rgba(139,92,246,0.12)] dark:hover:border-violet-700',
    accent: 'from-violet-400/0 via-violet-400/80 to-violet-400/0',
  },
  amber: {
    shell:
      'border-amber-200/90 bg-white/90 dark:border-amber-900/60 dark:bg-slate-900/80',
    iconWrap: 'bg-amber-50 dark:bg-amber-950/40',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    hover:
      'hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_16px_40px_rgba(245,158,11,0.12)] dark:hover:border-amber-700',
    accent: 'from-amber-400/0 via-amber-400/80 to-amber-400/0',
  },
};

interface ProcessCardProps {
  item: ProcessItem;
  color: ProcessLevelColor;
  isActive?: boolean;
  metric?: ProcessMetric;
}

export function ProcessCard({
  item,
  color,
  isActive,
  metric,
}: ProcessCardProps) {
  const router = useRouter();
  const IconComponent = ICON_MAP[item.icon ?? ''] ?? Settings;
  const colors = COLOR_CLASSES[color];

  if (!item.visible) return null;

  const isClickable = item.applies && item.route;
  const cardClasses = [
    'group relative min-h-[108px] w-[172px] rounded-[20px] border p-3 text-left transition-all duration-200',
    item.applies
      ? `${colors.shell} ${
          isClickable
            ? `cursor-pointer ${colors.hover}`
            : 'shadow-[0_10px_30px_rgba(15,23,42,0.05)]'
        }`
      : 'cursor-default border-slate-200 bg-slate-100/85 opacity-70 dark:border-slate-800 dark:bg-slate-900/70',
    isActive
      ? 'ring-2 ring-slate-900/10 ring-offset-2 ring-offset-white dark:ring-white/10 dark:ring-offset-slate-950'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick() {
    if (isClickable) router.push(item.route!);
  }

  const hasPending = item.applies && (metric?.pending ?? 0) > 0;
  const hasWarning = item.applies && metric?.status && metric.status !== 'ok';

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      className={cardClasses}
      title={
        item.applies
          ? `Ir a ${item.label}`
          : `${item.label} - no aplica a esta organizacion`
      }
    >
      <div
        className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r ${colors.accent}`}
      />

      {hasWarning && (
        <div
          className={`absolute left-1.5 top-1.5 h-2 w-2 rounded-full ${
            metric?.status === 'critical' ? 'animate-pulse bg-red-500' : 'bg-amber-400'
          }`}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/5 ${
            item.applies
              ? colors.iconWrap
              : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
          }`}
        >
          <IconComponent className={`h-4 w-4 ${item.applies ? colors.icon : ''}`} />
        </div>
        {isClickable && (
          <ArrowUpRight
            className={`h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100 ${colors.icon}`}
          />
        )}
      </div>

      <div className="mt-3">
        <p
          className={`text-[13px] font-semibold leading-5 ${
            item.applies ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {item.label}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
          {item.applies ? 'Modulo operativo enlazado' : 'Visible solo como referencia'}
        </p>
      </div>

      <div className="mt-3 flex min-h-[20px] items-center gap-2">
        {hasPending && (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              metric?.status === 'critical'
                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            {metric!.pending} pendientes
          </span>
        )}
        {item.applies && !hasPending && (metric?.total ?? 0) > 0 && (
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${colors.badge}`}>
            {metric!.total} items
          </span>
        )}
        {!item.applies && (
          <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            No aplica
          </span>
        )}
      </div>
    </div>
  );
}
