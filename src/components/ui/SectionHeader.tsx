import { cn } from '@/lib/utils';
import { SectionIntro } from './SectionIntro';

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
  divider?: boolean;
  className?: string;
  introClassName?: string;
  actionsClassName?: string;
}

export function SectionHeader({
  title,
  eyebrow,
  description,
  action,
  actions,
  compact = false,
  divider = true,
  className,
  introClassName,
  actionsClassName,
}: SectionHeaderProps) {
  const resolvedActions = actions ?? action;

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        divider && 'border-b border-border/70',
        compact ? 'pb-2.5 mb-3' : 'pb-3 mb-4',
        resolvedActions && 'sm:flex-row sm:items-start sm:justify-between',
        compact && resolvedActions && 'sm:items-center',
        className
      )}
    >
      <SectionIntro
        title={title}
        eyebrow={eyebrow}
        description={description}
        compact={compact}
        className={cn('min-w-0 flex-1', introClassName)}
      />

      {resolvedActions && (
        <div
          className={cn(
            'flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end',
            actionsClassName
          )}
        >
          {resolvedActions}
        </div>
      )}
    </div>
  );
}
