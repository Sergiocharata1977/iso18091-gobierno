'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TerminalStatus } from '@/types/terminal';

const STATUS_CONFIG: Record<TerminalStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
  },
  active: {
    label: 'Activa',
    className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  offline: {
    label: 'Offline',
    className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  quarantined: {
    label: 'Cuarentenada',
    className: 'bg-red-900/10 text-red-800 border-red-900/20 hover:bg-red-900/10 dark:bg-red-900/40 dark:text-red-300',
  },
};

interface TerminalStatusBadgeProps {
  status: TerminalStatus;
  className?: string;
}

export function TerminalStatusBadge({ status, className }: TerminalStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
