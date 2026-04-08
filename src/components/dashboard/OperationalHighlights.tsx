'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

type HighlightTone = 'critical' | 'attention' | 'stable';

interface HighlightItem {
  title: string;
  description: string;
  owner: string;
  dueLabel: string;
  priority: string;
  href: string;
  ctaLabel: string;
  tone: HighlightTone;
}

interface OperationalHighlightsProps {
  items: HighlightItem[];
  className?: string;
}

const toneConfig: Record<
  HighlightTone,
  {
    badge: 'destructive' | 'warning' | 'success';
    icon: React.ReactNode;
    border: string;
    accent: string;
  }
> = {
  critical: {
    badge: 'destructive',
    icon: <ShieldAlert className="h-4 w-4 text-red-600" />,
    border: 'border-red-200/80',
    accent: 'bg-red-50 text-red-700',
  },
  attention: {
    badge: 'warning',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    border: 'border-amber-200/80',
    accent: 'bg-amber-50 text-amber-700',
  },
  stable: {
    badge: 'success',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    border: 'border-emerald-200/80',
    accent: 'bg-emerald-50 text-emerald-700',
  },
};

export function OperationalHighlights({
  items,
  className,
}: OperationalHighlightsProps) {
  return (
    <BaseCard className={cn('border-white/70 bg-white/90', className)}>
      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Alertas y prioridades
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Lo que requiere decision hoy
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Prioridades ordenadas para decidir y ejecutar.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {items.map(item => {
            const tone = toneConfig[item.tone];

            return (
              <article
                key={item.title}
                className={cn(
                  'flex h-full flex-col rounded-[24px] border bg-white p-5 shadow-sm',
                  tone.border
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-2xl',
                      tone.accent
                    )}
                  >
                    {tone.icon}
                  </div>
                  <Badge variant={tone.badge}>{item.priority}</Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <h3 className="text-base font-semibold text-slate-950">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Responsable</span>
                    <span className="font-medium text-slate-900">{item.owner}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      Compromiso
                    </span>
                    <span className="font-medium text-slate-900">{item.dueLabel}</span>
                  </div>
                </div>

                <Button asChild variant="outline" className="mt-5 w-full justify-between">
                  <Link href={item.href}>
                    {item.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </BaseCard>
  );
}
