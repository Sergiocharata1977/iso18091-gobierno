'use client';

import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import type { AgenticCenterTimelineItem } from '@/types/agentic-center';

interface ProcessLogTimelineProps {
  items: AgenticCenterTimelineItem[];
}

function statusStyles(status: AgenticCenterTimelineItem['estado']) {
  if (status === 'completado') {
    return {
      dot: 'bg-emerald-500',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Completado',
    };
  }
  if (status === 'activo') {
    return {
      dot: 'bg-sky-500',
      badge: 'border-sky-200 bg-sky-50 text-sky-700',
      label: 'En curso',
    };
  }
  return {
    dot: 'bg-slate-300',
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
    label: 'Pendiente',
  };
}

export default function ProcessLogTimeline({ items }: ProcessLogTimelineProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const styles = statusStyles(item.estado);
        return (
          <div key={`${item.paso}-${item.label}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', styles.dot)} />
              {index < items.length - 1 ? <span className="mt-2 h-full w-px bg-slate-200" /> : null}
            </div>
            <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <Badge variant="outline" className={styles.badge}>
                  {styles.label}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {item.timestamp_opcional
                  ? formatDate(item.timestamp_opcional, {
                      day: '2-digit',
                      month: '2-digit',
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
