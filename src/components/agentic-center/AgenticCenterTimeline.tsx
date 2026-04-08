'use client';

import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import type { AgenticCenterTimelineItem } from '@/types/agentic-center';

interface AgenticCenterTimelineProps {
  items: AgenticCenterTimelineItem[];
}

function getTone(estado: AgenticCenterTimelineItem['estado']) {
  if (estado === 'completado') {
    return {
      dot: 'bg-emerald-500 ring-emerald-100',
      line: 'bg-emerald-200',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }
  if (estado === 'activo') {
    return {
      dot: 'bg-sky-500 ring-sky-100',
      line: 'bg-slate-200',
      badge: 'border-sky-200 bg-sky-50 text-sky-700',
    };
  }
  return {
    dot: 'bg-slate-300 ring-slate-100',
    line: 'bg-slate-200',
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
  };
}

export default function AgenticCenterTimeline({
  items,
}: AgenticCenterTimelineProps) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const tone = getTone(item.estado);

        return (
          <div key={`${item.paso}-${item.label}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'relative z-10 h-3.5 w-3.5 rounded-full ring-4',
                  tone.dot
                )}
              />
              {index < items.length - 1 ? (
                <div className={cn('mt-2 h-full min-h-12 w-px', tone.line)} />
              ) : null}
            </div>
            <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                  Paso {item.paso}. {item.label}
                </p>
                <Badge className={tone.badge} variant="outline">
                  {item.estado}
                </Badge>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                {item.timestamp_opcional
                  ? formatDate(item.timestamp_opcional, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Pendiente de ejecucion'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
