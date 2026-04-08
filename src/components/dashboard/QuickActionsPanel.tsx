'use client';

import { BaseCard } from '@/components/design-system/primitives/BaseCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface QuickActionItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  meta: string;
  badge?: string;
}

interface QuickActionsPanelProps {
  title?: string;
  description?: string;
  actions: QuickActionItem[];
  className?: string;
}

export function QuickActionsPanel({
  title = 'Acciones rapidas',
  description = 'Entradas directas a los frentes donde una accion mueve el tablero.',
  actions,
  className,
}: QuickActionsPanelProps) {
  return (
    <BaseCard className={cn('border-white/70 bg-white/90', className)}>
      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Ejecucion
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-slate-500">{description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actions.map(action => (
            <article
              key={action.href}
              className="flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  {action.icon}
                </div>
                {action.badge ? <Badge variant="outline">{action.badge}</Badge> : null}
              </div>

              <div className="mt-4 flex-1 space-y-2">
                <h3 className="text-base font-semibold text-slate-950">
                  {action.title}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  {action.description}
                </p>
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {action.meta}
              </p>

              <Button asChild variant="outline" className="mt-5 w-full justify-between">
                <Link href={action.href}>
                  Abrir modulo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </BaseCard>
  );
}
